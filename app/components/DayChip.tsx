import { Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import { colors, fonts, fontSizes, spacing } from '../lib/theme';
import { formatShortDate, isMissed, isToday } from '../lib/planDays';

export default function DayChip({
  plannedFor,
  cookedAt,
  onPress,
}: {
  plannedFor: string | null;
  cookedAt: string | null;
  onPress: () => void;
}) {
  const missed = isMissed(plannedFor, cookedAt);
  const noDay = !plannedFor || missed;
  const today = plannedFor ? isToday(plannedFor) : false;

  const label = noDay ? 'Tag wählen' : today ? 'Heute' : formatShortDate(plannedFor as string);

  return (
    <Pressable
      style={[
        styles.chip,
        noDay ? styles.chipDashed : today ? styles.chipToday : styles.chipLater,
      ]}
      onPress={onPress}
    >
      <Feather name="calendar" size={13} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  chipToday: {
    backgroundColor: colors.accent,
  },
  chipLater: {
    backgroundColor: colors.dayChip,
  },
  chipDashed: {
    borderWidth: 1.5,
    borderColor: colors.dashed,
    borderStyle: 'dashed',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
});
