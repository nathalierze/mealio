import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import { colors, fonts, fontSizes, placeholderColors, radii, spacing, cardShadow } from '../lib/theme';
import type { Recipe } from '../screens/RecipeListScreen';

function placeholderColorFor(recipeId: number): string {
  return placeholderColors[recipeId % placeholderColors.length];
}

export default function RecipeCard({
  recipe,
  onPress,
  inPlan = false,
  onTogglePlan,
}: {
  recipe: Recipe;
  onPress: () => void;
  inPlan?: boolean;
  onTogglePlan?: () => void;
}) {
  const metaParts = [recipe.time ? `${recipe.time} Min` : null, recipe.portions ? `${recipe.portions} Portionen` : null].filter(
    Boolean
  );

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: placeholderColorFor(recipe.id) }]}>
            <Feather name="image" size={28} color={colors.primary} style={{ opacity: 0.35 }} />
          </View>
        )}
        {onTogglePlan && (
          <Pressable
            style={[styles.planButton, inPlan && styles.planButtonActive]}
            onPress={onTogglePlan}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={inPlan ? 'check' : 'plus'}
              size={18}
              color={inPlan ? colors.onPrimary : colors.primary}
              strokeWidth={2.4}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.name}
        </Text>
        {metaParts.length > 0 && <Text style={styles.meta}>{metaParts.join(' · ')}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
    ...cardShadow,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 108,
  },
  placeholder: {
    width: '100%',
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  planButtonActive: {
    backgroundColor: colors.primary,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textSubtle,
  },
});
