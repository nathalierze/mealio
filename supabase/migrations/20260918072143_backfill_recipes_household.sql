-- Bestehende Rezepte (aus der Zeit vor dem Haushalt-Konzept) dem ersten
-- echten Haushalt zuordnen, damit sie für die Nutzer wieder sichtbar sind.
update recipes
set household_id = (select id from households where invite_code = '5E3DEE')
where household_id is null;

-- Ab jetzt hat jedes neue Rezept zwingend einen Haushalt.
alter table recipes alter column household_id set not null;
