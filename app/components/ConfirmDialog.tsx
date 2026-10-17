import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

// Eigene Dialog-Komponente statt lib/alert.ts confirm(): die läuft auf Web
// über window.confirm, das kann keinen roten/destruktiven Button rendern.
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={() => {}}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={[styles.confirmButton, destructive && styles.confirmButtonDestructive]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Abbrechen</Text>
          </Pressable>
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
    padding: spacing.screenPadding,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  confirmButton: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  confirmButtonDestructive: {
    backgroundColor: colors.danger,
  },
  confirmButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.button,
    color: colors.onPrimary,
  },
  cancelButton: {
    height: 52,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.button,
    color: colors.textMuted,
  },
});
