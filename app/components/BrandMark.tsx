import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

export default function BrandMark({ variant = 'inline' }: { variant?: 'inline' | 'large' }) {
  if (variant === 'large') {
    return (
      <View style={styles.largeContainer}>
        {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
        <Image source={require('../assets/icon.png')} style={styles.largeLogo} />
        <Text style={styles.wordmark}>mealio</Text>
        <Text style={styles.slogan}>Off your mind, onto your plate.</Text>
      </View>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
      <Image source={require('../assets/icon.png')} style={styles.inlineLogo} />
      <Text style={styles.wordmark}>mealio</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineLogo: {
    width: 34,
    height: 34,
    borderRadius: radii.icon,
  },
  largeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  largeLogo: {
    width: 96,
    height: 96,
    borderRadius: radii.card,
    marginBottom: spacing.md,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.logo,
    letterSpacing: -0.5,
    color: colors.primary,
  },
  slogan: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
