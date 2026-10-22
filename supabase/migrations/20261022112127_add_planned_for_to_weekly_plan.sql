-- Wochenplan nach Tagen: Plan-Einträge können optional einem Datum
-- zugeordnet werden (NULL = "ohne Tag"). Rollierendes 7-Tage-Fenster ab
-- heute, kein Kalenderwochen-Bezug - siehe CLAUDE.md/DESIGN.md.
alter table weekly_plan add column planned_for date;

-- Der alte Unique-Constraint (ein Rezept max. einmal pro Kalenderwoche)
-- passt nicht mehr: unter dem neuen Modell kann ein Rezept legitim mehrfach
-- in derselben Woche eingeplant werden (an verschiedenen Tagen), auch nach
-- einem bereits abgeschlossenen (gekocht + gesendet) Eintrag in derselben
-- week_identifier-Woche. Die App-Logik verhindert bereits ungewollte
-- Duplikate (aktiver Eintrag pro Rezept) - eine DB-Sperre ist dafür nicht
-- mehr nötig. week_identifier bleibt als Spalte bestehen (weiterhin beim
-- Insert befüllt), wird aber ab jetzt nirgends mehr zum Filtern benutzt.
alter table weekly_plan drop constraint weekly_plan_household_id_recipe_id_week_identifier_key;
