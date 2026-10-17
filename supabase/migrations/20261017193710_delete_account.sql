-- Account löschen (Edge Function "delete-account", einzige Stelle mit dem
-- service_role-Key). Statt die Haushalts-Aufräum-Logik als separaten RPC-
-- Schritt vor auth.admin.deleteUser() auszuführen (zwei getrennte Schritte,
-- Halb-Zustand bei Fehler zwischen beiden möglich), wird sie hier als
-- Trigger auf household_members verlegt: household_members.user_id hat
-- bereits "on delete cascade" auf auth.users, die Kaskade beim Löschen des
-- Auth-Users löst also automatisch diesen Trigger aus - innerhalb derselben
-- Transaktion wie das Löschen des Users selbst. Entweder committet alles
-- zusammen, oder nichts. Gilt gleichermaßen für Verlassen/Beitreten
-- (remove_member_and_cleanup) und für Account-Löschung (Kaskade).

create or replace function cleanup_empty_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from household_members where household_id = old.household_id) then
    delete from households where id = old.household_id;
  end if;
  return old;
end;
$$;

create trigger household_members_cleanup_empty
  after delete on household_members
  for each row
  execute function cleanup_empty_household();

-- remove_member_and_cleanup() vereinfacht: löscht nur noch die Mitgliedschaft,
-- der Trigger oben übernimmt das "Haushalt löschen, wenn leer" - keine
-- doppelte Logik mehr zwischen RPC-Pfad und Kaskaden-Pfad.
create or replace function remove_member_and_cleanup(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from household_members where user_id = p_user_id;
end;
$$;
