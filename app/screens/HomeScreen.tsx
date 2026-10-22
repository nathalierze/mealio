import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import { colors } from '../lib/theme';
import RecipeListScreen, { type Recipe } from './RecipeListScreen';
import WeeklyPlanScreen from './WeeklyPlanScreen';
import ShoppingListScreen, { type ShoppingListHandle } from './ShoppingListScreen';
import RecipeDetailScreen from './RecipeDetailScreen';
import AddRecipeScreen from './AddRecipeScreen';
import EditRecipeScreen from './EditRecipeScreen';
import SettingsScreen from './SettingsScreen';
import type { Household } from '../types/household';

type TabKey = 'recipes' | 'plan' | 'shopping';

export default function HomeScreen({
  household,
  onHouseholdChange,
}: {
  household: Household;
  onHouseholdChange: () => Promise<void>;
}) {
  const [activeView, setActiveView] = useState<TabKey>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [adding, setAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [sendingShoppingList, setSendingShoppingList] = useState(false);
  const shoppingListRef = useRef<ShoppingListHandle>(null);

  const {
    planRecipeIds,
    activeEntries,
    pendingShoppingEntries,
    loading: planLoading,
    togglePlan,
    setPlannedFor,
    removeFromPlan,
    markCooked,
    markShoppingSent,
  } = useWeeklyPlan(household.id);

  const selectedPlanEntry = selectedRecipe
    ? activeEntries.find((e) => e.recipe.id === selectedRecipe.id) ?? null
    : null;
  const detailDayCounts: Record<string, number> = {};
  for (const entry of activeEntries) {
    if (entry.id === selectedPlanEntry?.id) continue;
    if (!entry.plannedFor) continue;
    detailDayCounts[entry.plannedFor] = (detailDayCounts[entry.plannedFor] ?? 0) + 1;
  }

  if (editingRecipe) {
    return (
      <EditRecipeScreen
        recipe={editingRecipe}
        householdId={household.id}
        onCancel={() => setEditingRecipe(null)}
        onSaved={() => {
          setEditingRecipe(null);
          setSelectedRecipe(null);
          setListKey((k) => k + 1);
        }}
      />
    );
  }

  if (selectedRecipe) {
    return (
      <RecipeDetailScreen
        recipe={selectedRecipe}
        baseIngredients={household.base_ingredients}
        planEntry={selectedPlanEntry}
        dayCounts={detailDayCounts}
        onSelectDay={(day) => {
          if (selectedPlanEntry) setPlannedFor(selectedPlanEntry.id, day);
          else togglePlan(selectedRecipe, day);
        }}
        onRemoveFromPlan={() => {
          if (selectedPlanEntry) removeFromPlan(selectedPlanEntry.id);
        }}
        onBack={() => setSelectedRecipe(null)}
        onEdit={setEditingRecipe}
        onDeleted={() => {
          setSelectedRecipe(null);
          setListKey((k) => k + 1);
        }}
      />
    );
  }

  if (adding) {
    return (
      <AddRecipeScreen
        householdId={household.id}
        onCancel={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          setListKey((k) => k + 1); // erzwingt Neuladen der Rezeptliste
        }}
      />
    );
  }

  if (showSettings) {
    return (
      <SettingsScreen
        household={household}
        onHouseholdChange={onHouseholdChange}
        onHouseholdSwitched={async () => {
          await onHouseholdChange();
          setListKey((k) => k + 1);
          setActiveView('recipes');
          setShowSettings(false);
        }}
        onBack={() => setShowSettings(false)}
      />
    );
  }

  const isShoppingView = activeView === 'shopping';
  const todoistConnected = Boolean(household.todoist_api_token);

  return (
    <View style={styles.container}>
      <Header
        value={activeView}
        onChange={setActiveView}
        options={[
          { key: 'recipes', label: 'Rezepte' },
          { key: 'plan', label: 'Wochenplan' },
          { key: 'shopping', label: 'Liste' },
        ]}
      />

      <View style={styles.content}>
        {activeView === 'recipes' && (
          <RecipeListScreen
            key={listKey}
            householdId={household.id}
            onSelectRecipe={setSelectedRecipe}
            planRecipeIds={planRecipeIds}
            onTogglePlan={togglePlan}
          />
        )}
        {activeView === 'plan' && (
          <WeeklyPlanScreen
            entries={activeEntries}
            pendingShoppingCount={pendingShoppingEntries.length}
            loading={planLoading}
            onSelectRecipe={setSelectedRecipe}
            onCooked={markCooked}
            onViewShoppingList={() => setActiveView('shopping')}
            onSetPlannedFor={setPlannedFor}
            onRemoveFromPlan={removeFromPlan}
          />
        )}
        {activeView === 'shopping' && (
          <ShoppingListScreen
            ref={shoppingListRef}
            householdId={household.id}
            entries={pendingShoppingEntries}
            baseIngredients={household.base_ingredients}
            todoistConnected={Boolean(household.todoist_api_token)}
            todoistProjectId={household.todoist_project_id}
            onSent={markShoppingSent}
            onSendingChange={setSendingShoppingList}
          />
        )}
      </View>

      <BottomBar
        primaryLabel={
          isShoppingView
            ? todoistConnected
              ? 'An Todoist senden'
              : 'Einkauf abschließen'
            : '+ Rezept hinzufügen'
        }
        primaryVariant={isShoppingView && todoistConnected ? 'accent' : 'primary'}
        primaryIcon={
          isShoppingView && todoistConnected ? (
            <Feather name="send" size={18} color={colors.primary} />
          ) : undefined
        }
        disabled={isShoppingView && (pendingShoppingEntries.length === 0 || sendingShoppingList)}
        onPrimaryPress={() => {
          if (isShoppingView) shoppingListRef.current?.confirmPrimaryAction();
          else setAdding(true);
        }}
        onSettingsPress={() => setShowSettings(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
