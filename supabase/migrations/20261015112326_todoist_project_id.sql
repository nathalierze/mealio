-- Welches Todoist-Projekt die Einkaufsliste bekommt (statt immer im
-- "Eingang" zu landen). Liegt wie der Token pro Haushalt, nicht global.
alter table households add column todoist_project_id text;
