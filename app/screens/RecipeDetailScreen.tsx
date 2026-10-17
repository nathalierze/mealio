import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/build/Feather';
import { supabase } from '../lib/supabase';
import { confirm, notify } from '../lib/alert';
import { isBaseIngredient } from '../lib/baseIngredients';
import Card from '../components/Card';
import ActionSheet from '../components/ActionSheet';
import { colors, fonts, fontSizes, placeholderColors, spacing } from '../lib/theme';
import type { Recipe } from './RecipeListScreen';

function placeholderColorFor(recipeId: number): string {
  return placeholderColors[recipeId % placeholderColors.length];
}

export default function RecipeDetailScreen({
  recipe,
  baseIngredients,
  inPlan,
  onTogglePlan,
  onBack,
  onEdit,
  onDeleted,
}: {
  recipe: Recipe;
  baseIngredients: string[];
  inPlan: boolean;
  onTogglePlan: () => void;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDeleted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [displayPortions, setDisplayPortions] = useState(recipe.portions ?? 4);

  async function confirmDelete() {
    const confirmed = await confirm(
      'Rezept löschen?',
      `„${recipe.name}" wird endgültig gelöscht.`,
      'Löschen'
    );
    if (confirmed) deleteRecipe();
  }

  async function deleteRecipe() {
    setDeleting(true);
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
    setDeleting(false);
    if (error) {
      notify('Fehler beim Löschen', error.message);
      return;
    }
    onDeleted();
  }

  const tags = recipe.tags ?? [];
  const ingredients = recipe.ingredients ?? [];
  const canOpenSource = recipe.source?.startsWith('http');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={[styles.hero, { backgroundColor: placeholderColorFor(recipe.id) }]}>
              <Feather name="image" size={72} color={colors.primary} style={{ opacity: 0.3 }} />
            </View>
          )}
          <Pressable
            style={[styles.heroButton, styles.heroButtonLeft, { top: insets.top + spacing.md }]}
            onPress={onBack}
          >
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.heroButton, styles.heroButtonRight, { top: insets.top + spacing.md }]}
            onPress={() => setShowActions(true)}
          >
            <Feather name="more-horizontal" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{recipe.name}</Text>

          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.tilesRow}>
            <View style={styles.tile}>
              <Feather name="clock" size={22} color={colors.quantity} />
              <View>
                <Text style={styles.tileLabel}>Kochzeit</Text>
                <Text style={styles.tileValue}>{recipe.time ?? '?'} Min</Text>
              </View>
            </View>
            <View style={styles.tile}>
              <View style={styles.tileGrow}>
                <Text style={styles.tileLabel}>Portionen</Text>
                <Text style={styles.tileValue}>{displayPortions}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setDisplayPortions((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setDisplayPortions((p) => p + 1)}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Zutaten</Text>
          <Card style={styles.ingredientsCard}>
            {ingredients.length === 0 ? (
              <Text style={styles.emptyIngredients}>Keine Zutaten eingetragen</Text>
            ) : (
              ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientRow,
                    index < ingredients.length - 1 && styles.ingredientRowDivider,
                  ]}
                >
                  <Text style={styles.ingredientName}>{ingredient}</Text>
                  {isBaseIngredient(ingredient, baseIngredients) && (
                    <Text style={styles.baseIngredientTag}>Grundzutat</Text>
                  )}
                </View>
              ))
            )}
          </Card>

          {canOpenSource && (
            <Pressable onPress={() => Linking.openURL(recipe.source as string)}>
              <Text style={styles.sourceLink}>Original-Rezept öffnen</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          style={[styles.planButton, inPlan ? styles.planButtonOutline : styles.planButtonFilled]}
          onPress={onTogglePlan}
        >
          <Feather
            name={inPlan ? 'check' : 'plus'}
            size={18}
            color={inPlan ? colors.primary : colors.onPrimary}
          />
          <Text style={[styles.planButtonText, inPlan && styles.planButtonTextOutline]}>
            {inPlan ? 'Im Wochenplan' : 'Zum Wochenplan'}
          </Text>
        </Pressable>
      </View>

      <ActionSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        options={[
          {
            key: 'edit',
            label: 'Bearbeiten',
            icon: <Feather name="edit-2" size={18} color={colors.text} />,
            onPress: () => onEdit(recipe),
          },
          {
            key: 'delete',
            label: deleting ? '…' : 'Löschen',
            icon: <Feather name="trash-2" size={18} color={colors.danger} />,
            destructive: true,
            onPress: confirmDelete,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 140,
  },
  heroWrap: {
    position: 'relative',
  },
  hero: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(31,77,58,0.18)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroButtonLeft: {
    left: spacing.md,
  },
  heroButtonRight: {
    right: spacing.md,
  },
  content: {
    marginTop: -24,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: spacing.screenPadding,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 30,
    lineHeight: 30 * 1.15,
    color: colors.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 10,
  },
  tagPill: {
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: 15,
    backgroundColor: colors.chipMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xl,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    padding: spacing.md,
  },
  tileGrow: {
    flex: 1,
  },
  tileLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
  },
  tileValue: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 22,
    color: colors.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  ingredientsCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  emptyIngredients: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 42,
  },
  ingredientRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  ingredientName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
  },
  baseIngredientTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSubtle,
  },
  sourceLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.meta,
    color: colors.quantity,
    marginTop: spacing.xl,
  },
  bottomBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  planButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  planButtonFilled: {
    backgroundColor: colors.primary,
  },
  planButtonOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  planButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.button,
    color: colors.onPrimary,
  },
  planButtonTextOutline: {
    color: colors.primary,
  },
});
