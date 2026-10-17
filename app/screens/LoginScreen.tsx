import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('token has expired') || lower.includes('invalid')) {
    return 'Der Code ist falsch oder abgelaufen. Fordere einen neuen an.';
  }
  if (lower.includes('rate limit')) {
    return 'Zu viele Versuche. Bitte warte kurz und versuch es erneut.';
  }
  return 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';
}

export default function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });

    setLoading(false);
    if (error) {
      setError(friendlyError(error.message));
    } else {
      setStep('code');
    }
  }

  async function verifyCode() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    setLoading(false);
    if (error) {
      setError(friendlyError(error.message));
    }
    // Bei Erfolg übernimmt onAuthStateChange in App.tsx den Rest.
  }

  async function resendCode() {
    setCode('');
    setError(null);
    await sendCode();
  }

  if (step === 'code') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Code eingeben</Text>
        <Text style={styles.body}>Wir haben einen Code an {email} geschickt.</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="12345678"
          placeholderTextColor="#A8A49C"
          keyboardType="number-pad"
          autoFocus
          maxLength={8}
          value={code}
          onChangeText={setCode}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Anmelden</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={resendCode} disabled={loading}>
          <Text style={styles.link}>Neuen Code anfordern</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setStep('email');
            setCode('');
            setError(null);
          }}
        >
          <Text style={styles.link}>Andere E-Mail verwenden</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>🌿 Mealio</Text>
      <Text style={styles.body}>Melde dich mit einem Code per E-Mail an – kein Passwort nötig.</Text>
      <TextInput
        style={styles.input}
        placeholder="E-Mail-Adresse"
        placeholderTextColor="#A8A49C"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={sendCode} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Code senden</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
    color: colors.text,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 4,
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
  link: {
    fontFamily: fonts.bodySemiBold,
    color: colors.quantity,
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: fontSizes.meta,
  },
});
