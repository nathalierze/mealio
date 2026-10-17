import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, fontSizes, minTouchTarget, radii, spacing } from '../lib/theme';

type Variant = 'primary' | 'accent';
type Size = 'large' | 'small';

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  disabled?: boolean;
  style?: object;
}) {
  const backgroundColor = variant === 'accent' ? colors.accent : colors.primary;
  const textColor = variant === 'accent' ? colors.primary : colors.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        size === 'large' ? styles.large : styles.small,
        { backgroundColor, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon}
      <Text
        style={[styles.label, size === 'large' ? styles.labelLarge : styles.labelSmall, { color: textColor }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  large: {
    height: 52,
    borderRadius: radii.button,
    paddingHorizontal: spacing.xl,
  },
  small: {
    minHeight: minTouchTarget,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyBold,
  },
  labelLarge: {
    fontSize: fontSizes.button,
  },
  labelSmall: {
    fontSize: fontSizes.buttonSmall,
  },
});
