import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTags } from '../hooks/useTags';
import TagPicker from '../components/TagPicker';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import type { Recipe } from './RecipeListScreen';

export default function EditRecipeScreen({
  recipe,
  householdId,
  onCancel,
  onSaved,
}: {
  recipe: Recipe;
  householdId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(recipe.name);
  const [ingredients, setIngredients] = useState((recipe.ingredients ?? []).join('\n'));
  const [time, setTime] = useState(recipe.time ? String(recipe.time) : '');
  const [portions, setPortions] = useState(recipe.portions ? String(recipe.portions) : '');
  const [image, setImage] = useState(recipe.image ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tags: householdTags, loading: tagsLoading, addTag } = useTags(householdId);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const initializedTagsRef = useRef(false);

  useEffect(() => {
    if (!tagsLoading && !initializedTagsRef.current) {
      const currentNames = recipe.tags ?? [];
      const initial = new Set(
        householdTags.filter((t) => currentNames.includes(t.name)).map((t) => t.id)
      );
      setSelectedTagIds(initial);
      initializedTagsRef.current = true;
    }
  }, [tagsLoading, householdTags]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  async function save() {
    if (!name.trim()) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from('recipes')
      .update({
        name: name.trim(),
        ingredients: ingredients
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        time: parseInt(time, 10) || null,
        portions: parseInt(portions, 10) || null,
        image: image.trim() || null,
      })
      .eq('id', recipe.id);

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Tag-Zuordnungen komplett ersetzen (einfacher als einzeln zu diffen).
    await supabase.from('recipe_tags').delete().eq('recipe_id', recipe.id);
    if (selectedTagIds.size > 0) {
      await supabase.from('recipe_tags').insert(
        Array.from(selectedTagIds).map((tagId) => ({ recipe_id: recipe.id, tag_id: tagId }))
      );
    }

    setLoading(false);
    onSaved();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>Abbrechen</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Rezept bearbeiten</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Rezeptname</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Zutaten (eine pro Zeile)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={ingredients}
            onChangeText={setIngredients}
            multiline
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Kochzeit (Min)</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} keyboardType="number-pad" />
          </View>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Portionen</Text>
            <TextInput
              style={styles.input}
              value={portions}
              onChangeText={setPortions}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bild-URL (optional)</Text>
          <TextInput style={styles.input} value={image} onChangeText={setImage} autoCapitalize="none" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tags</Text>
          <TagPicker
            availableTags={householdTags}
            selectedTagIds={selectedTagIds}
            onToggle={toggleTag}
            onCreate={addTag}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.saveButton} onPress={save} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Änderungen speichern</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  headerSpacer: {
    width: 70,
  },
  cancelText: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: fontSizes.meta,
  },
  form: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl * 2,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveButtonText: {
    fontFamily: fonts.bodyBold,
    color: colors.onPrimary,
    fontSize: fontSizes.button,
  },
});
