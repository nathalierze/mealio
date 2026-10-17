import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/build/Feather';
import { colors, minTouchTarget, radii, spacing } from '../lib/theme';
import PrimaryButton from './PrimaryButton';

export default function BottomBar({
  primaryLabel,
  primaryIcon,
  primaryVariant = 'primary',
  disabled = false,
  onPrimaryPress,
  onSettingsPress,
}: {
  primaryLabel: string;
  primaryIcon?: ReactNode;
  primaryVariant?: 'primary' | 'accent';
  disabled?: boolean;
  onPrimaryPress: () => void;
  onSettingsPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <PrimaryButton
        label={primaryLabel}
        icon={primaryIcon}
        variant={primaryVariant}
        disabled={disabled}
        onPress={onPrimaryPress}
        style={styles.primaryButton}
      />
      <Pressable style={styles.settingsButton} onPress={onSettingsPress}>
        <Feather name="settings" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  primaryButton: {
    flex: 1,
  },
  settingsButton: {
    width: minTouchTarget + 8,
    height: minTouchTarget + 8,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
