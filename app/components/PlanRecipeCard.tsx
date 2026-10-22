import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import Card from './Card';
import DayChip from './DayChip';
import { usePlanCookAnimation } from '../hooks/usePlanCookAnimation';
import { colors, fonts, fontSizes, placeholderColors, spacing } from '../lib/theme';
import type { Recipe } from '../screens/RecipeListScreen';

function placeholderColorFor(recipeId: number): string {
  return placeholderColors[recipeId % placeholderColors.length];
}

export default function PlanRecipeCard({
  recipe,
  plannedFor,
  cookedAt,
  onPress,
  onCooked,
  onPressDay,
}: {
  recipe: Recipe;
  plannedFor: string | null;
  cookedAt: string | null;
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
              <Feather name="image" size={20} color={colors.primary} style={{ opacity: 0.35 }} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {recipe.name}
            </Text>
            {metaParts.length > 0 && <Text style={styles.meta}>{metaParts.join(' · ')}</Text>}
            <DayChip plannedFor={plannedFor} cookedAt={cookedAt} onPress={onPressDay} />
          </View>
          <Pressable style={styles.cookButton} onPress={handleCook} hitSlop={8}>
            <Feather name="check" size={20} color={colors.primary} strokeWidth={2.4} />
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
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.primary,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textSubtle,
  },
  cookButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    position: 'absolute',
    top: '30%',
    left: '8%',
    right: '8%',
    backgroundColor: 'rgba(31,77,58,0.94)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  stampText: {
    fontFamily: fonts.bodyBold,
    color: colors.onPrimary,
    fontSize: fontSizes.bodySmall,
    letterSpacing: 1,
  },
});
