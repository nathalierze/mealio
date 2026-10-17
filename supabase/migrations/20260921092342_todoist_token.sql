-- Todoist-API-Token pro Haushalt (nicht global), damit jeder Haushalt sein
-- eigenes Todoist-Konto verbinden kann. Zugriff ist bereits durch die
-- bestehende household-RLS auf die eigenen Mitglieder beschränkt.
alter table households add column todoist_api_token text;
