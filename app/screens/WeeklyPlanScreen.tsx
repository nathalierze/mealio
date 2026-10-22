import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import PlanRecipeCard from '../components/PlanRecipeCard';
import Card from '../components/Card';
import DayPickerSheet from '../components/DayPickerSheet';
import WeekView from '../components/WeekView';
import FreeDaySheet from '../components/FreeDaySheet';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import { isMissed } from '../lib/planDays';
import { getWeeklyPlanViewMode, setWeeklyPlanViewMode, type WeeklyPlanViewMode } from '../lib/deviceSettings';
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
  householdId,
  entries,
  pendingShoppingCount,
  loading,
  onSelectRecipe,
  onCooked,
  onViewShoppingList,
  onSetPlannedFor,
  onRemoveFromPlan,
  onAddRecipeWithDay,
}: {
  householdId: string;
  entries: WeeklyPlanEntry[];
  pendingShoppingCount: number;
  loading: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onCooked: (entryId: string) => void;
  onViewShoppingList: () => void;
  onSetPlannedFor: (entryId: string, plannedFor: string | null) => void;
  onRemoveFromPlan: (entryId: string) => void;
  onAddRecipeWithDay: (recipe: Recipe, day: string) => void;
}) {
  const [viewMode, setViewMode] = useState<WeeklyPlanViewMode>('list');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [freeDayGroup, setFreeDayGroup] = useState<string[] | null>(null);
  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const editingEntry = entries.find((e) => e.id === editingEntryId) ?? null;

  useEffect(() => {
    getWeeklyPlanViewMode().then(setViewMode);
  }, []);

  function changeViewMode(mode: WeeklyPlanViewMode) {
    setViewMode(mode);
    setWeeklyPlanViewMode(mode);
  }

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.id === editingEntryId) continue;
      if (!entry.plannedFor) continue;
      counts[entry.plannedFor] = (counts[entry.plannedFor] ?? 0) + 1;
    }
    return counts;
  }, [entries, editingEntryId]);

  const noDayEntries = useMemo(
    () => entries.filter((e) => !e.plannedFor || isMissed(e.plannedFor, e.cookedAt)),
    [entries]
  );
  const noDayCount = noDayEntries.length;
  const activeRecipeIds = useMemo(() => new Set(entries.map((e) => e.recipe.id)), [entries]);

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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{viewMode === 'list' ? 'Diese Woche' : 'Nächste 7 Tage'}</Text>
          <Text style={styles.subtitle}>
            {viewMode === 'list'
              ? `${entries.length} Gericht${entries.length !== 1 ? 'e' : ''} geplant`
              : `${entries.length} Gericht${entries.length !== 1 ? 'e' : ''} · ${noDayCount} noch ohne Tag`}
          </Text>
        </View>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => changeViewMode('list')}
            accessibilityLabel="Als Liste anzeigen"
          >
            <Feather name="list" size={18} color={viewMode === 'list' ? colors.onPrimary : colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => changeViewMode('week')}
            accessibilityLabel="Nach Tagen anzeigen"
          >
            <Feather
              name="calendar"
              size={18}
              color={viewMode === 'week' ? colors.onPrimary : colors.primary}
            />
          </Pressable>
        </View>
      </View>

      {viewMode === 'list' ? (
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
                    {pendingShoppingCount} Rezept{pendingShoppingCount !== 1 ? 'e' : ''} bereit
                    für die Einkaufsliste
                  </Text>
                </View>
                <Pressable style={styles.hintButton} onPress={onViewShoppingList}>
                  <Text style={styles.hintButtonText}>Ansehen</Text>
                </Pressable>
              </Card>
            ) : null
          }
        />
      ) : (
        <WeekView
          entries={entries}
          pendingShoppingCount={pendingShoppingCount}
          onSelectRecipe={onSelectRecipe}
          onCooked={onCooked}
          onViewShoppingList={onViewShoppingList}
          onPressDay={setEditingEntryId}
          onOpenFreeDaySheet={setFreeDayGroup}
        />
      )}

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

      {freeDayGroup && (
        <FreeDaySheet
          visible
          onClose={() => setFreeDayGroup(null)}
          days={freeDayGroup}
          householdId={householdId}
          noDayEntries={noDayEntries}
          excludeRecipeIds={activeRecipeIds}
          onAssignExisting={onSetPlannedFor}
          onAddNew={onAddRecipeWithDay}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
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
    marginTop: spacing.xs,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.segmentedOuter,
    padding: 4,
    gap: 2,
  },
  toggleButton: {
    width: 44,
    height: 38,
    borderRadius: radii.segmentedInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
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
