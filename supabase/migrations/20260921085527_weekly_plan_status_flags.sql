-- "Gekocht"-Markierung: Rezept verschwindet aus dem aktiven Wochenplan,
-- ohne den Datensatz zu löschen.
alter table weekly_plan add column cooked_at timestamptz;

-- Einkaufslisten-Status pro Rezept: sobald gesetzt, taucht dieses Rezept
-- bei künftigen Listen-Generierungen nicht mehr auf. Unabhängig von
-- cooked_at (siehe CLAUDE.md, Abschnitt "Einkaufsliste & Wochenplan").
alter table weekly_plan add column shopping_list_sent_at timestamptz;
