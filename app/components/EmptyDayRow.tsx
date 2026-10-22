import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

export default function EmptyDayRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>Nichts geplant</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>+ Rezept</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.dashed,
    borderStyle: 'dashed',
    borderRadius: radii.card,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
  },
  pill: {
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.dayChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
});
