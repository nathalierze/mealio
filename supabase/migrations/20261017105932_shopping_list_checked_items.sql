-- Abhak-Status der Einkaufsliste, pro Haushalt gespeichert und für alle
-- Mitglieder sichtbar. Die Einkaufsliste selbst ist kein Snapshot (wird bei
-- jedem Öffnen frisch aus dem Wochenplan berechnet) - item_key ist deshalb
-- der Name der Zutat, nicht eine feste Zeilen-ID. Eine Zeile pro abgehaktem
-- Item (statt einer JSON-Spalte auf households) vermeidet verlorene Updates
-- bei gleichzeitigem Abhaken durch mehrere Haushaltsmitglieder.

create table shopping_list_checked_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_key text not null,
  checked_at timestamptz not null default now()
);

create unique index shopping_list_checked_items_household_key_idx
  on shopping_list_checked_items (household_id, item_key);

alter table shopping_list_checked_items enable row level security;

create policy "shopping_list_checked_items: select own household" on shopping_list_checked_items
  for select using (household_id = current_household_id());
create policy "shopping_list_checked_items: insert own household" on shopping_list_checked_items
  for insert with check (household_id = current_household_id());
create policy "shopping_list_checked_items: delete own household" on shopping_list_checked_items
  for delete using (household_id = current_household_id());
