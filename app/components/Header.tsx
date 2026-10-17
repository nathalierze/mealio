import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandMark from './BrandMark';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

export default function Header<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.logoRow}>
        <BrandMark variant="inline" />
      </View>

      <View style={styles.segmented}>
        {options.map((option) => {
          const active = option.key === value;
          return (
            <Pressable
              key={option.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => onChange(option.key)}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPadding,
  },
  logoRow: {
    marginBottom: spacing.xl,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.segmentedOuter,
    padding: 4,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radii.segmentedInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  segmentLabelActive: {
    color: colors.onPrimary,
  },
});
