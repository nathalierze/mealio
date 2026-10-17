import { Pressable, StyleSheet, Text, View } from 'react-native';
// Deep-Import statt Paket-Barrel (@expo/vector-icons) – der Barrel lädt
// beim Import alle ~20 Icon-Font-Familien (mehrere MB), siehe Theme für das
// gleiche Problem bei Fonts.
import Feather from '@expo/vector-icons/build/Feather';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

type ChipVariant = 'filter' | 'removable' | 'dashed' | 'select';

export default function Chip({
  label,
  variant = 'filter',
  active = false,
  onPress,
}: {
  label: string;
  variant?: ChipVariant;
  /** Für variant="filter"/"select": ob dieser Chip aktuell ausgewählt ist. */
  active?: boolean;
  onPress?: () => void;
}) {
  const isFilterActive = variant === 'filter' && active;
  const isSelectActive = variant === 'select' && active;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        variant === 'filter' && (isFilterActive ? styles.filterActive : styles.filterInactive),
        variant === 'removable' && styles.removable,
        variant === 'dashed' && styles.dashed,
        variant === 'select' && (isSelectActive ? styles.selectActive : styles.selectInactive),
      ]}
    >
      {variant === 'dashed' && <Feather name="plus" size={14} color={colors.primary} />}
      <Text
        style={[
          styles.label,
          isFilterActive && styles.labelActiveFilter,
          variant === 'filter' && !isFilterActive && styles.labelInactiveFilter,
          isSelectActive && styles.labelOnPrimary,
        ]}
      >
        {label}
      </Text>
      {variant === 'removable' && (
        <View style={styles.removeIcon}>
          <Feather name="x" size={13} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.chip,
  },
  filterActive: {
    backgroundColor: colors.accent,
  },
  filterInactive: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  removable: {
    backgroundColor: colors.chipMuted,
  },
  dashed: {
    borderWidth: 1.5,
    borderColor: colors.dashed,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  selectActive: {
    backgroundColor: colors.primary,
  },
  selectInactive: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  labelActiveFilter: {
    fontFamily: fonts.bodyBold,
  },
  labelInactiveFilter: {
    fontFamily: fonts.bodySemiBold,
  },
  labelOnPrimary: {
    color: colors.onPrimary,
  },
  removeIcon: {
    marginLeft: spacing.xs,
  },
});
