import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentWeekIdentifier } from '../lib/week';
import type { Recipe } from '../screens/RecipeListScreen';

export type WeeklyPlanEntry = {
  id: string;
  recipe: Recipe;
  cookedAt: string | null;
  shoppingListSentAt: string | null;
  plannedFor: string | null;
};

type RecipeRow = {
  id: number;
  name: string;
  image: string | null;
  time: number | null;
  portions: number | null;
  ingredients: string[] | null;
  source: string | null;
  recipe_tags: { tags: { name: string } | null }[] | null;
};

type WeeklyPlanRow = {
  id: string;
  recipe_id: number;
  cooked_at: string | null;
  shopping_list_sent_at: string | null;
  planned_for: string | null;
  recipes: RecipeRow | null;
};

function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    time: row.time,
    portions: row.portions,
    ingredients: row.ingredients,
    source: row.source,
    tags: (row.recipe_tags ?? [])
      .map((rt) => rt.tags?.name)
      .filter((n): n is string => Boolean(n)),
  };
}

export function useWeeklyPlan(householdId: string) {
  const [entries, setEntries] = useState<WeeklyPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const weekId = getCurrentWeekIdentifier();

  const load = useCallback(async () => {
    setLoading(true);
    // Nicht nach week_identifier gefiltert (rollierendes Fenster statt
    // Kalenderwoche, verpasste Tage bleiben stehen, bis jemand sie neu
    // zuordnet - siehe CLAUDE.md), sondern nach cooked_at: ein gekochtes
    // Rezept ist abgeschlossen und darf nie wieder in die Einkaufslisten-
    // Aggregation einfließen, unabhängig vom Sent-Status (Bugfix: vorher
    // blieben gekocht-aber-nie-gesendete Einträge dauerhaft in
    // pendingShoppingEntries stehen, da week_identifier das früher implizit
    // begrenzt hatte).
    const { data, error } = await supabase
      .from('weekly_plan')
      .select(
        'id, recipe_id, cooked_at, shopping_list_sent_at, planned_for, recipes(id, name, image, time, portions, ingredients, source, recipe_tags(tags(name)))'
      )
      .eq('household_id', householdId)
      .is('cooked_at', null);

    if (!error && data) {
      const rows = data as unknown as WeeklyPlanRow[];
      const mapped = rows
        .filter((row) => row.recipes !== null)
        .map((row) => ({
          id: row.id,
          recipe: mapRecipeRow(row.recipes as RecipeRow),
          cookedAt: row.cooked_at,
          shoppingListSentAt: row.shopping_list_sent_at,
          plannedFor: row.planned_for,
        }));
      setEntries(mapped);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeEntries = useMemo(() => entries.filter((e) => !e.cookedAt), [entries]);
  const pendingShoppingEntries = useMemo(
    () => entries.filter((e) => !e.shoppingListSentAt),
    [entries]
  );
  // Badge in der Rezeptliste meint "aktiv im Plan" (nicht gekocht) - eine
  // bereits gekochte Zeile zählt nicht mehr als "im Plan" markiert.
  const planRecipeIds = useMemo(() => new Set(activeEntries.map((e) => e.recipe.id)), [
    activeEntries,
  ]);

  // plannedFor: nur für den Fall relevant, dass das Rezept neu in den Plan
  // kommt (Insert oder Reaktivierung) - der einfache Plus-Button auf der
  // Rezeptkachel lässt das weg (= "ohne Tag", wie bisher), die Detailseite
  // kann einen bereits im Tag-wählen-Sheet ausgewählten Tag mitgeben.
  async function togglePlan(recipe: Recipe, plannedFor: string | null = null) {
    const activeEntry = activeEntries.find((e) => e.recipe.id === recipe.id);
    const existingEntry = entries.find((e) => e.recipe.id === recipe.id);

    if (activeEntry) {
      // Aktiv im Plan -> komplett entfernen.
      await supabase.from('weekly_plan').delete().eq('id', activeEntry.id);
    } else if (existingEntry) {
      // Zeile existiert (abgeschlossen) -> zurück in den aktiven Plan holen,
      // statt einen zweiten Eintrag anzulegen. Zählt als neue Planung: auch
      // den Einkaufslisten-"gesendet"-Status zurücksetzen, sonst tauchen die
      // Zutaten nicht in der nächsten Liste auf.
      await supabase
        .from('weekly_plan')
        .update({ cooked_at: null, shopping_list_sent_at: null, planned_for: plannedFor })
        .eq('id', existingEntry.id);
    } else {
      await supabase.from('weekly_plan').insert({
        household_id: householdId,
        recipe_id: recipe.id,
        week_identifier: weekId,
        planned_for: plannedFor,
      });
    }

    await load();
  }

  // Für das "Tag wählen"-Sheet: Tag eines bereits aktiven Eintrags ändern
  // oder entfernen (null = "ohne Tag").
  async function setPlannedFor(entryId: string, plannedFor: string | null) {
    await supabase.from('weekly_plan').update({ planned_for: plannedFor }).eq('id', entryId);
    await load();
  }

  // Für den "Aus dem Wochenplan entfernen"-Button im Tag-wählen-Sheet.
  async function removeFromPlan(entryId: string) {
    await supabase.from('weekly_plan').delete().eq('id', entryId);
    await load();
  }

  async function markCooked(entryId: string) {
    await supabase.from('weekly_plan').update({ cooked_at: new Date().toISOString() }).eq(
      'id',
      entryId
    );
    await load();
  }

  async function markShoppingSent(entryIds: string[]) {
    if (entryIds.length === 0) return;
    await supabase
      .from('weekly_plan')
      .update({ shopping_list_sent_at: new Date().toISOString() })
      .in('id', entryIds);
    await load();
  }

  return {
    entries,
    planRecipeIds,
    activeEntries,
    pendingShoppingEntries,
    loading,
    togglePlan,
    setPlannedFor,
    removeFromPlan,
    markCooked,
    markShoppingSent,
  };
}
