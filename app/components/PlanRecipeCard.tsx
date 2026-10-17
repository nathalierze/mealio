import { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import Card from './Card';
import { colors, fonts, fontSizes, placeholderColors, spacing } from '../lib/theme';
import type { Recipe } from '../screens/RecipeListScreen';

function placeholderColorFor(recipeId: number): string {
  return placeholderColors[recipeId % placeholderColors.length];
}

export default function PlanRecipeCard({
  recipe,
  onPress,
  onCooked,
}: {
  recipe: Recipe;
  onPress: () => void;
  onCooked: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const metaParts = [recipe.time ? `${recipe.time} Min` : null, recipe.portions ? `${recipe.portions} Portionen` : null].filter(
    Boolean
  );

  function handleCook() {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.02, friction: 4, useNativeDriver: true }),
        Animated.timing(stampOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(550),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(() => onCooked());
  }

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
