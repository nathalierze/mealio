-- Datenbereinigung (kein Schema-Change): Rezepte, die gekocht, aber nie an
-- die Einkaufsliste gesendet wurden, blieben bisher dauerhaft in
-- pendingShoppingEntries stehen (vor dem rollierenden Wochenplan hatte
-- week_identifier das implizit begrenzt). Die Lade-Logik ist bereits auf
-- "cooked_at IS NULL" umgestellt (siehe useWeeklyPlan.ts) - dieser Schritt
-- markiert die betroffenen Alt-Zeilen rückwirkend als abgeschlossen, damit
-- sie nicht mehr in neue Einkaufslisten einfließen. Nichts wird gelöscht.
update weekly_plan
set shopping_list_sent_at = cooked_at
where cooked_at is not null and shopping_list_sent_at is null;
