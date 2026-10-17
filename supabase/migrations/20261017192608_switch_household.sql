-- Haushalt nachträglich wechseln: ein Nutzer gehört immer zu genau einem
-- Haushalt. Beitritt zu einem anderen Haushalt oder Verlassen ohne neuen
-- Code läuft ausschließlich über die beiden RPCs unten (join_household /
-- leave_household), nie durch direkte Inserts/Deletes vom Client.
--
-- Alle household_id-/recipe_id-Fremdschlüssel haben bereits "on delete
-- cascade" (household_members, recipes, weekly_plan, tags -> recipe_tags,
-- shopping_list_checked_items, recipe_ingredients) - ein simples
-- "delete from households" räumt über die Kaskaden automatisch alles auf.
-- Keine Storage-Bereinigung nötig: Rezeptbilder sind externe URLs, es gibt
-- kein Supabase Storage in diesem Projekt.

-- ─── RATE LIMIT für Beitritts-Versuche ──────────────────────────────────
-- Nur echte Fehlversuche (ungültiger Code) werden gezählt, kein Client-
-- Zugriff (RLS aktiv, aber keine Policies) - nur security-definer-Funktionen
-- können hier schreiben/lesen.
create table household_join_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index household_join_attempts_user_time_idx
  on household_join_attempts (user_id, attempted_at);

alter table household_join_attempts enable row level security;

-- ─── INTERNE KERNLOGIK: Mitgliedschaft entfernen + ggf. Haushalt löschen ──
-- Nicht an "authenticated" vergeben - per RPC nicht direkt aufrufbar, nur
-- von anderen security-definer-Funktionen nutzbar. Später auch für die
-- Account-Löschung wiederverwendbar.
create or replace function remove_member_and_cleanup(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_remaining_members int;
begin
  select household_id into v_household_id
  from household_members where user_id = p_user_id;

  if v_household_id is null then
    return;
  end if;

  delete from household_members where user_id = p_user_id;

  select count(*) into v_remaining_members
  from household_members where household_id = v_household_id;

  if v_remaining_members = 0 then
    delete from households where id = v_household_id;
  end if;
end;
$$;

revoke all on function remove_member_and_cleanup(uuid) from public;

-- ─── HAUSHALT VERLASSEN (ohne neuen Code) ───────────────────────────────
-- Legt sofort einen neuen, leeren Haushalt für den Nutzer an (wie beim
-- ersten Login ohne Einladungscode). Keine Übernahme von Rezepten.
create or replace function leave_household()
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
begin
  perform remove_member_and_cleanup(auth.uid());

  insert into households (invite_code) values (generate_invite_code())
  returning * into v_household;

  insert into household_members (household_id, user_id) values (v_household.id, auth.uid());

  return v_household;
end;
$$;

revoke all on function leave_household() from public;
grant execute on function leave_household() to authenticated;

-- ─── ANDEREM HAUSHALT BEITRETEN ──────────────────────────────────────────
-- Prüft den Code serverseitig, verlässt den alten Haushalt (inkl. Cleanup)
-- und tritt dem neuen bei - alles in einer Funktion, also einer Transaktion.
-- status = 'already_member': Nutzer ist bereits in diesem Haushalt, kein
-- Fehler, keine Löschung. status = 'joined': erfolgreich gewechselt.
create or replace function join_household(p_invite_code text)
returns table (status text, household_id uuid, household_name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_code text;
  v_current_household_id uuid;
  v_target households;
  v_recent_failures int;
begin
  v_normalized_code := upper(trim(p_invite_code));
  if v_normalized_code = '' then
    raise exception 'Bitte einen Code eingeben.';
  end if;

  select count(*) into v_recent_failures
  from household_join_attempts
  where user_id = auth.uid() and attempted_at > now() - interval '15 minutes';

  if v_recent_failures >= 5 then
    raise exception 'Zu viele Versuche. Bitte warte 15 Minuten und versuch es erneut.';
  end if;

  select hm.household_id into v_current_household_id
  from household_members hm where hm.user_id = auth.uid();

  select * into v_target from households h where h.invite_code = v_normalized_code;

  if not found then
    insert into household_join_attempts (user_id) values (auth.uid());
    raise exception 'Ungültiger Einladungscode.';
  end if;

  if v_target.id = v_current_household_id then
    return query select 'already_member'::text, v_target.id, v_target.name, v_target.invite_code;
    return;
  end if;

  perform remove_member_and_cleanup(auth.uid());
  insert into household_members (household_id, user_id) values (v_target.id, auth.uid());

  return query select 'joined'::text, v_target.id, v_target.name, v_target.invite_code;
end;
$$;

revoke all on function join_household(text) from public;
grant execute on function join_household(text) to authenticated;
