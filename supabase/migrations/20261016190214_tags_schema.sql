-- Tags als haushaltsweite, verwaltbare Liste statt freier Text-Strings
-- pro Rezept. recipes.tags (Typ: json) bleibt bestehen, wird aber ab
-- sofort nicht mehr aktiv beschrieben (gleiches Prinzip wie bei
-- recipes.ingredients / recipe_ingredients).

create table tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Verhindert Dubletten unabhängig von Groß-/Kleinschreibung, pro Haushalt.
create unique index tags_household_lower_name_idx on tags (household_id, lower(name));

create table recipe_tags (
  recipe_id bigint not null references recipes(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

alter table tags enable row level security;
alter table recipe_tags enable row level security;

create policy "tags: select own household" on tags
  for select using (household_id = current_household_id());
create policy "tags: insert own household" on tags
  for insert with check (household_id = current_household_id());
create policy "tags: update own household" on tags
  for update using (household_id = current_household_id())
  with check (household_id = current_household_id());
create policy "tags: delete own household" on tags
  for delete using (household_id = current_household_id());

create policy "recipe_tags: select via recipe" on recipe_tags
  for select using (
    exists (select 1 from recipes r where r.id = recipe_tags.recipe_id and r.household_id = current_household_id())
  );
create policy "recipe_tags: insert via recipe" on recipe_tags
  for insert with check (
    exists (select 1 from recipes r where r.id = recipe_tags.recipe_id and r.household_id = current_household_id())
  );
create policy "recipe_tags: delete via recipe" on recipe_tags
  for delete using (
    exists (select 1 from recipes r where r.id = recipe_tags.recipe_id and r.household_id = current_household_id())
  );

-- ─── DATENMIGRATION: bestehende Tag-Strings übernehmen ──────────────────
-- recipes.tags ist vom Typ "json" (nicht jsonb) - json_array_elements_text
-- statt jsonb_array_elements_text verwenden.
do $$
declare
  rec record;
  tag_name text;
  v_tag_id uuid;
begin
  for rec in select id, household_id, tags from recipes where tags is not null loop
    for tag_name in select json_array_elements_text(rec.tags) loop
      if trim(tag_name) = '' then
        continue;
      end if;

      select id into v_tag_id from tags
        where household_id = rec.household_id and lower(name) = lower(trim(tag_name));

      if v_tag_id is null then
        insert into tags (household_id, name) values (rec.household_id, trim(tag_name))
        returning id into v_tag_id;
      end if;

      insert into recipe_tags (recipe_id, tag_id) values (rec.id, v_tag_id)
      on conflict do nothing;
    end loop;
  end loop;
end $$;
