import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/build/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { confirm, notify } from '../lib/alert';
import { shareText } from '../lib/share';
import { useTags, type Tag } from '../hooks/useTags';
import Card from '../components/Card';
import Chip from '../components/Chip';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, fonts, fontSizes, radii, spacing } from '../lib/theme';
import type { Household } from '../types/household';

type Member = {
  userId: string;
  email: string | null;
  joinedAt: string;
};

type TodoistProject = {
  id: string;
  name: string;
};

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function initialsFor(email: string | null): string {
  if (!email) return '?';
  return email[0]!.toUpperCase();
}

export default function SettingsScreen({
  household,
  onHouseholdChange,
  onHouseholdSwitched,
  onBack,
}: {
  household: Household;
  onHouseholdChange: () => Promise<void>;
  onHouseholdSwitched: () => Promise<void>;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [todoistToken, setTodoistToken] = useState('');
  const [connectingTodoist, setConnectingTodoist] = useState(false);
  const [projects, setProjects] = useState<TodoistProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectingProjectId, setSelectingProjectId] = useState<string | null>(null);
  const { tags, loading: tagsLoading, addTag, renameTag, deleteTag, countRecipesForTag } =
    useTags(household.id);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');

  const [joinSheetVisible, setJoinSheetVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'join' | 'leave';
    code?: string;
    isLastMember: boolean;
    recipeCount: number;
  } | null>(null);

  const [pendingDelete, setPendingDelete] = useState<{
    isLastMember: boolean;
    recipeCount: number;
    otherMembers: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMembers();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [household.id]);

  useEffect(() => {
    if (household.todoist_api_token) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [household.todoist_api_token]);

  useEffect(() => {
    if (tagsLoading) return;
    Promise.all(tags.map(async (tag) => [tag.id, await countRecipesForTag(tag.id)] as const)).then(
      (pairs) => setTagCounts(Object.fromEntries(pairs))
    );
  }, [tagsLoading, tags]);

  async function loadProjects() {
    setProjectsLoading(true);
    const { data, error } = await supabase.functions.invoke('list-todoist-projects');
    setProjectsLoading(false);
    if (error) {
      notify('Fehler beim Laden der Todoist-Projekte', error.message);
      return;
    }
    setProjects(data.projects ?? []);
  }

  async function selectProject(projectId: string) {
    setSelectingProjectId(projectId);
    const { error } = await supabase
      .from('households')
      .update({ todoist_project_id: projectId })
      .eq('id', household.id);
    setSelectingProjectId(null);
    if (error) {
      notify('Fehler', error.message);
    } else {
      await onHouseholdChange();
    }
  }

  async function loadMembers() {
    setMembersLoading(true);
    const { data: memberRows } = await supabase
      .from('household_members')
      .select('user_id, joined_at')
      .eq('household_id', household.id);

    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map((m) => m.user_id);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailById = new Map((profileRows ?? []).map((p) => [p.id, p.email]));
      setMembers(
        memberRows.map((m) => ({
          userId: m.user_id,
          email: emailById.get(m.user_id) ?? null,
          joinedAt: m.joined_at,
        }))
      );
    } else {
      setMembers([]);
    }
    setMembersLoading(false);
  }

  async function shareInviteCode() {
    await shareText(`Tritt unserem Mealio-Haushalt bei! Einladungscode: ${household.invite_code}`);
  }

  async function regenerateCode() {
    setRegenerating(true);
    const { error } = await supabase.rpc('regenerate_invite_code');
    setRegenerating(false);
    if (error) {
      notify('Fehler', error.message);
    } else {
      await onHouseholdChange();
    }
  }

  async function addBaseIngredient() {
    const value = newIngredient.trim().toLowerCase();
    if (!value || household.base_ingredients.includes(value)) {
      setNewIngredient('');
      setAddingIngredient(false);
      return;
    }
    const updated = [...household.base_ingredients, value];
    setNewIngredient('');
    setAddingIngredient(false);
    const { error } = await supabase
      .from('households')
      .update({ base_ingredients: updated })
      .eq('id', household.id);
    if (error) {
      notify('Fehler', error.message);
    } else {
      await onHouseholdChange();
    }
  }

  async function removeBaseIngredient(ingredient: string) {
    const updated = household.base_ingredients.filter((i) => i !== ingredient);
    const { error } = await supabase
      .from('households')
      .update({ base_ingredients: updated })
      .eq('id', household.id);
    if (error) {
      notify('Fehler', error.message);
    } else {
      await onHouseholdChange();
    }
  }

  async function connectTodoist() {
    const value = todoistToken.trim();
    if (!value) return;
    setConnectingTodoist(true);
    const { error } = await supabase
      .from('households')
      .update({ todoist_api_token: value })
      .eq('id', household.id);
    setConnectingTodoist(false);
    if (error) {
      notify('Fehler', error.message);
    } else {
      setTodoistToken('');
      await onHouseholdChange();
    }
  }

  async function handleAddTag() {
    const value = newTagName.trim();
    if (!value) return;
    setNewTagName('');
    setAddingTag(false);
    const tag = await addTag(value);
    if (!tag) notify('Fehler', 'Tag konnte nicht angelegt werden.');
  }

  function startRenameTag(tag: Tag) {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  }

  async function saveRenameTag() {
    if (!editingTagId) return;
    const { error } = await renameTag(editingTagId, editingTagName);
    if (error) notify('Fehler', error);
    setEditingTagId(null);
  }

  async function handleDeleteTag(tag: Tag) {
    const count = await countRecipesForTag(tag.id);
    const message =
      count > 0
        ? `„${tag.name}" wird bei ${count} Rezept${count !== 1 ? 'en' : ''} entfernt. Die Rezepte selbst bleiben erhalten.`
        : `„${tag.name}" wird gelöscht.`;
    const confirmed = await confirm('Tag löschen?', message, 'Löschen');
    if (!confirmed) return;
    const { error } = await deleteTag(tag.id);
    if (error) notify('Fehler', error);
    setEditingTagId(null);
  }

  async function disconnectTodoist() {
    const { error } = await supabase
      .from('households')
      .update({ todoist_api_token: null, todoist_project_id: null })
      .eq('id', household.id);
    if (error) {
      notify('Fehler', error.message);
    } else {
      await onHouseholdChange();
    }
  }

  async function getLastMemberInfo(): Promise<{ isLastMember: boolean; recipeCount: number }> {
    const isLastMember = members.length <= 1;
    let recipeCount = 0;
    if (isLastMember) {
      const { count } = await supabase
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', household.id);
      recipeCount = count ?? 0;
    }
    return { isLastMember, recipeCount };
  }

  async function prepareLeaveOrJoin(type: 'join' | 'leave', code?: string) {
    const info = await getLastMemberInfo();
    setPendingAction({ type, code, ...info });
  }

  function startJoin() {
    const code = joinCode.trim();
    if (!code) return;
    setJoinSheetVisible(false);
    prepareLeaveOrJoin('join', code);
  }

  function startLeave() {
    prepareLeaveOrJoin('leave');
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const { type, code } = pendingAction;
    setPendingAction(null);

    if (type === 'leave') {
      setLeaving(true);
      const { error } = await supabase.rpc('leave_household');
      setLeaving(false);
      if (error) {
        notify('Fehler', error.message);
        return;
      }
      setJoinCode('');
      await onHouseholdSwitched();
      return;
    }

    setJoining(true);
    const { data, error } = await supabase.rpc('join_household', { p_invite_code: code });
    setJoining(false);
    if (error) {
      notify('Fehler', error.message);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.status === 'already_member') {
      notify('Schon dabei', `Du bist bereits Mitglied von „${result.household_name ?? 'diesem Haushalt'}".`);
      return;
    }
    setJoinCode('');
    await onHouseholdSwitched();
  }

  async function startDeleteAccount() {
    const info = await getLastMemberInfo();
    setPendingDelete({ ...info, otherMembers: Math.max(members.length - 1, 0) });
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    const { error } = await supabase.functions.invoke('delete-account');
    setDeleting(false);
    if (error) {
      notify('Fehler beim Löschen', error.message);
      return;
    }
    setPendingDelete(null);
    await supabase.auth.signOut();
  }

  const selectedProject = projects.find((p) => p.id === household.todoist_project_id);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Einstellungen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Haushalt</SectionTitle>
        <Card style={styles.householdCard}>
          <Text style={styles.householdLabel}>Einladungscode</Text>
          <Text style={styles.inviteCode}>{household.invite_code}</Text>
          <PrimaryButton
            label="Teilen"
            variant="accent"
            size="small"
            onPress={shareInviteCode}
            style={styles.teilenButton}
          />

          <View style={styles.householdDivider} />

          {membersLoading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            members.map((m) => (
              <View key={m.userId} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{initialsFor(m.email)}</Text>
                </View>
                <Text style={styles.memberEmail}>{m.email ?? 'Unbekannt'}</Text>
              </View>
            ))
          )}

          <Pressable onPress={regenerateCode} disabled={regenerating} style={styles.regenerateRow}>
            {regenerating ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.regenerateText}>Code neu generieren</Text>
            )}
          </Pressable>

          <View style={styles.householdDivider} />

          <Pressable onPress={() => setJoinSheetVisible(true)} style={styles.switchRow}>
            <Feather name="repeat" size={16} color={colors.onPrimary} />
            <Text style={styles.switchRowText}>Anderem Haushalt beitreten</Text>
          </Pressable>
          <Pressable onPress={startLeave} disabled={leaving} style={styles.switchRow}>
            {leaving ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <>
                <Feather name="log-out" size={16} color={colors.onPrimary} />
                <Text style={styles.switchRowText}>Haushalt verlassen</Text>
              </>
            )}
          </Pressable>
        </Card>

        <SectionTitle>Grundzutaten</SectionTitle>
        <Card style={styles.whiteCard}>
          <Text style={styles.hint}>
            Diese Zutaten werden in der Einkaufsliste separat angezeigt.
          </Text>
          <View style={styles.chipsRow}>
            {household.base_ingredients.map((ingredient) => (
              <Chip
                key={ingredient}
                label={ingredient}
                variant="removable"
                onPress={() => removeBaseIngredient(ingredient)}
              />
            ))}
            {!addingIngredient && (
              <Chip label="Hinzufügen" variant="dashed" onPress={() => setAddingIngredient(true)} />
            )}
          </View>
          {addingIngredient && (
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="Neue Grundzutat"
                placeholderTextColor={colors.textMuted}
                value={newIngredient}
                onChangeText={setNewIngredient}
                onSubmitEditing={addBaseIngredient}
                autoFocus
              />
              <Pressable style={styles.confirmButton} onPress={addBaseIngredient}>
                <Feather name="check" size={18} color={colors.onPrimary} />
              </Pressable>
            </View>
          )}
        </Card>

        <SectionTitle>Tags</SectionTitle>
        <Card style={styles.whiteCard}>
          {tagsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            tags.map((tag, index) => (
              <View key={tag.id}>
                {editingTagId === tag.id ? (
                  <View style={[styles.tagRow, index > 0 && styles.rowDivider]}>
                    <TextInput
                      style={styles.tagEditInput}
                      value={editingTagName}
                      onChangeText={setEditingTagName}
                      onSubmitEditing={saveRenameTag}
                      autoFocus
                    />
                    <Pressable onPress={saveRenameTag} hitSlop={8}>
                      <Feather name="check" size={18} color={colors.quantity} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTag(tag)} hitSlop={8}>
                      <Feather name="trash-2" size={18} color={colors.danger} />
                    </Pressable>
                    <Pressable onPress={() => setEditingTagId(null)} hitSlop={8}>
                      <Feather name="x" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.tagRow, index > 0 && styles.rowDivider]}
                    onPress={() => startRenameTag(tag)}
                  >
                    <Text style={styles.tagName}>{tag.name}</Text>
                    <Text style={styles.tagCount}>
                      {tagCounts[tag.id] ?? 0} Rezept{(tagCounts[tag.id] ?? 0) !== 1 ? 'e' : ''}
                    </Text>
                    <Feather name="chevron-right" size={18} color={colors.textSubtle} />
                  </Pressable>
                )}
              </View>
            ))
          )}

          {addingTag ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="Neuer Tag"
                placeholderTextColor={colors.textMuted}
                value={newTagName}
                onChangeText={setNewTagName}
                onSubmitEditing={handleAddTag}
                autoFocus
              />
              <Pressable style={styles.confirmButton} onPress={handleAddTag}>
                <Feather name="check" size={18} color={colors.onPrimary} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addTagRow} onPress={() => setAddingTag(true)}>
              <Feather name="plus" size={16} color={colors.quantity} />
              <Text style={styles.addTagText}>Neuer Tag</Text>
            </Pressable>
          )}
        </Card>

        <SectionTitle>Todoist</SectionTitle>
        <Card style={styles.whiteCard}>
          <View style={styles.todoistRow}>
            <Text style={styles.todoistLabel}>Verbindung</Text>
            {household.todoist_api_token ? (
              <View style={styles.successBadge}>
                <Text style={styles.successBadgeText}>Verbunden</Text>
              </View>
            ) : (
              <Text style={styles.value}>Nicht verbunden</Text>
            )}
          </View>

          {household.todoist_api_token ? (
            <>
              <View style={[styles.todoistRow, styles.rowDivider]}>
                <Text style={styles.todoistLabel}>Zielprojekt</Text>
                {projectsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.value}>{selectedProject?.name ?? 'Keine Auswahl'}</Text>
                )}
              </View>
              {!projectsLoading && projects.length > 0 && (
                <View style={styles.chipsRow}>
                  {projects.map((project) => (
                    <Chip
                      key={project.id}
                      label={project.name}
                      variant="filter"
                      active={project.id === household.todoist_project_id}
                      onPress={() => selectProject(project.id)}
                    />
                  ))}
                  {selectingProjectId && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
              )}
              <Pressable onPress={disconnectTodoist} style={styles.dangerRow}>
                <Text style={styles.dangerText}>Trennen</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                API-Token in Todoist unter Einstellungen → Integrationen → Entwickler finden und
                hier einfügen.
              </Text>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Todoist API-Token"
                  placeholderTextColor={colors.textMuted}
                  value={todoistToken}
                  onChangeText={setTodoistToken}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Pressable
                  style={styles.confirmButton}
                  onPress={connectTodoist}
                  disabled={connectingTodoist}
                >
                  {connectingTodoist ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Feather name="check" size={18} color={colors.onPrimary} />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Card>

        <SectionTitle>Account</SectionTitle>
        <Card style={styles.whiteCard}>
          <Text style={styles.hint}>Angemeldet als</Text>
          <Text style={styles.value}>{email ?? '…'}</Text>
          <Pressable onPress={() => supabase.auth.signOut()} style={styles.dangerRow}>
            <Text style={styles.dangerText}>Abmelden</Text>
          </Pressable>
          <Pressable onPress={startDeleteAccount} style={styles.dangerRow}>
            <Text style={styles.dangerText}>Account löschen</Text>
          </Pressable>
        </Card>
      </ScrollView>

      <Modal
        visible={joinSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinSheetVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setJoinSheetVisible(false)} />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Anderem Haushalt beitreten</Text>
              <Pressable onPress={() => setJoinSheetVisible(false)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={[styles.hint, { paddingHorizontal: spacing.screenPadding }]}>
              Du verlässt deinen aktuellen Haushalt und wechselst in den neuen. Eigene Rezepte
              werden nicht übernommen.
            </Text>
            <View style={styles.sheetForm}>
              <TextInput
                style={styles.input}
                placeholder="Einladungscode"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                value={joinCode}
                onChangeText={setJoinCode}
                onSubmitEditing={startJoin}
              />
              <PrimaryButton label="Beitreten" onPress={startJoin} disabled={joining} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={pendingAction !== null}
        title={pendingAction?.type === 'leave' ? 'Haushalt verlassen?' : 'Haushalt wechseln?'}
        message={
          pendingAction?.isLastMember
            ? `Du bist das letzte Mitglied. Dein Haushalt und ${pendingAction.recipeCount} Rezept${pendingAction.recipeCount !== 1 ? 'e' : ''} werden endgültig gelöscht.`
            : pendingAction?.type === 'leave'
              ? 'Du bekommst einen neuen, leeren Haushalt. Deine Rezepte bleiben im alten Haushalt für die anderen Mitglieder erhalten.'
              : 'Du verlässt deinen aktuellen Haushalt und trittst dem neuen bei. Eigene Rezepte werden nicht übernommen.'
        }
        confirmLabel={pendingAction?.type === 'leave' ? 'Verlassen' : 'Beitreten'}
        destructive={pendingAction?.isLastMember ?? false}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Account löschen?"
        message={
          pendingDelete?.isLastMember
            ? `Du bist das letzte Mitglied. Dein Haushalt und ${pendingDelete.recipeCount} Rezept${pendingDelete.recipeCount !== 1 ? 'e' : ''} werden zusammen mit deinem Account endgültig gelöscht.`
            : `Dein Account wird gelöscht. Rezepte und Plan bleiben für die anderen ${pendingDelete?.otherMembers} Mitglied${pendingDelete?.otherMembers !== 1 ? 'er' : ''} erhalten.`
        }
        confirmLabel="Account löschen"
        destructive
        requireTypedWord={pendingDelete?.isLastMember ? 'löschen' : undefined}
        loading={deleting}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: fontSizes.screenTitle,
    color: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl * 2,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sectionTitle,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  whiteCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  householdCard: {
    backgroundColor: colors.primary,
    padding: spacing.md,
  },
  householdLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: '#CFE0C3',
    marginBottom: spacing.xs,
  },
  inviteCode: {
    fontFamily: fonts.bodyBold,
    fontSize: 26,
    color: colors.accent,
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  teilenButton: {
    alignSelf: 'flex-start',
  },
  householdDivider: {
    height: 1,
    backgroundColor: 'rgba(255,248,236,0.18)',
    marginVertical: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  memberEmail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.onPrimary,
  },
  regenerateRow: {
    marginTop: spacing.md,
  },
  regenerateText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.meta,
    color: colors.accent,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
  },
  switchRowText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.onPrimary,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  value: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
  },
  chipsRow: {
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
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tagName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
  },
  tagCount: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.textSubtle,
  },
  tagEditInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.text,
    padding: 0,
  },
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  addTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.quantity,
  },
  todoistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  todoistLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodySmall,
    color: colors.textMuted,
  },
  successBadge: {
    backgroundColor: colors.success,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  successBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.meta,
    color: colors.primary,
  },
  dangerRow: {
    marginTop: spacing.md,
  },
  dangerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.bodySmall,
    color: colors.danger,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,77,58,0.4)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.primary,
  },
  sheetForm: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
});
