import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

export type ActionSheetOption = {
  key: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
};

export default function ActionSheet({
  visible,
  onClose,
  options,
}: {
  visible: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={() => {}}
        >
          {options.map((option, index) => (
            <Pressable
              key={option.key}
              style={[styles.row, index > 0 && styles.rowDivider]}
              onPress={() => {
                onClose();
                option.onPress();
              }}
            >
              {option.icon}
              <Text style={[styles.label, option.destructive && styles.labelDestructive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,77,58,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.body,
    color: colors.text,
  },
  labelDestructive: {
    color: colors.danger,
  },
});
