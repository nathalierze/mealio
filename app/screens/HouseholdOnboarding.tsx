import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

export default function HouseholdOnboarding({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.rpc('join_or_create_household', {
      p_invite_code: code.trim() || null,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onDone();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Haushalt</Text>
      <Text style={styles.body}>
        Hast du einen Einladungscode von deinem Haushalt bekommen? Gib ihn ein –
        oder lass das Feld leer, um einen neuen Haushalt zu starten.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Einladungscode (optional)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={join} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Los geht&apos;s</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding + 8,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: fontSizes.screenTitle,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    textAlign: 'center',
    letterSpacing: 2,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    color: colors.onPrimary,
    fontSize: fontSizes.button,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
