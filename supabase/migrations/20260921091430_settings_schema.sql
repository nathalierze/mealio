-- Grundzutaten pro Haushalt editierbar (ersetzt die bisher hart codierte
-- Konstante in ShoppingListScreen.tsx).
alter table households add column base_ingredients text[] not null default
  array['salz', 'pfeffer', 'zucker', 'öl', 'essig', 'wasser', 'brühe'];

-- Haushalte dürfen von ihren eigenen Mitgliedern bearbeitet werden
-- (z.B. base_ingredients). invite_code-Änderungen laufen trotzdem über
-- regenerate_invite_code(), aber ein direktes Update schadet nicht, da es
-- ohnehin auf den eigenen Haushalt beschränkt ist.
create policy "households: update own" on households
  for update using (id = current_household_id())
  with check (id = current_household_id());

-- ─── PROFILES ────────────────────────────────────────────────────────────
-- Öffentliche (RLS-geschützte) Spiegelung von auth.users, damit
-- Haushaltsmitglieder die E-Mail-Adressen der anderen Mitglieder sehen
-- können (auth.users selbst ist nicht per RLS erreichbar).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: select same household" on profiles
  for select using (
    id in (select user_id from household_members where household_id = current_household_id())
  );

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill für Nutzer, die sich vor diesem Trigger registriert haben.
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ─── EINLADUNGSCODE NEU GENERIEREN ───────────────────────────────────────
create or replace function regenerate_invite_code()
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_household households;
begin
  select household_id into v_household_id from household_members where user_id = auth.uid();
  if v_household_id is null then
    raise exception 'Kein Haushalt gefunden';
  end if;

  update households set invite_code = generate_invite_code() where id = v_household_id
  returning * into v_household;

  return v_household;
end;
$$;

revoke all on function regenerate_invite_code() from public;
grant execute on function regenerate_invite_code() to authenticated;
