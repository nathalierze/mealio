import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import Card from './Card';
import { usePlanCookAnimation } from '../hooks/usePlanCookAnimation';
import { colors, fonts, fontSizes, placeholderColors, spacing } from '../lib/theme';
import { formatShortDate } from '../lib/planDays';
import type { Recipe } from '../screens/RecipeListScreen';

function placeholderColorFor(recipeId: number): string {
  return placeholderColors[recipeId % placeholderColors.length];
}

// Kompakte Plan-Karte für die Wochenansicht: entweder innerhalb eines
// Tages (rightAction="change", kein Hinweistext) oder im "Noch ohne Tag"-
// Block (rightAction="pick", zeigt ggf. den "verpasst"-Hinweis statt Meta).
export default function CompactPlanCard({
  recipe,
  plannedFor,
  missed,
  rightAction,
  onPress,
  onCooked,
  onPressDay,
}: {
  recipe: Recipe;
  plannedFor: string | null;
  missed: boolean;
  rightAction: 'change' | 'pick';
  onPress: () => void;
  onCooked: () => void;
  onPressDay: () => void;
}) {
  const { scale, stampOpacity, cardOpacity, handleCook } = usePlanCookAnimation(onCooked);

  const metaParts = [recipe.time ? `${recipe.time} Min` : null, recipe.portions ? `${recipe.portions} Portionen` : null].filter(
    Boolean
  );

  return (
    <Animated.View style={{ opacity: cardOpacity, transform: [{ scale }] }}>
      <Card style={styles.card}>
        <Pressable style={styles.row} onPress={onPress}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: placeholderColorFor(recipe.id) }]}>
              <Feather name="image" size={16} color={colors.primary} style={{ opacity: 0.35 }} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {recipe.name}
            </Text>
            {missed && plannedFor ? (
              <Text style={styles.missedHint}>War für {formatShortDate(plannedFor)} geplant</Text>
            ) : metaParts.length > 0 ? (
              <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
            ) : null}
          </View>

          {rightAction === 'change' ? (
            <Pressable style={styles.changeButton} onPress={onPressDay} hitSlop={8}>
              <Feather name="calendar" size={16} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable style={styles.pickChip} onPress={onPressDay}>
              <Text style={styles.pickChipText}>Tag wählen</Text>
            </Pressable>
          )}

          <Pressable style={styles.cookButton} onPress={handleCook} hitSlop={8}>
            <Feather name="check" size={16} color={colors.primary} strokeWidth={2.4} />
          </Pressable>
        </Pressable>
        <Animated.View pointerEvents="none" style={[styles.stamp, { opacity: stampOpacity }]}>
          <Text style={styles.stampText}>Gekocht ✓</Text>
        </Animated.View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
  },
  missedHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.missed,
  },
  changeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickChip: {
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.dashed,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
  cookButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    position: 'absolute',
    top: '25%',
    left: '8%',
    right: '8%',
    backgroundColor: 'rgba(31,77,58,0.94)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  stampText: {
    fontFamily: fonts.bodyBold,
    color: colors.onPrimary,
    fontSize: 13,
    letterSpacing: 1,
  },
});
