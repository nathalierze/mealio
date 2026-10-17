-- Haushalt-Konzept: mehrere Nutzer teilen sich Rezepte, Wochenplan und Einkaufsliste.
-- Siehe CLAUDE.md, Abschnitt "Haushalt-Konzept & Datenmodell-Entscheidungen".

-- ─── HOUSEHOLDS ──────────────────────────────────────────────────────────
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- ─── HOUSEHOLD MEMBERS ───────────────────────────────────────────────────
-- Ein Nutzer gehört genau einem Haushalt an (unique auf user_id).
-- Mehrere Haushalte pro Nutzer / Haushaltswechsel sind ein Later-Feature.
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create index household_members_household_id_idx on household_members(household_id);

-- ─── HELPER: aktueller Haushalt des eingeloggten Nutzers ────────────────
-- security definer, damit die Funktion in RLS-Policies verwendet werden kann,
-- ohne dass die RLS-Policy von household_members sich selbst rekursiv aufruft.
create or replace function current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid();
$$;

revoke all on function current_household_id() from public;
grant execute on function current_household_id() to authenticated;

-- ─── LOGIN-LOGIK: Haushalt beitreten oder neu anlegen ───────────────────
-- Ohne invite_code: legt neuen Haushalt mit generiertem Code an.
-- Mit gültigem invite_code: tritt bestehendem Haushalt bei.
-- Idempotent: ist der Nutzer schon Mitglied eines Haushalts, wird dieser zurückgegeben.
create or replace function generate_invite_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

create or replace function join_or_create_household(p_invite_code text default null)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
  v_existing_household_id uuid;
begin
  select household_id into v_existing_household_id
  from household_members where user_id = auth.uid();

  if v_existing_household_id is not null then
    select * into v_household from households where id = v_existing_household_id;
    return v_household;
  end if;

  if p_invite_code is not null and trim(p_invite_code) <> '' then
    select * into v_household from households where invite_code = upper(trim(p_invite_code));
    if not found then
      raise exception 'Ungültiger Einladungscode';
    end if;
  else
    insert into households (invite_code) values (generate_invite_code())
    returning * into v_household;
  end if;

  insert into household_members (household_id, user_id) values (v_household.id, auth.uid());
  return v_household;
end;
$$;

revoke all on function join_or_create_household(text) from public;
grant execute on function join_or_create_household(text) to authenticated;

-- ─── RECIPES: household_id ergänzen ──────────────────────────────────────
-- Nullable, da bestehende Rezepte noch keinem Haushalt zugeordnet sind.
-- Backfill auf die echten Haushalte der beiden aktuellen Nutzer ist ein
-- manueller Folgeschritt, sobald deren Accounts existieren (siehe CLAUDE.md).
alter table recipes add column household_id uuid references households(id) on delete cascade;
create index recipes_household_id_idx on recipes(household_id);

-- ─── RECIPE_INGREDIENTS: strukturierte Zutaten ──────────────────────────
-- Ersetzt den bisherigen recipes.ingredients Freitext-Array für NEUE Rezepte.
-- Die alte Spalte recipes.ingredients bleibt vorerst erhalten (bestehende
-- Daten), da ein automatisches Parsen von Freitext ("200g Pasta") in
-- menge/einheit/name nicht zuverlässig genug ist, um es blind zu migrieren.
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id bigint not null references recipes(id) on delete cascade,
  menge numeric check (menge is null or menge >= 0),
  einheit text,
  name text not null,
  sort_order integer not null default 0
);

create index recipe_ingredients_recipe_id_idx on recipe_ingredients(recipe_id);

-- ─── WEEKLY_PLAN ─────────────────────────────────────────────────────────
create table weekly_plan (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipe_id bigint not null references recipes(id) on delete cascade,
  week_identifier text not null,
  added_at timestamptz not null default now(),
  unique (household_id, recipe_id, week_identifier)
);

create index weekly_plan_household_week_idx on weekly_plan(household_id, week_identifier);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────
alter table households enable row level security;
alter table household_members enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table weekly_plan enable row level security;

-- households: nur der eigene Haushalt ist sichtbar. Anlage/Beitritt läuft
-- ausschließlich über join_or_create_household() (security definer),
-- daher keine direkten insert/update/delete Policies für Nutzer.
create policy "households: select own" on households
  for select using (id = current_household_id());

-- household_members: Mitglieder sehen alle Mitglieder ihres Haushalts.
create policy "household_members: select own household" on household_members
  for select using (household_id = current_household_id());

-- recipes: strikt pro Haushalt.
create policy "recipes: select own household" on recipes
  for select using (household_id = current_household_id());
create policy "recipes: insert own household" on recipes
  for insert with check (household_id = current_household_id());
create policy "recipes: update own household" on recipes
  for update using (household_id = current_household_id())
  with check (household_id = current_household_id());
create policy "recipes: delete own household" on recipes
  for delete using (household_id = current_household_id());

-- recipe_ingredients: Zugriff über das zugehörige Rezept geprüft.
create policy "recipe_ingredients: select via recipe" on recipe_ingredients
  for select using (
    exists (select 1 from recipes r where r.id = recipe_ingredients.recipe_id and r.household_id = current_household_id())
  );
create policy "recipe_ingredients: insert via recipe" on recipe_ingredients
  for insert with check (
    exists (select 1 from recipes r where r.id = recipe_ingredients.recipe_id and r.household_id = current_household_id())
  );
create policy "recipe_ingredients: update via recipe" on recipe_ingredients
  for update using (
    exists (select 1 from recipes r where r.id = recipe_ingredients.recipe_id and r.household_id = current_household_id())
  );
create policy "recipe_ingredients: delete via recipe" on recipe_ingredients
  for delete using (
    exists (select 1 from recipes r where r.id = recipe_ingredients.recipe_id and r.household_id = current_household_id())
  );

-- weekly_plan: strikt pro Haushalt.
create policy "weekly_plan: select own household" on weekly_plan
  for select using (household_id = current_household_id());
create policy "weekly_plan: insert own household" on weekly_plan
  for insert with check (household_id = current_household_id());
create policy "weekly_plan: update own household" on weekly_plan
  for update using (household_id = current_household_id())
  with check (household_id = current_household_id());
create policy "weekly_plan: delete own household" on weekly_plan
  for delete using (household_id = current_household_id());
