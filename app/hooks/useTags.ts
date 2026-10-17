import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Tag = {
  id: string;
  name: string;
};

export function useTags(householdId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tags')
      .select('id, name')
      .eq('household_id', householdId)
      .order('name', { ascending: true });
    setTags(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTag(name: string): Promise<Tag | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const { data, error } = await supabase
      .from('tags')
      .insert({ household_id: householdId, name: trimmed })
      .select('id, name')
      .single();

    if (error || !data) return null;
    await load();
    return data;
  }

  async function renameTag(id: string, newName: string): Promise<{ error: string | null }> {
    const trimmed = newName.trim();
    if (!trimmed) return { error: 'Name darf nicht leer sein.' };

    const { error } = await supabase.from('tags').update({ name: trimmed }).eq('id', id);
    if (error) return { error: error.message };
    await load();
    return { error: null };
  }

  async function countRecipesForTag(id: string): Promise<number> {
    const { count } = await supabase
      .from('recipe_tags')
      .select('recipe_id', { count: 'exact', head: true })
      .eq('tag_id', id);
    return count ?? 0;
  }

  async function deleteTag(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) return { error: error.message };
    await load();
    return { error: null };
  }

  return { tags, loading, addTag, renameTag, deleteTag, countRecipesForTag, reload: load };
}
