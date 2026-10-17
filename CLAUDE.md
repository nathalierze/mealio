# Mealio – Projektkontext für Claude Code

## ⚠️ Öffentliches Repo – Sicherheitsregeln

- **Dieses Repo ist öffentlich.** Jeder Commit ist für alle sichtbar, auch rückwirkend in der History – ein späteres "Löschen" einer Datei entfernt sie nicht aus vergangenen Commits.
- **Niemals committen:** `.env`-Dateien, API-Keys, der `service_role`-Key, App-Passwörter, Todoist-Tokens, echte E-Mail-Adressen, Einladungscodes oder andere personenbezogene Daten.
- **Secrets gehören ausschließlich** in Supabase Secrets (Edge Functions) oder Netlify-Umgebungsvariablen – nie in Code oder Migrationen.
- **Nur `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` dürfen im Frontend vorkommen** (bewusst öffentlicher, RLS-geschützter Anon-Key – alles andere bleibt serverseitig in Edge Functions).
- **Vor jedem Commit prüfen**, ob neue Dateien sensible Inhalte enthalten. Im Zweifel nachfragen, nicht raten.
- **GitHub Push Protection ist aktiv.** Wird ein Push blockiert, niemals umgehen (kein `--no-verify`, kein Force-Push zum Durchdrücken) – stattdessen das Secret aus der Datei entfernen und die Nutzerin informieren.

## Was das Projekt ist

Eine Meal-Planner-App, die Mental Load bei der Essensplanung reduziert: eigene Rezepte (Heavy Rotation) auswählen → Wochenplan zusammenstellen → Einkaufsliste automatisch fertig.

**Ziel (Stand jetzt):** Privater Gebrauch für 2 Personen als ersten Schritt, bereitgestellt als Web-App, die per „Zum Home-Bildschirm" auf dem iPhone wie eine App genutzt wird. Kein App-Store-Release vorerst.

**Später möglich (kein separater Branch, dieselbe Codebasis):** Eine kommerzielle Version mit echtem App-Store-Release (iOS + Android) soll jederzeit aus genau diesem Code heraus möglich sein, ohne Neuentwicklung. Store-spezifische Punkte (Google Play Console, Branding/App-Icon-Feinschliff, Monetarisierung) sind deshalb bewusst auf „später" verschoben, nicht gestrichen.

**Wichtige Regel:** Keine Lösungen bauen, die nur im Browser funktionieren (z.B. direkte `window`/`localStorage`-Zugriffe ohne Abstraktion). Jede Plattform-spezifische Logik läuft über eine gemeinsame Abstraktion (z.B. `lib/alert.ts`, `lib/share.ts`), die je nach `Platform.OS` verzweigt. Die App muss dadurch jederzeit auch in Expo Go auf iOS/Android lauffähig bleiben, nicht nur im Browser.

## Status

Der alte HTML/JS/CSS-Web-Prototyp wurde vollständig durch die React-Native/Expo-App in `/app` ersetzt und existiert in diesem Repo nicht mehr (Referenz dazu nur noch im separaten, privat archivierten Alt-Repo). Entwickelt wird direkt auf `main`, kein separater Migrations-Branch mehr.

**Aktueller Implementierungsstand (Ende Session, siehe Commits in `/app`):**
- ✅ Expo-Projekt (TypeScript) + Supabase JS Client + Env-Setup
- ✅ Haushalt-Datenmodell + RLS (siehe unten), bestehende Rezepte zurückmigriert
- ✅ Login: E-Mail-Code (OTP) über Custom SMTP, getestet auf Expo Web + Expo Go (iPhone)
- ✅ Haushalts-Onboarding (Einladungscode eingeben/neu anlegen)
- ✅ Rezeptliste (Kachel-Grid, haushaltsgefiltert via RLS), Lade-/Leer-Zustand
- ✅ Rezept-Detail-Screen (Bild, Tags, Meta, Zutaten, Link zum Original)
- ✅ Rezept hinzufügen: Manuell, Text und URL (via `extract-recipe` Edge Function + Spoonacular) fertig, deployed und getestet
- ✅ Rezept bearbeiten (vorausgefülltes Formular) und löschen (mit Bestätigungsdialog), direkt im Detail-Screen
- ✅ Tags-Filter-Leiste über der Rezeptliste (horizontale Chips: "Alle" + alle im Haushalt vorkommenden Tags)
- ✅ Wochenplan-Screen: haushaltsweiter Plan (aktuelle ISO-Kalenderwoche via `weekly_plan`), eigener Tab mit Anzahl-Badge
- ✅ "Gekocht"-Markierung im Wochenplan: dedizierter Button + Animation (Stempel-Overlay, Scale, Ausblenden), setzt `weekly_plan.cooked_at`, Rezept verschwindet aus dem aktiven Plan ohne Datensatzverlust
- ✅ Einkaufsliste: zwei Bereiche (normale Liste + separat abhakbare "Grundzutaten", pro Woche in die Hauptliste verschiebbar), wird live aus dem aktuellen Wochenplan berechnet (kein Snapshot). "An Todoist senden" mit Bestätigungsdialog erstellt echte Todoist-Tasks (via `send-to-todoist` Edge Function), markiert danach enthaltene Rezepte über `weekly_plan.shopping_list_sent_at` (unabhängig von `cooked_at`) und leert die Liste. Schlägt der Versand fehl (kein/ungültiger Token), bleibt die Liste unverändert und zeigt die Fehlermeldung
- ✅ Fix: Rezeptlisten-Badge zeigte gekochte Rezepte fälschlich als "aktiv im Plan" – basiert jetzt korrekt nur auf nicht-gekochten Zeilen; erneutes Antippen holt ein gekochtes Rezept zurück in den aktiven Plan statt einen doppelten Eintrag zu versuchen
- ✅ Navigations-Umbau: Segmented Control oben (Rezepte/Plan/Einkaufsliste, flaches Design wie im Web-Prototyp), Bottom-Nav auf "Hinzufügen"/"Einstellungen" reduziert. Neuer Einstellungen-Screen (Haushalt inkl. Mitgliederliste + Code-Teilen/-Neugenerieren, editierbare Grundzutaten, Einkaufsliste-verbinden, Account/Logout ganz unten). Neue `profiles`-Tabelle + `auth.users`-Trigger für Mitglieder-E-Mails, `households.base_ingredients`, `regenerate_invite_code()`-Funktion
- ✅ Todoist-Verbindung ist pro Haushalt, nicht global: `households.todoist_api_token` statt eines Supabase-Secrets, da jeder Haushalt sein eigenes Todoist-Konto verbinden soll (Nutzer trägt seinen persönlichen Todoist-API-Token direkt in den Einstellungen ein, kein OAuth-Flow/App-Registrierung bei Todoist nötig). Die `send-to-todoist` Edge Function läuft mit `auth: "user"` (RLS-gescopter Client), liest den Token des aufrufenden Haushalts und legt pro Einkaufslisten-Position einen Todoist-Task an. **Wichtig:** Todoist hat die REST-v2-API (`/rest/v2/tasks`) abgeschaltet (liefert `410 Gone`) und zur einheitlichen `/api/v1/`-API zusammengeführt – die Function nutzt `https://api.todoist.com/api/v1/tasks`, Request-Format ist identisch geblieben
- ✅ Todoist-Projektauswahl: `households.todoist_project_id` speichert, welches Todoist-Projekt die Tasks bekommt (sonst landen sie im "Eingang"). Neue `list-todoist-projects` Edge Function lädt die Projektliste zur Auswahl in den Einstellungen. `send-to-todoist` schickt `project_id` mit und validiert serverseitig, dass eins gesetzt ist; `ShoppingListScreen` prüft das schon vorher client-seitig (über `notify()` aus `lib/alert.ts`, nicht `Alert.alert` direkt)

- ✅ Intelligente Zutaten-Aggregation via Claude API (`aggregate-shopping-list` Edge Function, Modell `claude-haiku-4-5-20251001`): Claude übernimmt nur noch das Sprachverständnis (Zeile in menge/einheit/name zerlegen, als Grundzutat klassifizieren, ein Aufruf pro Generierung), das eigentliche Summieren über mehrere Rezepte hinweg passiert **deterministisch in Code** (nur wenn Name UND normalisierte Einheit exakt übereinstimmen). **Wichtige Erkenntnis:** Erste Version ließ Claude auch summieren – das führte zu falschen Ergebnissen wie "500g Tomaten" + "2 Tomaten" = "502g Tomaten" (Stückzahl fälschlich als Gramm addiert). LLMs sind für exakte Arithmetik/Einheiten-Vergleiche nicht zuverlässig genug, das muss Code erledigen, nicht das Modell. Fallback auf die alte lokale Text-Gruppierung, falls der Aufruf fehlschlägt (kaputte Einkaufsliste vermeiden)
- ✅ Migration alter Freitext-Zutaten in `recipe_ingredients`: läuft lazy/nebenbei – die `aggregate-shopping-list` Function schreibt die von Claude zerlegten Zutaten (menge/einheit/name) automatisch in `recipe_ingredients`, aber nur für Rezepte, die dort noch keine Zeilen haben. Rezepte migrieren sich also erst, sobald sie Teil einer Einkaufslisten-Generierung waren.
- ✅ **Vollständig abgeschlossen** (zwei manuell reviewte Migrationen, 8 Rezepte, 114 Zeilen): Alle Rezepte haben jetzt Einträge in `recipe_ingredients`, verifiziert per Lücken-Check (0 Rezepte ohne Zeilen). Zerlegungs-Konventionen (mit der Nutzerin abgestimmt): Brüche als Dezimalzahl, Bereiche als Mittelwert, unklare Einheiten ("Spritzer", "Msp") als "Prise", Knoblauch vereinheitlicht auf `einheit=Zehe, name=Knoblauch`, Mengen-Mehrzahl-Zutaten (Linsen, Mandeln, Sprossen) bleiben im Plural, Produkt-Typ-Beschreibungen (griechisch, rot, mittelscharf, getrocknet, Dosen-Variante) bleiben im `name` (kein Notiz-Feld vorhanden), reine Zubereitungs-Verben (gewürfelt, gerieben, aus der Mühle) entfallen. Nicht-kaufbare/mehrdeutige Zeilen (Nudelwasser, Öl-ODER-Ghee-Alternativen) wurden nach Rücksprache vereinfacht oder weggelassen statt geraten.
- **`recipes.ingredients` bleibt die aktive Datenquelle**, wird NICHT als veraltet markiert oder entfernt: Die Einkaufsliste liest weiterhin live daraus (via Claude-Parsing bei jeder Generierung), `recipe_ingredients` wird aktuell von keinem Feature gelesen. Erst wenn ein Feature wirklich aus `recipe_ingredients` liest (z.B. Portionen-Skalierung, aggregationsfreie Einkaufsliste), wird eine Umstellung/Deprecation sinnvoll.

**Wichtige Erkenntnis (API-Key-Format):** Das Supabase-Projekt kennt zwei Key-Formate – den alten JWT-Anon-Key und den neueren `sb_publishable_...`/`sb_secret_...`-Key. Edge Functions, die mit dem `@supabase/server`-Package (`withSupabase`) gebaut sind, akzeptieren **nur** das neue Format. Die App (`app/.env`) läuft deshalb bewusst mit `sb_publishable_...` statt dem JWT-Key – falls der Key mal rotiert wird, muss das neue Format verwendet werden, sonst schlagen alle Edge-Function-Aufrufe mit `INVALID_API_KEY` fehl (REST/Auth funktionieren mit beiden Formaten).

**Noch offen:**
- Zweiter Haushalts-Nutzer (Partner) hat sich noch nicht mit dem Einladungscode angemeldet

## Ziel-Architektur (beschlossen, siehe unten für Details)

```
React Native App (Expo)
  ├─ Screens & State
  └─ Supabase JS Client
        │
        ▼
Supabase Backend
  ├─ Auth (E-Mail / Magic Link)
  ├─ Postgres DB (Rezepte, Pläne, Nutzer)
  ├─ Storage (Rezeptbilder)
  └─ Edge Functions (serverseitige Logik)
        │
        ▼
Externe APIs (NUR von Edge Functions aufgerufen, nie direkt vom Client)
  ├─ Spoonacular (Rezept-Scraping von URL)
  ├─ Claude API (Zutaten intelligent summieren, z.B. 2x 500g → 1kg)
  └─ Todoist (Einkaufsliste als Tasks)
```

**Kernprinzip:** Die App ruft niemals direkt externe APIs auf. Alles läuft über Supabase Edge Functions, damit API-Keys serverseitig bleiben und nicht im Client-Code landen.

## Wichtige Architektur-Entscheidungen (mit Begründung)

| Entscheidung | Wahl | Warum |
|---|---|---|
| Native App vs. PWA | **React Native/Expo**, Code so geschrieben, dass er auch als Web-App läuft | Spätere App-Store-Option bleibt offen, ohne jetzt schon dafür bauen zu müssen |
| Wrapping vs. Neuentwicklung | **Neuentwicklung in React Native** (nicht Capacitor-Wrapper) | Backend ändert sich sowieso; früher Projektstand macht Neustart günstiger; sauberere langfristige Wartbarkeit |
| Backend | **Supabase** (bleibt bestehen) | Relationales Datenmodell passt zu Postgres; gut für KI-gestützte Entwicklung dokumentiert; vorhersehbare Preise gegenüber Firebase |
| n8n-Ersatz | **Supabase Edge Functions** | n8n/Railway komplett abgelöst, keine zusätzliche Hosting-Infrastruktur |
| Auth | **Supabase Auth** (E-Mail/Magic Link) | Ersetzt aktuelles shared Password, macht Multi-User möglich |
| Build/Deploy (jetzt) | **`expo export --platform web` → Netlify** | Schnellster Weg zu einer nutzbaren Homescreen-App für 2 Personen, kein Store-Prozess nötig |
| Build/Deploy (später, bei Store-Release) | **Expo + EAS** | EAS Build/Submit für App Store & Play Store, EAS Update für OTA-Updates – noch nicht aktiv |

## Haushalt-Konzept & Datenmodell-Entscheidungen

- Mehrere Nutzer können sich einem Haushalt anschließen und teilen sich dann Rezepte, Wochenplan und Einkaufsliste.
- Beitritt über Einladungscode: Erster Login ohne Code → neuer Haushalt wird automatisch mit generiertem Code angelegt. Login mit bestehendem Code → Beitritt zu diesem Haushalt statt Neuanlage.
- Rezepte sind pro Haushalt, nicht global – jeder Haushalt sieht nur seine eigenen Rezepte. Geteilte Rezeptvorschläge für alle Haushalte sind ein bewusstes Later-Feature.
- Zutaten werden strukturiert gespeichert (menge, einheit, name) statt als ein Freitext-String – Grundlage für die spätere automatische Aggregation in der Einkaufsliste.
- Bilder bleiben vorerst bei URLs, kein Supabase Storage (explizit vertagt).
- **Ein Nutzer gehört immer zu genau einem Haushalt.** Nachträglicher Wechsel läuft ausschließlich über die RPCs `join_household(p_invite_code)` / `leave_household()` (security definer, ermitteln den Nutzer über `auth.uid()`, nie per Parameter) – nie durch direkte Inserts/Deletes auf `household_members` vom Client. Verlassen ohne neuen Code legt automatisch einen neuen, leeren Haushalt an (wie beim ersten Login). Ist der Nutzer das letzte Mitglied, wird der alte Haushalt komplett gelöscht (alle `household_id`-FKs haben `on delete cascade`, keine Rezept-Übernahme in den neuen Haushalt). Beitritt mit ungültigem Code ist auf 5 Fehlversuche pro 15 Minuten begrenzt (Tabelle `household_join_attempts`, kein Client-Zugriff). Das "Haushalt löschen, wenn leer"-Aufräumen sitzt als Trigger (`cleanup_empty_household`) direkt auf `household_members` (AFTER DELETE), nicht mehr inline in der RPC-Logik – dadurch greift es automatisch bei jedem Weg, der eine Mitgliedschaft entfernt (RPC **und** Kaskade von `auth.users`).
- **Account-Löschung läuft ausschließlich über die Edge Function `delete-account`** (einzige Stelle mit dem `service_role`-Key, nur aus Supabase Secrets, nie im Frontend). `user_id` kommt aus dem geprüften JWT (`ctx.supabase.auth.getUser()`), nie aus dem Request-Body. Ein einziger `auth.admin.deleteUser(user_id)`-Aufruf reicht aus: `household_members.user_id` kaskadiert bereits auf `auth.users`, der Trigger oben räumt einen leer werdenden Haushalt automatisch auf – alles innerhalb derselben Transaktion wie das Löschen des Auth-Users, kein Zwischenzustand möglich.

Schema: `households`, `household_members`, `recipes.household_id`, `recipe_ingredients`, `weekly_plan` – siehe `supabase/migrations/`.

## Einkaufsliste & Wochenplan – Konzept-Entscheidungen

- **Zutaten-Aggregation läuft über die Claude API** (nicht rein regelbasiert), um gleiche/ähnliche Zutaten zu erkennen und Mengen zu summieren (z.B. 2x 500g Mehl → 1kg). Ein API-Aufruf pro Listen-Generierung, nicht pro Zutat einzeln (Kosten-Kontrolle).
- **Einkaufsliste hat zwei Bereiche:** oben die normale abhakbare Liste, unten "Diese Grundzutaten brauchst du" (Salz, Pfeffer, Öl etc.) – separat abhakbar statt komplett rausgefiltert. Die Grundzutaten-Liste ist aktuell hart codiert, soll aber später Teil eines noch zu bauenden Einstellungen-Bereichs werden. Jede Grundzutat hat einen Button, um sie **nur für diese eine Woche** in den oberen Bereich zu verschieben – keine dauerhafte Speicherung, nächste Woche ist sie wieder unten.
- **"Gekocht"-Markierung ist ein bewusster Erfolgsmoment, keine schlichte Checkbox.** Eigenes Symbol (Kochtopf/Teller statt Haken), kurze zufriedenstellende Animation (Stempel-Overlay "Gekocht ✓" + Scale-Effekt), bevor die Karte aus dem Wochenplan verschwindet. Leerer Zustand ("alles gekocht") zeigt eine freundliche Meldung mit Weg zurück zur Rezeptliste.
- **Einkaufsliste ist ein Entwurf, bis sie gesendet wurde – kein persistenter Snapshot davor.** Solange nicht gesendet, wird sie bei jedem Öffnen komplett neu aus dem aktuellen `weekly_plan`-Stand berechnet (kein Subtrahieren/De-Aggregieren einzelner Zutaten bei Änderungen). "An Todoist senden" zeigt vorher einen Bestätigungshinweis ("Liste wird an Todoist gesendet und hier geleert"); danach ist die Liste in der App leer.
- **Status pro Rezept, nicht pro Liste:** Jedes `weekly_plan`-Rezept bekommt ein eigenes Flag "bereits in einer gesendeten Liste enthalten". Kommt nach dem Senden ein neues Rezept zum Plan dazu, zeigt die nächste Listen-Generierung nur die Zutaten der noch nicht gesendeten Rezepte – bereits gesendete tauchen nicht erneut auf, auch wenn sie noch im Plan stehen und nicht "gekocht" sind.
- **"Gekocht" und "in gesendeter Liste enthalten" sind unabhängige Zustände.** Gekocht betrifft nur die Sichtbarkeit im Wochenplan. Der Einkaufslisten-Status betrifft nur, ob Zutaten in einer neuen Listen-Generierung nochmal auftauchen. Ein gekochtes, nie gesendetes Rezept taucht z.B. weiterhin in neuen Listen auf.

Schema-Ergänzungen (geplant): `weekly_plan.cooked_at` (nullable, "gekocht"-Markierung ohne Datensatzverlust), `weekly_plan.shopping_list_sent_at` (nullable, Ausschluss aus künftigen Listen-Generierungen). Keine separate Snapshot-Tabelle nötig, da der Entwurf live berechnet wird.

### Todoist ist optional – die App muss ohne Verbindung voll nutzbar sein

- **Ob ein Haushalt verbunden ist, ergibt sich aus `households.todoist_api_token` (vorhanden/leer)** – keine eigene Flag-Spalte. Eine fehlende Verbindung ist ein normaler Zustand, nirgends ein Fehler oder eine Warnung.
- **Ohne Verbindung:** Bottom-Bar-Button heißt "Einkauf abschließen" (`primary`, gleicher Stil wie andere Primär-Buttons, kein Send-Icon) statt "An Todoist senden". Setzt nach Bestätigung **denselben** `weekly_plan.shopping_list_sent_at`-Status wie der Todoist-Versand (gleicher `onSent`-Callback, keine zwei Code-Pfade), damit die Zutaten nicht wieder in einer neuen Liste auftauchen.
- **Abhak-Status ist haushaltsweit in Supabase gespeichert, für beide Fälle gleich** (nicht nur ohne Todoist) – eigene Tabelle `shopping_list_checked_items` (`household_id`, `item_key`, `checked_at`, Unique-Index auf beide Spalten), RLS wie überall. Eine eigene Tabelle statt einer JSON-Spalte auf `households`, weil beim gleichzeitigen Abhaken durch mehrere Haushaltsmitglieder ein Read-Modify-Write auf einer JSON-Spalte Updates verlieren könnte – ein Insert/Delete pro Zeile nicht.
  - **Wichtige Einschränkung:** Die Einkaufsliste ist kein Snapshot (siehe oben), `item_key` ist deshalb der (kleingeschriebene) Zutatenname, keine feste Zeilen-ID. Ändert sich der Wochenplan oder wird "Neu berechnen" angestoßen, kann eine bereits abgehakte Zutat in seltenen Fällen wieder als nicht abgehakt erscheinen, falls sie leicht anders benannt wird. Konsequenz aus "kein Snapshot", kein Bug.
  - Kein Supabase Realtime eingeführt (wird bisher nirgends in der App genutzt) – Abhak-Status wird beim Öffnen des Liste-Tabs neu geladen, zusätzlich Pull-to-Refresh in `ShoppingListScreen`.
  - "Einkauf abschließen" (ohne UND mit Todoist) löscht danach alle `shopping_list_checked_items`-Zeilen des Haushalts (Häkchen zurückgesetzt).
- **Mit Verbindung:** Verhalten wie bisher ("An Todoist senden"), Abhaken in der App bleibt zusätzlich möglich, ist aber nicht nötig.

## UI-Design-System

- **`DESIGN.md` (Repo-Root) ist die verbindliche Design-Spezifikation** (Farben, Schriften, Abstände, Radien, Aufbau jedes Screens, Icons). `app/lib/theme.ts` bildet sie 1:1 als Code-Werte ab. **Neue UI verwendet ausschließlich Werte aus `theme.ts`, keine fest eingetragenen Farben oder Größen mehr** (bestehende Screens werden erst bei ihrem nächsten Umbau umgestellt, nicht nachträglich pauschal refactored).
- Farben/Abstände/Radien: vollständiger Tokensatz aus `DESIGN.md` (u.a. `surfaceMuted`, `chipMuted`, `border`/`borderSoft`/`divider`/`dashed`, `textSubtle`, `quantity`, `success`, `danger`, `onPrimary`, Platzhalterfarben für Rezeptkacheln ohne Foto, Abstandsstufen 4/8/12/14/18/22, Eckenradien für Karten/Buttons/Segmented Control/Chips).
- Schriften: **Fraunces** (Überschriften, `600SemiBold`/`800ExtraBold` – Fraunces bietet keine 650er-Stufe als eigene Static-Font-Datei, 600 ist die nächstgelegene) und **Figtree** (Fließtext/Buttons, `400Regular`/`500Medium`/`600SemiBold`/`700Bold`) über `@expo-google-fonts/*`, geladen in `App.tsx` via `useFonts` aus `expo-font` (Ladebildschirm bis fertig, analog zum bestehenden Session-Ladezustand).
- **Wichtig:** Fonts werden über die Subpfad-Exporte der Pakete importiert (z. B. `@expo-google-fonts/fraunces/600SemiBold`), nicht über den Paket-Barrel (`@expo-google-fonts/fraunces`). Der Barrel lädt beim Import alle ~20 Gewichtsvarianten der Familie eagerly (jede als `require()` auf Modul-Ebene), das hätte den Web-Bundle um mehrere MB unnötig aufgebläht – verifiziert durch Vergleich der `expo export --platform web`-Asset-Liste vor/nach der Umstellung (40 vs. 5 Font-Dateien).
- **Icons: `@expo/vector-icons` (Feather-Set), nicht `lucide-react-native`** (ursprünglich in DESIGN.md empfohlen). `lucide-react-native` hätte über seinen Paket-Barrel alle ~1500 Icons geladen (Web-Bundle 900KB → 3,2MB); der naheliegende Fix per Deep-Import (`lucide-react-native/icons/plus`) ließ `tsc` reproduzierbar mit einem Stack-Overflow abstürzen. `@expo/vector-icons` ist bereits Teil von Expo, verursacht denselben Barrel-Bloat (alle Icon-Familien), lässt sich aber per Deep-Import pro Familie umgehen (`@expo/vector-icons/build/Feather` statt `import { Feather } from '@expo/vector-icons'`), verifiziert per Export-Vergleich (Bundle bleibt bei ~906KB, nur eine Feather-Font-Datei statt ~20 Icon-Fonts).
- **Bekannter, von diesem Icon-Thema unabhängiger Fund:** `npx tsc --noEmit` stürzt in dieser Umgebung (Node v26 + TypeScript `~6.0.3`) nicht-deterministisch mit „Maximum call stack size exceeded" ab – reproduziert auch auf dem Stand *vor* jeglicher Icon-/Theme-Arbeit dieser Session. Mit größerem V8-Stack läuft es zuverlässig: `node --stack-size=8000 node_modules/typescript/lib/tsc.js --noEmit`. Noch nicht behoben (z.B. als npm-Script), nur als Workaround bekannt.
- `react-native-safe-area-context` eingeführt (für `Header`/`BottomBar`, die laut Spec Safe-Area-Abstände brauchen); `App.tsx` ist entsprechend in `SafeAreaProvider` gewrappt.
- **✅ Alle Screens auf DESIGN.md umgebaut** (reine Optik, keine Funktionsänderung): Gemeinsame Bausteine `app/components/Header.tsx` (App-Icon + „mealio" + Segmented Control), `BottomBar.tsx`, `Card.tsx`, `Chip.tsx` (Varianten `filter`/`removable`/`dashed`/`select`), `PrimaryButton.tsx` sind jetzt überall im Einsatz; die alte `SegmentedControl.tsx` wurde entfernt (unbenutzt).
  - `HomeScreen`: `Header` ersetzt Logo-Text + alte Segmented Control, `BottomBar` ersetzt die alte Bottom-Nav. Primär-Button zeigt kontextabhängig „+ Rezept hinzufügen" (Rezepte/Wochenplan) oder „An Todoist senden" (Liste, `accent`-Variante mit Send-Icon) – `ShoppingListScreen` exponiert dafür `confirmSend()` über ein `forwardRef`/`useImperativeHandle`-Handle plus einen `onSendingChange`-Callback, damit der Button aus der Bottom-Bar heraus auslösbar bleibt, ohne die Sende-Logik zu duplizieren.
  - `RecipeListScreen`/`RecipeCard`/`FilterBar`: Grid-Kacheln im neuen Kartenstil (Platzhalterfarben rotierend + Feather-„image"-Icon statt 🍽️-Emoji), Plan-Button als 36px-Kreis mit Feather-Icon (`plus`/`check`), Tag-Filter über `Chip`.
  - `WeeklyPlanScreen`/`PlanRecipeCard`: **Layout-Wechsel von 2-Spalten-Grid zu einspaltiger Liste** (Zeilen-Karten mit 64px-Thumbnail statt volle RecipeCard), "Gekocht"-Animation unverändert erhalten. Neue Hinweis-Karte "Einkaufsliste ist bereit" zeigt bewusst die **Rezept-Anzahl, nicht die Zutaten-Anzahl** (keine zusätzlichen Claude-Aggregations-Calls nur für diese Anzeige – Kostenentscheidung, mit Nutzerin abgestimmt).
  - `ShoppingListScreen`: Menge/Name jetzt in zwei Spalten (Menge im Fallback-Modus leer, da Freitext ohne NLP nicht zuverlässig trennbar); Grundzutaten jetzt als gestrichelte Tap-to-move-Chips statt Checkbox-Zeilen (Checkbox zum Abhaken bleibt nur noch in der Hauptliste, nach dem Verschieben). Sende-Button ist in die globale `BottomBar` gewandert (siehe oben).
  - `SettingsScreen`: komplett neu strukturiert nach den 5 Abschnitten aus DESIGN.md (Haushalt-Karte in `primary` mit Avataren, Grundzutaten/Tags als Chip-Karten mit progressivem "+"-Eingabefeld statt dauerhaft sichtbarem Textfeld, Todoist-Status als Badge-Zeile, Account mit Textlink-„Abmelden"). Tags-Zeilen zeigen jetzt zusätzlich die Rezept-Anzahl pro Tag (`countRecipesForTag`, vorher nur beim Löschen abgefragt).
  - **Bewusst reduzierter Umbau** (Nutzerin-Entscheidung): `EditRecipeScreen`, `LoginScreen`, `HouseholdOnboarding` haben nur Farben/Fonts/Theme-Tokens bekommen, keine Struktur-Änderung. `AddRecipeScreen` wurde als Bottom-Sheet-Modal umgebaut (Tabs umsortiert zu Link/Text/Manuell, Zutaten im Manuell-Tab jetzt als Menge+Name+×-Zeilen) – **ohne** die in DESIGN.md zusätzlich beschriebenen Portionen-Mengenumrechnung, Zubereitungs-Schritte oder Foto-Upload, da diese neue Daten/Funktionen bräuchten (`recipes.ingredients` ist weiterhin Freitext, Bilder bleiben explizit bei URLs). Diese Punkte sind als eigene Funktions-Aufgabe offen, falls gewünscht.
  - **✅ `RecipeDetailScreen` vollständig nach eigener, detaillierter Spec umgebaut** (eine ScrollView, Bild scrollt mit; Hero randlos bis oben, Content überlappt um −24 mit Radius oben 24; schwebende Zurück-/Mehr-Buttons via `ActionSheet`-Komponente statt fixer Bearbeiten/Löschen-Buttons; Plan-Toggle als Bottom-Bar-Button, dafür bekommt der Screen jetzt `baseIngredients`/`inPlan`/`onTogglePlan` von `HomeScreen` durchgereicht). Dabei bewusst **keine** Zutaten-Mengen-Spalte (Zutaten bleiben eine Freitext-Spalte, abgestimmt – echte Menge/Name-Trennung erst, wenn `recipe_ingredients` hier gelesen wird), Portionen-Stepper ändert nur die lokal angezeigte Zahl (kein Speichern, keine Mengen-Umrechnung – folgt als eigener Schritt). „Grundzutat"-Markierung nutzt die Fallback-Heuristik aus `lib/baseIngredients.ts` (aus `ShoppingListScreen.tsx` extrahiert, jetzt von beiden Screens genutzt). Der "Zubereitung"-Punkt wurde aus DESIGN.md entfernt (wird nirgends gespeichert/angezeigt).
  - Nicht per Browser/Expo Go visuell geprüft (kein Browser-Tool in dieser Session verfügbar) – nur `tsc`/`expo export --platform web` liefen fehlerfrei. Bitte vor dem Verlassen dieser Session einmal mit `npx expo start --web` gegenchecken.

## Tags-Konzept

- ✅ **Tags sind eine haushaltsweite, verwaltbare Liste** statt freier Text-Strings pro Rezept. Neue Tabellen `tags` (id, household_id, name) + `recipe_tags` (recipe_id, tag_id) als Verknüpfung, RLS pro Haushalt (analog zu `recipe_ingredients`). Eindeutiger Index auf `(household_id, lower(name))` verhindert Dubletten unabhängig von Groß-/Kleinschreibung.
- **Umbenennen wirkt überall**, da Rezepte per `tag_id` referenzieren statt per String. **Löschen** zeigt vorher eine Bestätigung mit der Anzahl betroffener Rezepte (über `confirm()`/`notify()` aus `lib/alert.ts`, web-sicher); die Verknüpfung wird entfernt (cascade), die Rezepte selbst bleiben unverändert.
- Beim Rezept-Hinzufügen/-Bearbeiten: Tags nur aus der Haushalts-Liste auswählbar (`TagPicker`-Komponente, Mehrfachauswahl + "+ Neuer Tag"), kein Freitext mehr.
- Filter-Leiste zieht ihre Optionen aus der vollständigen Haushalts-Tag-Liste (alphabetisch sortiert), nicht mehr nur aus aktuell auf Rezepten vorkommenden Tags.
- **`recipes.tags` (Typ `json`) bleibt bestehen**, alle bestehenden Zuordnungen wurden per Migration automatisch in die neue Struktur übernommen. Die Spalte wird aber ab sofort nicht mehr aktiv beschrieben (gleiches Prinzip wie bei `recipes.ingredients` / `recipe_ingredients`) – `RecipeCard`/`RecipeDetailScreen`/`FilterBar` lesen Tags jetzt über den Join, nicht mehr aus der alten Spalte.

## Navigations-Konzept

- **Rezepte / Wochenplan / Einkaufsliste** sind gleichwertige Ansichten, umschaltbar über eine Segmented-Control-Leiste **oben** im Hauptbereich – keine Bottom-Tabs mehr dafür.
- **Bottom-Navigation ist auf zwei Punkte reduziert:** "Rezept hinzufügen" (bestehender Manuell/Text/URL-Flow) und "Einstellungen".
- **Einstellungen-Screen** mit vier Abschnitten:
  - Haushalt: Einladungscode (mit Share-Button), Mitgliederliste, "Code neu generieren"
  - Grundzutaten: editierbare Liste (bisher hart codiert in `ShoppingListScreen.tsx`, wandert nach `households.base_ingredients`)
  - Account: eingeloggte E-Mail, Logout (wandert aus dem bisherigen Header hierher)
  - Todoist: Verbindungsstatus (vorerst immer "Nicht verbunden", bis der echte Token/OAuth-Flow steht)

Schema-Ergänzungen (geplant): `households.base_ingredients` (text[], ersetzt die hart codierte Konstante), neue Tabelle `profiles` (id, email) + Trigger auf `auth.users`-Insert (nötig, um Haushaltsmitgliedern die E-Mail anderer Mitglieder anzeigen zu können – liegt sonst nur in `auth.users`, nicht per RLS erreichbar), neue Funktion `regenerate_invite_code()`, UPDATE-Policy auf `households` (aktuell nur SELECT).

**Login-Flow (fertig, getestet):** E-Mail-Code (OTP) statt klickbarem Magic Link – umgeht Deep-Link-Probleme auf Mobile komplett und funktioniert identisch auf Web und Native. Läuft über Custom SMTP (dediziertes Gmail-Konto + App-Passwort), da Supabase Template-Bearbeitung (nötig für `{{ .Token }}` statt `{{ .ConfirmationURL }}`) beim eingebauten Mailing sperrt – bewusst schon jetzt eingerichtet statt erst kurz vor Store-Release, weil sonst kein Login auf Mobile testbar wäre. Code-Länge ist projektspezifisch 8 Stellen (Supabase "OTP Length"-Einstellung), nicht die oft angenommenen 6. Verifiziert in Expo Web und Expo Go (iPhone).

## Was aus dem Prototyp wegfällt

- Railway (n8n-Hosting) → ersetzt durch Supabase Edge Functions
- n8n selbst → Logik wandert in Code
- Shared Password → ersetzt durch Supabase Auth

**Netlify bleibt aktiv** (anders als zuvor hier vermerkt) – hostet jetzt den `expo export --platform web`-Build der neuen App, nicht mehr den alten HTML-Prototyp.

## Bestehende Prototyp-Funktionen (müssen in der neuen Architektur erhalten bleiben)

- Rezept per URL hinzufügen (aktuell via n8n + Spoonacular)
- Rezept per Text/manuell hinzufügen
- Tags pro Rezept, filterbar
- Detailansicht, Bearbeiten, Löschen von Rezepten
- Wochenplan: Rezepte anklicken zum Hinzufügen/Entfernen
- Einkaufsliste: Zutaten aggregieren, Grundzutaten (Salz, Pfeffer, Öl etc.) rausfiltern, gleiche Zutaten summieren, Sync zu Todoist

## Entwicklungsumgebung

- MacBook Air 13 (Apple Silicon), macOS Tahoe
- Node.js, Git, VS Code mit Claude Code Extension
- GitHub-Repo: `github.com/nathalierze/mealio` (öffentlich, HTTPS-Auth über `gh`), Branch `main` ist zugleich der Netlify-Production-Branch

## Aktuelle Kosten-Leitplanken

Privater Gebrauch (2 Personen), laufende Kosten sollen minimal bleiben – aktuell nur Free-Tier-Dienste (Supabase, Netlify, Spoonacular/Claude/Todoist im Rahmen der üblichen Nutzung). Apple Developer Account (99 $/Jahr) und Google Play Console (25 $ einmalig) sind **zurückgestellt**, erst relevant beim späteren Store-Release.

## Sicherheitsregeln für Datenbank-Änderungen

- Niemals destruktive Änderungen (DROP TABLE, TRUNCATE, `supabase db reset` gegen die Produktionsdatenbank) ohne explizite Bestätigung.
- Schema-Änderungen immer als Migration-Datei anlegen (`supabase migration new ...`), nie direkt gegen die Live-DB.
- Vor jedem `supabase db push` kurz zusammenfassen, was sich ändert, und auf Bestätigung warten.
- Entsprechende Guardrails sind in `.claude/settings.json` als `deny`/`ask`-Permission-Regeln hinterlegt.

## Wie wir zusammenarbeiten

Grundsatzentscheidungen (Architektur, Tech-Stack-Wahl, große Weichenstellungen) werden mit Claude im Chat (claude.ai) durchdacht und landen als Update in dieser Datei. Diese Datei ist die gemeinsame Referenz – bitte bei größeren Entscheidungen oder Abweichungen von obigem Plan kurz nachfragen statt eigenständig grundlegend umzubauen.
