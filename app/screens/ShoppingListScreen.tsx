import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FunctionsHttpError } from '@supabase/supabase-js';
import Feather from '@expo/vector-icons/build/Feather';
import { supabase } from '../lib/supabase';
import { confirm, notify } from '../lib/alert';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { colors, fonts, fontSizes, spacing } from '../lib/theme';
import { isBaseIngredient } from '../lib/baseIngredients';
import { useShoppingListChecked } from '../hooks/useShoppingListChecked';
import type { WeeklyPlanEntry } from '../hooks/useWeeklyPlan';

type ShoppingItem = {
  key: string;
  quantity: string;
  name: string;
  recipeNames: string[];
};

function buildItemsFallback(
  entries: WeeklyPlanEntry[],
  baseIngredientKeywords: string[]
): { main: ShoppingItem[]; base: ShoppingItem[] } {
  const mainMap = new Map<string, { text: string; count: number; recipeNames: string[] }>();
  const baseMap = new Map<string, { text: string; count: number; recipeNames: string[] }>();

  for (const entry of entries) {
    for (const ingredient of entry.recipe.ingredients ?? []) {
      const trimmed = ingredient.trim();
      if (!trimmed) continue;

      const key = trimmed.toLowerCase();
      const map = isBaseIngredient(trimmed, baseIngredientKeywords) ? baseMap : mainMap;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.recipeNames.includes(entry.recipe.name)) {
          existing.recipeNames.push(entry.recipe.name);
        }
      } else {
        map.set(key, { text: trimmed, count: 1, recipeNames: [entry.recipe.name] });
      }
    }
  }

  // Freitext lässt sich ohne NLP nicht zuverlässig in Menge/Name trennen -
  // im Fallback bleibt die Menge-Spalte leer, der komplette Text steht im
  // Namen (die Claude-Aggregation unten liefert Menge/Name normalerweise
  // bereits getrennt).
  const toItems = (map: Map<string, { text: string; count: number; recipeNames: string[] }>) =>
    Array.from(map.entries()).map(([key, v]) => ({
      key,
      quantity: '',
      name: v.count > 1 ? `${v.text} (${v.count}x)` : v.text,
      recipeNames: v.recipeNames,
    }));

  return { main: toItems(mainMap), base: toItems(baseMap) };
}

type AggregatedItem = {
  name: string;
  menge: number | null;
  einheit: string | null;
  source_recipes: string[];
};

function mapAggregatedItems(items: AggregatedItem[]): ShoppingItem[] {
  return items.map((item) => ({
    key: item.name.toLowerCase(),
    quantity: [item.menge, item.einheit].filter(Boolean).join(' '),
    name: item.name,
    recipeNames: item.source_recipes,
  }));
}

export type ShoppingListHandle = {
  confirmPrimaryAction: () => void;
};

type Props = {
  householdId: string;
  entries: WeeklyPlanEntry[];
  baseIngredients: string[];
  todoistConnected: boolean;
  todoistProjectId: string | null;
  onSent: (entryIds: string[]) => Promise<void>;
  onSendingChange?: (sending: boolean) => void;
};

const ShoppingListScreen = forwardRef<ShoppingListHandle, Props>(function ShoppingListScreen(
  { householdId, entries, baseIngredients, todoistConnected, todoistProjectId, onSent, onSendingChange },
  ref
) {
  const { checkedKeys, toggle: toggleChecked, clearAll: clearChecked, reload: reloadChecked } =
    useShoppingListChecked(householdId);
  const [movedToMain, setMovedToMain] = useState<Set<string>>(new Set());
  const [loadingAggregation, setLoadingAggregation] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [main, setMain] = useState<ShoppingItem[]>([]);
  const [base, setBase] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    loadAggregation();
  }, [entries]);

  async function loadAggregation() {
    setLoadingAggregation(true);
    setMovedToMain(new Set());

    if (entries.length === 0) {
      setMain([]);
      setBase([]);
      setLoadingAggregation(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke('aggregate-shopping-list', {
      body: { recipeIds: entries.map((e) => e.recipe.id) },
    });

    if (error || !data) {
      console.error('aggregate-shopping-list fehlgeschlagen, nutze Fallback:', error);
      const fallback = buildItemsFallback(entries, baseIngredients);
      setMain(fallback.main);
      setBase(fallback.base);
      setUsedFallback(true);
    } else {
      setMain(mapAggregatedItems(data.mainItems));
      setBase(mapAggregatedItems(data.baseItems));
      setUsedFallback(false);
    }
    setLoadingAggregation(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadAggregation(), reloadChecked()]);
    setRefreshing(false);
  }

  const allMainItems = [...main, ...base.filter((b) => movedToMain.has(b.key))];
  // Abgehakte Zutaten rutschen ans Ende, Reihenfolge innerhalb der beiden
  // Gruppen bleibt stabil.
  const mainItems = [
    ...allMainItems.filter((item) => !checkedKeys.has(item.key)),
    ...allMainItems.filter((item) => checkedKeys.has(item.key)),
  ];
  const baseRemaining = base.filter((b) => !movedToMain.has(b.key));

  function moveToMain(key: string) {
    setMovedToMain((prev) => new Set(prev).add(key));
  }

  async function confirmPrimaryAction() {
    if (!todoistConnected) {
      const confirmed = await confirm(
        'Einkauf abschließen?',
        'Die Liste wird geleert und alle Häkchen zurückgesetzt.',
        'Abschließen'
      );
      if (confirmed) completeWithoutTodoist();
      return;
    }

    if (!todoistProjectId) {
      notify('Kein Todoist-Projekt gewählt', 'Bitte zuerst ein Todoist-Projekt in den Einstellungen wählen.');
      return;
    }
    const confirmed = await confirm(
      'An Todoist senden?',
      'Liste wird an Todoist gesendet und hier geleert.',
      'Senden'
    );
    if (confirmed) handleSend();
  }

  useImperativeHandle(ref, () => ({ confirmPrimaryAction }));

  async function completeWithoutTodoist() {
    onSendingChange?.(true);
    await onSent(entries.map((e) => e.id));
    await clearChecked();
    setMovedToMain(new Set());
    onSendingChange?.(false);
  }

  async function handleSend() {
    onSendingChange?.(true);
    const { error } = await supabase.functions.invoke('send-to-todoist', {
      body: { items: mainItems.map((item) => [item.quantity, item.name].filter(Boolean).join(' ')) },
    });
    if (error) {
      onSendingChange?.(false);
      let message = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          message = body.error ?? message;
          if (body.details) {
            console.error('send-to-todoist details:', JSON.stringify(body.details));
          }
        } catch {
          // Antwort war kein JSON - Fallback auf die generische Meldung.
        }
      }
      notify('Fehler beim Senden', message);
      return;
    }

    await onSent(entries.map((e) => e.id));
    await clearChecked();
    onSendingChange?.(false);
    setMovedToMain(new Set());
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Einkaufsliste ist leer</Text>
        <Text style={styles.emptyBody}>
          Alle Rezepte im Plan wurden bereits in einer Einkaufsliste abgeschlossen, oder der Plan
          ist leer.
        </Text>
      </View>
    );
  }

  if (loadingAggregation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Einkaufsliste</Text>
          <Text style={styles.subtitle}>
            Entwurf · {mainItems.length} Zutat{mainItems.length !== 1 ? 'en' : ''}
          </Text>
        </View>
        <Pressable onPress={loadAggregation}>
          <Text style={styles.refreshText}>Neu berechnen</Text>
        </Pressable>
        {usedFallback && (
          <Text style={styles.fallbackNotice}>
            Intelligente Aggregation nicht verfügbar, einfache Gruppierung verwendet.
          </Text>
        )}

        <Card style={styles.listCard}>
          {mainItems.map((item, index) => {
            const isChecked = checkedKeys.has(item.key);
            return (
              <Pressable
                key={item.key}
                style={[styles.row, index > 0 && styles.rowDivider]}
                onPress={() => toggleChecked(item.key)}
              >
                <View style={[styles.checkCircle, isChecked && styles.checkCircleChecked]}>
                  {isChecked && <Feather name="check" size={14} color={colors.onPrimary} />}
                </View>
                <Text style={[styles.quantity, isChecked && styles.textChecked]}>
                  {item.quantity}
                </Text>
                <View style={styles.rowBody}>
                  <Text style={[styles.name, isChecked && styles.textChecked]}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.recipeNames.join(', ')}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>

        {baseRemaining.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Diese Grundzutaten brauchst du</Text>
            <View style={styles.chipsRow}>
              {baseRemaining.map((item) => (
                <Chip
                  key={item.key}
                  label={item.name}
                  variant="dashed"
                  onPress={() => moveToMain(item.key)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
});

export default ShoppingListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: fontSizes.screenTitle,
    color: colors.primary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
  },
  refreshText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.meta,
    color: colors.quantity,
    marginBottom: spacing.md,
  },
  fallbackNotice: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  listCard: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quantity: {
    width: 70,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.quantity,
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
  },
  textChecked: {
    textDecorationLine: 'line-through',
    color: colors.textSubtle,
  },
  itemMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
