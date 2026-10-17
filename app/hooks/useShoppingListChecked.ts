import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useShoppingListChecked(householdId: string) {
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('shopping_list_checked_items')
      .select('item_key')
      .eq('household_id', householdId);
    setCheckedKeys(new Set((data ?? []).map((row) => row.item_key)));
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(itemKey: string) {
    const isChecked = checkedKeys.has(itemKey);
    // Optimistisch: UI reagiert sofort, DB-Fehler wirft den Stand per reload zurück.
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (isChecked) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });

    if (isChecked) {
      await supabase
        .from('shopping_list_checked_items')
        .delete()
        .eq('household_id', householdId)
        .eq('item_key', itemKey);
    } else {
      await supabase
        .from('shopping_list_checked_items')
        .upsert(
          { household_id: householdId, item_key: itemKey },
          { onConflict: 'household_id,item_key' }
        );
    }
  }

  async function clearAll() {
    setCheckedKeys(new Set());
    await supabase.from('shopping_list_checked_items').delete().eq('household_id', householdId);
  }

  return { checkedKeys, loading, toggle, clearAll, reload: load };
}
