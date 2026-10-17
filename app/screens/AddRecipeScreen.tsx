import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import { supabase } from '../lib/supabase';
import { useTags } from '../hooks/useTags';
import TagPicker from '../components/TagPicker';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';

type Tab = 'manual' | 'text' | 'url';
type IngredientRow = { quantity: string; name: string };

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function AddRecipeScreen({
  householdId,
  onSaved,
  onCancel,
}: {
  householdId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<Tab>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tags: householdTags, addTag } = useTags(householdId);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const [manualName, setManualName] = useState('');
  const [manualIngredientRows, setManualIngredientRows] = useState<IngredientRow[]>([
    { quantity: '', name: '' },
  ]);
  const [manualTime, setManualTime] = useState('30');
  const [manualPortions, setManualPortions] = useState('4');
  const [manualImage, setManualImage] = useState('');

  const [textName, setTextName] = useState('');
  const [textBody, setTextBody] = useState('');

  const [url, setUrl] = useState('');

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  function updateIngredientRow(index: number, field: keyof IngredientRow, value: string) {
    setManualIngredientRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addIngredientRow() {
    setManualIngredientRows((prev) => [...prev, { quantity: '', name: '' }]);
  }

  function removeIngredientRow(index: number) {
    setManualIngredientRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function insertRecipe(recipe: {
    name: string;
    time: number | null;
    portions: number | null;
    image: string | null;
    ingredients: string[];
    source: string | null;
  }) {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...recipe, household_id: householdId })
      .select('id')
      .single();

    if (error || !data) {
      setLoading(false);
      setError(error?.message ?? 'Unbekannter Fehler beim Speichern.');
      return;
    }

    if (selectedTagIds.size > 0) {
      await supabase.from('recipe_tags').insert(
        Array.from(selectedTagIds).map((tagId) => ({ recipe_id: data.id, tag_id: tagId }))
      );
    }

    setLoading(false);
    onSaved();
  }

  async function saveManual() {
    if (!manualName.trim()) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    const ingredients = manualIngredientRows
      .map((row) => [row.quantity.trim(), row.name.trim()].filter(Boolean).join(' '))
      .filter(Boolean);
    await insertRecipe({
      name: manualName.trim(),
      time: parseInt(manualTime, 10) || null,
      portions: parseInt(manualPortions, 10) || null,
      image: manualImage.trim() || null,
      ingredients,
      source: 'manual',
    });
  }

  async function saveFromText() {
    if (!textName.trim() || !textBody.trim()) {
      setError('Name und Text sind erforderlich.');
      return;
    }
    const lines = textBody
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const ingredients: string[] = [];
    for (const line of lines) {
      if (/zubereitung|anleitung/i.test(line)) break;
      if (/zutaten/i.test(line)) continue;
      ingredients.push(line.replace(/^[•\-*]\s*/, ''));
    }
    await insertRecipe({
      name: textName.trim(),
      time: null,
      portions: null,
      image: null,
      ingredients,
      source: 'text',
    });
  }

  async function saveFromUrl() {
    if (!url.trim()) {
      setError('Bitte eine URL eingeben.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.functions.invoke('extract-recipe', {
      body: { url: url.trim() },
    });

    if (error) {
      setLoading(false);
      setError('Rezept konnte nicht geladen werden: ' + error.message);
      return;
    }

    setLoading(false);
    await insertRecipe({
      name: data.name,
      time: data.time ?? null,
      portions: data.portions ?? null,
      image: data.image ?? null,
      ingredients: data.ingredients ?? [],
      source: data.source ?? url.trim(),
    });
  }

  function handleSave() {
    if (tab === 'manual') saveManual();
    else if (tab === 'text') saveFromText();
    else saveFromUrl();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Rezept hinzufügen</Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Feather name="x" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(
              [
                { key: 'url', label: 'Link' },
                { key: 'text', label: 'Text' },
                { key: 'manual', label: 'Manuell' },
              ] as { key: Tab; label: string }[]
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                style={[styles.tab, tab === key && styles.tabActive]}
                onPress={() => {
                  setTab(key);
                  setError(null);
                }}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {tab === 'manual' && (
              <>
                <Field label="Rezeptname">
                  <TextInput
                    style={styles.input}
                    value={manualName}
                    onChangeText={setManualName}
                    placeholder="z.B. Linsensuppe"
                    placeholderTextColor={colors.textMuted}
                  />
                </Field>
                <Field label="Zutaten">
                  {manualIngredientRows.map((row, index) => (
                    <View key={index} style={styles.ingredientRow}>
                      <TextInput
                        style={[styles.input, styles.ingredientQuantity]}
                        value={row.quantity}
                        onChangeText={(v) => updateIngredientRow(index, 'quantity', v)}
                        placeholder="Menge"
                        placeholderTextColor={colors.textMuted}
                      />
                      <TextInput
                        style={[styles.input, styles.ingredientName]}
                        value={row.name}
                        onChangeText={(v) => updateIngredientRow(index, 'name', v)}
                        placeholder="Zutat"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Pressable
                        onPress={() => removeIngredientRow(index)}
                        hitSlop={8}
                        style={styles.ingredientRemove}
                      >
                        <Feather name="x" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.addIngredientRow} onPress={addIngredientRow}>
                    <Feather name="plus" size={16} color={colors.quantity} />
                    <Text style={styles.addIngredientText}>Zutat hinzufügen</Text>
                  </Pressable>
                </Field>
                <View style={styles.row}>
                  <Field label="Kochzeit (Min)" style={styles.half}>
                    <TextInput
                      style={styles.input}
                      value={manualTime}
                      onChangeText={setManualTime}
                      keyboardType="number-pad"
                    />
                  </Field>
                  <Field label="Portionen" style={styles.half}>
                    <TextInput
                      style={styles.input}
                      value={manualPortions}
                      onChangeText={setManualPortions}
                      keyboardType="number-pad"
                    />
                  </Field>
                </View>
                <Field label="Bild-URL (optional)">
                  <TextInput
                    style={styles.input}
                    value={manualImage}
                    onChangeText={setManualImage}
                    placeholder="https://..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </Field>
              </>
            )}

            {tab === 'text' && (
              <>
                <Field label="Rezeptname">
                  <TextInput
                    style={styles.input}
                    value={textName}
                    onChangeText={setTextName}
                    placeholder="z.B. Pasta Carbonara"
                    placeholderTextColor={colors.textMuted}
                  />
                </Field>
                <Field label="Rezepttext einfügen">
                  <Text style={styles.fieldHint}>
                    Zutaten und Zubereitung werden automatisch erkannt
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={textBody}
                    onChangeText={setTextBody}
                    multiline
                    placeholder={'Zutaten:\n200g Pasta\n...'}
                    placeholderTextColor={colors.textMuted}
                  />
                </Field>
              </>
            )}

            {tab === 'url' && (
              <Field label="Rezept-URL">
                <TextInput
                  style={styles.input}
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://www.chefkoch.de/rezepte/..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </Field>
            )}

            <Field label="Tags">
              <TagPicker
                availableTags={householdTags}
                selectedTagIds={selectedTagIds}
                onToggle={toggleTag}
                onCreate={addTag}
              />
            </Field>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {tab === 'url' ? 'Rezept importieren' : 'Rezept speichern'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,77,58,0.4)',
  },
  sheetWrap: {
    maxHeight: '90%',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.sm,
    maxHeight: '100%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.segmentedOuter,
    padding: 4,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: radii.segmentedInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.primary,
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  form: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl * 2,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 52,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    height: undefined,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ingredientQuantity: {
    flex: 1,
  },
  ingredientName: {
    flex: 2,
  },
  ingredientRemove: {
    width: 32,
    alignItems: 'center',
  },
  addIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  addIngredientText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.quantity,
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
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: {
    fontFamily: fonts.bodyBold,
    color: colors.onPrimary,
    fontSize: fontSizes.button,
  },
});
