import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import BottomSheet from './BottomSheet';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import { formatDayMonth, formatWeekdayLong } from '../lib/planDays';
import type { Recipe } from '../screens/RecipeListScreen';
import type { WeeklyPlanEntry } from '../hooks/useWeeklyPlan';

type SearchRecipe = { id: number; name: string };

export default function FreeDaySheet({
  visible,
  onClose,
  days,
  householdId,
  noDayEntries,
  excludeRecipeIds,
  onAssignExisting,
  onAddNew,
}: {
  visible: boolean;
  onClose: () => void;
  days: string[];
  householdId: string;
  noDayEntries: WeeklyPlanEntry[];
  excludeRecipeIds: Set<number>;
  onAssignExisting: (entryId: string, day: string) => void;
  onAddNew: (recipe: Recipe, day: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRecipes, setAllRecipes] = useState<SearchRecipe[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDay(days[0]);
      setSearching(false);
      setSearchQuery('');
    }
  }, [visible, days]);

  async function openSearch() {
    setSearching(true);
    if (allRecipes === null) {
      setLoadingAll(true);
      const { data } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('household_id', householdId)
        .order('name', { ascending: true });
      setAllRecipes(data ?? []);
      setLoadingAll(false);
    }
  }

  const searchResults = (allRecipes ?? []).filter(
    (r) => !excludeRecipeIds.has(r.id) && r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Was gibt's am ${formatWeekdayLong(selectedDay)}?`}
    >
      {days.length > 1 && !searching && (
        <View style={styles.dayTilesRow}>
          {days.map((day) => {
            const selected = day === selectedDay;
            return (
              <Pressable
                key={day}
                style={[styles.dayTile, selected && styles.dayTileSelected]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayTileText, selected && styles.dayTileTextSelected]}>
                  {formatDayMonth(day)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!searching ? (
        <>
          {noDayEntries.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Aus „Noch ohne Tag"</Text>
              <View style={styles.list}>
                {noDayEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={styles.row}
                    onPress={() => {
                      onAssignExisting(entry.id, selectedDay);
                      onClose();
                    }}
                  >
                    <Text style={styles.rowText}>{entry.recipe.name}</Text>
                    <Feather name="plus" size={18} color={colors.quantity} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.hint}>Alle geplanten Gerichte haben schon einen Tag.</Text>
          )}

          <Pressable style={styles.searchButton} onPress={openSearch}>
            <Feather name="search" size={16} color={colors.primary} />
            <Text style={styles.searchButtonText}>Aus allen Rezepten wählen</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.searchInputRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rezept suchen"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          {loadingAll ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <View style={styles.list}>
              {searchResults.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  style={styles.row}
                  onPress={() => {
                    onAddNew({ ...recipe, image: null, time: null, portions: null, tags: null, ingredients: null, source: null }, selectedDay);
                    onClose();
                  }}
                >
                  <Text style={styles.rowText}>{recipe.name}</Text>
                  <Feather name="plus" size={18} color={colors.quantity} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  dayTilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  dayTile: {
    flex: 1,
    height: 56,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTileSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTileText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  dayTileTextSelected: {
    color: colors.onPrimary,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    maxHeight: 280,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
    flex: 1,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    marginTop: spacing.md,
    marginHorizontal: spacing.screenPadding,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.button,
  },
  searchButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  searchInputRow: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    height: 48,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  loading: {
    marginTop: spacing.lg,
  },
});
