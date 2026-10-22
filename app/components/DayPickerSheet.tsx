import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from './BottomSheet';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import { formatDayMonth, formatShortDate, getRollingDateKeys, isToday, isTomorrow } from '../lib/planDays';

type Tile = {
  key: string | null; // null = "Ohne Tag"
  topLabel: string;
  bottomLabel: string;
};

function buildTiles(): Tile[] {
  const days = getRollingDateKeys(7);
  const dayTiles: Tile[] = days.map((key, index) => {
    if (index === 0) return { key, topLabel: 'Heute', bottomLabel: formatShortDate(key) };
    if (index === 1) return { key, topLabel: 'Morgen', bottomLabel: formatShortDate(key) };
    const [weekday] = formatShortDate(key).split(' ');
    return { key, topLabel: weekday, bottomLabel: formatDayMonth(key) };
  });
  return [...dayTiles, { key: null, topLabel: 'Ohne Tag', bottomLabel: 'irgendwann' }];
}

export default function DayPickerSheet({
  visible,
  onClose,
  recipeName,
  selectedDay,
  isInPlan,
  dayCounts,
  onSelectDay,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  recipeName: string;
  selectedDay: string | null;
  isInPlan: boolean;
  dayCounts: Record<string, number>;
  onSelectDay: (day: string | null) => void;
  onRemove: () => void;
}) {
  const tiles = buildTiles();
  const hasDots = tiles.some((t) => t.key && (dayCounts[t.key] ?? 0) > 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Wann gibt's das?">
      <Text style={styles.recipeName}>{recipeName}</Text>

      <View style={styles.grid}>
        {tiles.map((tile) => {
          const selected = tile.key === selectedDay;
          const count = tile.key ? dayCounts[tile.key] ?? 0 : 0;
          return (
            <Pressable
              key={tile.key ?? 'none'}
              style={[styles.tile, selected && styles.tileSelected]}
              onPress={() => onSelectDay(tile.key)}
            >
              <Text style={[styles.tileTop, selected && styles.tileTextSelected]}>
                {tile.topLabel}
              </Text>
              <Text style={[styles.tileBottom, selected && styles.tileTextSelected]}>
                {tile.bottomLabel}
              </Text>
              {count > 0 && (
                <View style={styles.dots}>
                  {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {hasDots && <Text style={styles.legend}>Punkte = weitere Gerichte an diesem Tag</Text>}

      {isInPlan && (
        <Pressable style={styles.removeRow} onPress={onRemove}>
          <Text style={styles.removeText}>Aus dem Wochenplan entfernen</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  recipeName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
  },
  tile: {
    width: '23%',
    height: 78,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tileSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tileTop: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  tileBottom: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
  },
  tileTextSelected: {
    color: colors.onPrimary,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  legend: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
  },
  removeRow: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
    minHeight: 44,
    justifyContent: 'center',
  },
  removeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.danger,
  },
});
