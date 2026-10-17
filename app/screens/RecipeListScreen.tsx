import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useTags } from '../hooks/useTags';
import RecipeCard from '../components/RecipeCard';
import FilterBar from '../components/FilterBar';
import { colors, fonts, fontSizes, spacing } from '../lib/theme';

export type Recipe = {
  id: number;
  name: string;
  image: string | null;
  time: number | null;
  portions: number | null;
  tags: string[] | null;
  ingredients: string[] | null;
  source: string | null;
};

type RecipeRow = {
  id: number;
  name: string;
  image: string | null;
  time: number | null;
  portions: number | null;
  ingredients: string[] | null;
  source: string | null;
  recipe_tags: { tags: { name: string } | null }[] | null;
};

function mapRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    time: row.time,
    portions: row.portions,
    ingredients: row.ingredients,
    source: row.source,
    tags: (row.recipe_tags ?? [])
      .map((rt) => rt.tags?.name)
      .filter((n): n is string => Boolean(n)),
  };
}

export default function RecipeListScreen({
  householdId,
  onSelectRecipe,
  planRecipeIds,
  onTogglePlan,
}: {
  householdId: string;
  onSelectRecipe: (recipe: Recipe) => void;
  planRecipeIds: Set<number>;
  onTogglePlan: (recipe: Recipe) => void;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Alle');
  const { tags: householdTags } = useTags(householdId);

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    setLoading(true);
    setError(null);

    // RLS filtert automatisch auf den Haushalt des eingeloggten Nutzers.
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, image, time, portions, ingredients, source, recipe_tags(tags(name))')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRecipes((data as unknown as RecipeRow[]).map(mapRow));
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Fehler beim Laden: {error}</Text>
      </View>
    );
  }

  if (recipes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🍳</Text>
        <Text style={styles.emptyTitle}>Noch keine Rezepte</Text>
        <Text style={styles.emptyBody}>Füge dein erstes Rezept hinzu, um loszulegen.</Text>
      </View>
    );
  }

  const tagNames = householdTags.map((t) => t.name);
  const filtered =
    activeFilter === 'Alle' ? recipes : recipes.filter((r) => (r.tags ?? []).includes(activeFilter));

  return (
    <View style={styles.container}>
      <FilterBar tags={tagNames} activeFilter={activeFilter} onSelect={setActiveFilter} />

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Keine Treffer</Text>
          <Text style={styles.emptyBody}>Keine Rezepte mit dem Tag „{activeFilter}".</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => onSelectRecipe(item)}
              inPlan={planRecipeIds.has(item.id)}
              onTogglePlan={() => onTogglePlan(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: spacing.screenPadding,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.danger,
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
