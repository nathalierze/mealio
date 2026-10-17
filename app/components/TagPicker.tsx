import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import Chip from './Chip';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import type { Tag } from '../hooks/useTags';

export default function TagPicker({
  availableTags,
  selectedTagIds,
  onToggle,
  onCreate,
}: {
  availableTags: Tag[];
  selectedTagIds: Set<string>;
  onToggle: (tagId: string) => void;
  onCreate: (name: string) => Promise<Tag | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const value = newTagName.trim();
    if (!value) return;
    setCreating(true);
    const tag = await onCreate(value);
    setCreating(false);
    setNewTagName('');
    setAdding(false);
    if (tag) onToggle(tag.id);
  }

  return (
    <View>
      <View style={styles.tagsRow}>
        {availableTags.map((tag) => (
          <Chip
            key={tag.id}
            label={tag.name}
            variant="select"
            active={selectedTagIds.has(tag.id)}
            onPress={() => onToggle(tag.id)}
          />
        ))}
        {!adding && <Chip label="Neuer Tag" variant="dashed" onPress={() => setAdding(true)} />}
      </View>
      {adding && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Tag-Name"
            placeholderTextColor={colors.textMuted}
            value={newTagName}
            onChangeText={setNewTagName}
            onSubmitEditing={handleCreate}
            editable={!creating}
            autoFocus
          />
          <Pressable style={styles.confirmButton} onPress={handleCreate} disabled={creating}>
            <Feather name="check" size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
  },
  confirmButton: {
    width: 40,
    height: 40,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
