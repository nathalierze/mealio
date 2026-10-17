import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentWeekIdentifier } from '../lib/week';
import type { Recipe } from '../screens/RecipeListScreen';

export type WeeklyPlanEntry = {
  id: string;
  recipe: Recipe;
  cookedAt: string | null;
  shoppingListSentAt: string | null;
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
    const { data, error } = await supabase
      .from('weekly_plan')
      .select(
        'id, recipe_id, cooked_at, shopping_list_sent_at, recipes(id, name, image, time, portions, ingredients, source, recipe_tags(tags(name)))'
      )
      .eq('household_id', householdId)
      .eq('week_identifier', weekId);

    if (!error && data) {
      const rows = data as unknown as WeeklyPlanRow[];
      const mapped = rows
        .filter((row) => row.recipes !== null)
        .map((row) => ({
          id: row.id,
          recipe: mapRecipeRow(row.recipes as RecipeRow),
          cookedAt: row.cooked_at,
          shoppingListSentAt: row.shopping_list_sent_at,
        }));
      setEntries(mapped);
    }
    setLoading(false);
  }, [householdId, weekId]);

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

  async function togglePlan(recipe: Recipe) {
    const activeEntry = activeEntries.find((e) => e.recipe.id === recipe.id);
    const existingEntry = entries.find((e) => e.recipe.id === recipe.id);

    if (activeEntry) {
      // Aktiv im Plan -> komplett entfernen.
      await supabase.from('weekly_plan').delete().eq('id', activeEntry.id);
    } else if (existingEntry) {
      // Zeile existiert, ist aber als "gekocht" markiert -> zurück in den
      // aktiven Plan holen, statt einen doppelten Eintrag anzulegen (unique
      // constraint household_id/recipe_id/week_identifier). Zählt als neue
      // Planung: auch den Einkaufslisten-"gesendet"-Status zurücksetzen,
      // sonst tauchen die Zutaten nicht in der nächsten Liste auf.
      await supabase
        .from('weekly_plan')
        .update({ cooked_at: null, shopping_list_sent_at: null })
        .eq('id', existingEntry.id);
    } else {
      await supabase
        .from('weekly_plan')
        .insert({ household_id: householdId, recipe_id: recipe.id, week_identifier: weekId });
    }

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
    markCooked,
    markShoppingSent,
  };
}
