import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import PlanRecipeCard from '../components/PlanRecipeCard';
import Card from '../components/Card';
import DayPickerSheet from '../components/DayPickerSheet';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import { isMissed } from '../lib/planDays';
import type { Recipe } from './RecipeListScreen';
import type { WeeklyPlanEntry } from '../hooks/useWeeklyPlan';

function sortEntries(entries: WeeklyPlanEntry[]): WeeklyPlanEntry[] {
  // Nach Datum, Einträge ohne Tag (inkl. verpasst, zählt als "ohne Tag") am
  // Ende; innerhalb beider Gruppen stabile Sortierung (bisherige Reihenfolge).
  const withDay: WeeklyPlanEntry[] = [];
  const withoutDay: WeeklyPlanEntry[] = [];
  for (const entry of entries) {
    if (entry.plannedFor && !isMissed(entry.plannedFor, entry.cookedAt)) {
      withDay.push(entry);
    } else {
      withoutDay.push(entry);
    }
  }
  withDay.sort((a, b) => (a.plannedFor as string).localeCompare(b.plannedFor as string));
  return [...withDay, ...withoutDay];
}

export default function WeeklyPlanScreen({
  entries,
  pendingShoppingCount,
  loading,
  onSelectRecipe,
  onCooked,
  onViewShoppingList,
  onSetPlannedFor,
  onRemoveFromPlan,
}: {
  entries: WeeklyPlanEntry[];
  pendingShoppingCount: number;
  loading: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onCooked: (entryId: string) => void;
  onViewShoppingList: () => void;
  onSetPlannedFor: (entryId: string, plannedFor: string | null) => void;
  onRemoveFromPlan: (entryId: string) => void;
}) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const editingEntry = entries.find((e) => e.id === editingEntryId) ?? null;

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.id === editingEntryId) continue;
      if (!entry.plannedFor) continue;
      counts[entry.plannedFor] = (counts[entry.plannedFor] ?? 0) + 1;
    }
    return counts;
  }, [entries, editingEntryId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>Alles gekocht – oder Plan ist leer</Text>
        <Text style={styles.emptyBody}>
          Tippe in der Rezeptliste auf das „+", um Rezepte zum Wochenplan hinzuzufügen.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diese Woche</Text>
      <Text style={styles.subtitle}>
        {entries.length} Gericht{entries.length !== 1 ? 'e' : ''} geplant
      </Text>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PlanRecipeCard
            recipe={item.recipe}
            plannedFor={item.plannedFor}
            cookedAt={item.cookedAt}
            onPress={() => onSelectRecipe(item.recipe)}
            onCooked={() => onCooked(item.id)}
            onPressDay={() => setEditingEntryId(item.id)}
          />
        )}
        ListFooterComponent={
          pendingShoppingCount > 0 ? (
            <Card style={styles.hintCard}>
              <View style={styles.hintText}>
                <Text style={styles.hintTitle}>Einkaufsliste ist bereit</Text>
                <Text style={styles.hintBody}>
                  {pendingShoppingCount} Rezept{pendingShoppingCount !== 1 ? 'e' : ''} bereit für
                  die Einkaufsliste
                </Text>
              </View>
              <Pressable style={styles.hintButton} onPress={onViewShoppingList}>
                <Text style={styles.hintButtonText}>Ansehen</Text>
              </Pressable>
            </Card>
          ) : null
        }
      />

      <DayPickerSheet
        visible={editingEntry !== null}
        onClose={() => setEditingEntryId(null)}
        recipeName={editingEntry?.recipe.name ?? ''}
        selectedDay={editingEntry?.plannedFor ?? null}
        isInPlan
        dayCounts={dayCounts}
        onSelectDay={(day) => {
          if (editingEntryId) onSetPlannedFor(editingEntryId, day);
          setEditingEntryId(null);
        }}
        onRemove={() => {
          if (editingEntryId) onRemoveFromPlan(editingEntryId);
          setEditingEntryId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: fontSizes.screenTitle,
    color: colors.primary,
    paddingHorizontal: spacing.screenPadding,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
  },
  hintCard: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  hintText: {
    flex: 1,
    gap: spacing.xs,
  },
  hintTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  hintBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  hintButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.buttonSmall,
    color: colors.onPrimary,
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
