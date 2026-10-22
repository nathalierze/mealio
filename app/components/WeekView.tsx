import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import CompactPlanCard from './CompactPlanCard';
import EmptyDayRow from './EmptyDayRow';
import Card from './Card';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import {
  formatDayMonth,
  formatShortDate,
  formatWeekdayLong,
  getRollingDateKeys,
  isMissed,
  isToday,
} from '../lib/planDays';
import type { Recipe } from '../screens/RecipeListScreen';
import type { WeeklyPlanEntry } from '../hooks/useWeeklyPlan';

type Section =
  | { type: 'day'; day: string; entries: WeeklyPlanEntry[] }
  | { type: 'empty'; days: string[] };

function buildSections(entries: WeeklyPlanEntry[]): { sections: Section[]; noDayEntries: WeeklyPlanEntry[] } {
  const rollingDays = getRollingDateKeys(7);
  const byDay: Record<string, WeeklyPlanEntry[]> = {};
  for (const day of rollingDays) byDay[day] = [];
  const noDayEntries: WeeklyPlanEntry[] = [];

  for (const entry of entries) {
    if (entry.plannedFor && !isMissed(entry.plannedFor, entry.cookedAt) && byDay[entry.plannedFor]) {
      byDay[entry.plannedFor].push(entry);
    } else {
      noDayEntries.push(entry);
    }
  }

  const sections: Section[] = [];
  let emptyRun: string[] = [];
  for (const day of rollingDays) {
    if (byDay[day].length > 0) {
      if (emptyRun.length > 0) {
        sections.push({ type: 'empty', days: emptyRun });
        emptyRun = [];
      }
      sections.push({ type: 'day', day, entries: byDay[day] });
    } else {
      emptyRun.push(day);
    }
  }
  if (emptyRun.length > 0) sections.push({ type: 'empty', days: emptyRun });

  return { sections, noDayEntries };
}

export default function WeekView({
  entries,
  pendingShoppingCount,
  onSelectRecipe,
  onCooked,
  onViewShoppingList,
  onPressDay,
  onOpenFreeDaySheet,
}: {
  entries: WeeklyPlanEntry[];
  pendingShoppingCount: number;
  onSelectRecipe: (recipe: Recipe) => void;
  onCooked: (entryId: string) => void;
  onViewShoppingList: () => void;
  onPressDay: (entryId: string) => void;
  onOpenFreeDaySheet: (days: string[]) => void;
}) {
  const { sections, noDayEntries } = buildSections(entries);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {noDayEntries.length > 0 && (
        <View style={styles.noDayBlock}>
          <Text style={styles.noDayTitle}>Noch ohne Tag · {noDayEntries.length}</Text>
          {noDayEntries.map((entry) => (
            <CompactPlanCard
              key={entry.id}
              recipe={entry.recipe}
              plannedFor={entry.plannedFor}
              missed={isMissed(entry.plannedFor, entry.cookedAt)}
              rightAction="pick"
              onPress={() => onSelectRecipe(entry.recipe)}
              onCooked={() => onCooked(entry.id)}
              onPressDay={() => onPressDay(entry.id)}
            />
          ))}
        </View>
      )}

      {sections.map((section, index) =>
        section.type === 'day' ? (
          <View key={section.day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderWeekday}>{formatWeekdayLong(section.day)}</Text>
              <Text style={styles.dayHeaderDate}>{formatDayMonth(section.day)}</Text>
              {isToday(section.day) && (
                <View style={styles.todayPill}>
                  <Text style={styles.todayPillText}>Heute</Text>
                </View>
              )}
            </View>
            {section.entries.map((entry) => (
              <CompactPlanCard
                key={entry.id}
                recipe={entry.recipe}
                plannedFor={entry.plannedFor}
                missed={false}
                rightAction="change"
                onPress={() => onSelectRecipe(entry.recipe)}
                onCooked={() => onCooked(entry.id)}
                onPressDay={() => onPressDay(entry.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyDayRow
            key={`empty-${index}`}
            label={
              section.days.length === 1
                ? formatShortDate(section.days[0])
                : `${formatShortDate(section.days[0])} – ${formatShortDate(section.days[section.days.length - 1])}`
            }
            onPress={() => onOpenFreeDaySheet(section.days)}
          />
        )
      )}

      {pendingShoppingCount > 0 && (
        <Card style={styles.hintCard}>
          <View style={styles.hintText}>
            <Text style={styles.hintTitle}>Einkaufsliste ist bereit</Text>
            <Text style={styles.hintBody}>
              {pendingShoppingCount} Rezept{pendingShoppingCount !== 1 ? 'e' : ''} bereit für die
              Einkaufsliste
            </Text>
          </View>
          <Pressable style={styles.hintButton} onPress={onViewShoppingList}>
            <Text style={styles.hintButtonText}>Ansehen</Text>
          </Pressable>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
  },
  noDayBlock: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  noDayTitle: {
    fontFamily: fonts.heading,
    fontSize: 19,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  daySection: {
    marginBottom: spacing.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayHeaderWeekday: {
    fontFamily: fonts.heading,
    fontSize: 19,
    color: colors.primary,
  },
  dayHeaderDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textSubtle,
  },
  todayPill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
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
});
