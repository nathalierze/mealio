# Mealio – Design-Spezifikation

Verbindliche Vorlage für das Styling der App. Alle Werte gehören in `app/lib/theme.ts` (bestehende flache Struktur, kein `src/`-Ordner); gemeinsame UI-Bausteine liegen unter `app/components/`. Screens verwenden nur Werte aus dem Theme, keine fest eingetragenen Farben oder Größen.

## Farben

| Token | Wert | Verwendung |
|---|---|---|
| `primary` | `#1F4D3A` | Text, aktive Elemente, Primär-Buttons |
| `accent` | `#F2B33D` | Akzent: aktiver Filter-Chip, „An Todoist senden“, Hinweis-Karten |
| `background` | `#FFF8EC` | Screen-Hintergrund |
| `surface` | `#FFFFFF` | Karten |
| `surfaceMuted` | `#EFE5D2` | Hintergrund Segmented Control |
| `chipMuted` | `#F3ECDF` | Chips in den Einstellungen |
| `border` | `#D9CDB6` | Ränder von Outline-Buttons und Chips |
| `borderSoft` | `#E9DFCC` | Kartenschatten-Linie, Trennlinie über der Bottom-Bar |
| `divider` | `#F1EADC` | Trennlinien innerhalb von Karten |
| `dashed` | `#C9BB9F` | gestrichelte „Hinzufügen“-Chips |
| `textMuted` | `#4A5E54` | Untertitel |
| `textSubtle` | `#5A6B62` | Meta-Infos (Zeit, Kategorie), Abschnittstitel |
| `quantity` | `#2C6A4F` | Mengen in der Einkaufsliste, Text-Links |
| `success` | `#D5E4C8` | „Verbunden“-Badge |
| `danger` | `#B4432A` | „Abmelden“ |
| `onPrimary` | `#FFF8EC` | Text/Icons auf Grün |

Platzhalter-Farben für Rezeptkacheln ohne Foto: `#F6E2B3`, `#F1D2BE`, `#EFC9A6`, `#D5E4C8`, `#F3DAB8`, `#EBCDB9`.

## Schriften

- **Fraunces** (Überschriften): `@expo-google-fonts/fraunces`, Gewichte 650 bzw. 600 und 800
  - Logo-Schriftzug „mealio“: 800, 30 px, letter-spacing −0,5
  - Screen-Titel („Diese Woche“, „Einkaufsliste“, „Einstellungen“): 600/650, 28 px
- **Figtree** (alles andere): `@expo-google-fonts/figtree`, Gewichte 400, 500, 600, 700
  - Fließtext 15–16 px, Meta 13 px, Buttons 15–16 px / 700, Abschnittstitel 13 px / 700 / uppercase / letter-spacing 0,6

## Abstände & Formen

- Seitenrand links/rechts: 20 px
- Abstand oben (unter der Statusleiste): Safe-Area + ca. 16 px
- Abstände zwischen Elementen: 4 / 8 / 12 / 14 / 18 / 22 px
- Eckenradien: Karten 18, Buttons 16, Segmented Control außen 14 / innen 11, Chips voll rund (Höhe/2), kleines App-Icon (Kopfbereich) 8
- Kartenschatten: 1 px Linie `borderSoft` unten + weicher Schatten (rgba(31,77,58,0.06), Blur 16, y 6)
- Touch-Ziele mindestens 44 px

## Gemeinsamer Kopfbereich (Rezepte, Wochenplan, Liste)

1. Zeile: App-Icon 34×34 px (Radius 8) + Schriftzug „mealio“ daneben, Abstand 10 px. Rechts nichts.
2. Segmented Control, volle Breite: Container `surfaceMuted`, 4 px Innenabstand, Radius 14; drei gleich breite Segmente „Rezepte“ / „Wochenplan“ / „Liste“, Höhe 40, Radius 11. Aktiv: Hintergrund `primary`, Text `onPrimary`. Inaktiv: transparent, Text `primary`.

## Bottom-Bar

Fest unten, Hintergrund `background`, Trennlinie oben `borderSoft`, Innenabstand 12 / 20 / Safe-Area.
- Links (füllt die Breite): Primär-Button, Höhe 52, Radius 16
  - Rezepte & Wochenplan: „+ Rezept hinzufügen“, Hintergrund `primary`
  - Liste: „An Todoist senden“ mit Senden-Icon, Hintergrund `accent`, Text `primary`
- Rechts: quadratischer Button 52×52, Rand 1,5 px `border`, Zahnrad-Icon → Einstellungen

## Screen: Rezepte

- Unter dem Kopf: Tag-Chips horizontal scrollbar, Höhe 36, Abstand 8. Aktiv („Alle“ oder gewählter Tag): Hintergrund `accent`, Text `primary`, 700. Inaktiv: Rand 1,5 px `border`, transparent, 600.
- Grid mit 2 Spalten, Abstand 14.
- Kachel: Hintergrund `surface`, Radius 18, Kartenschatten.
  - Bild oben, Höhe 108 (ohne Foto: Platzhalterfarbe + dezentes Teller-Icon).
  - Darunter Name (15 / 700) und Meta-Zeile „25 Min · Pasta“ (13, `textSubtle`).
  - **Plan-Button oben rechts im Bild**, Kreis 36 px, 8 px vom Rand:
    - Nicht im Plan: weiß, grünes Plus, leichter Schatten → antippen fügt hinzu
    - Im Plan: `primary`, heller Haken → antippen entfernt
  - Kein zusätzliches „Im Plan“-Badge.

## Screen: Wochenplan

- Titel „Diese Woche“, darunter „3 Gerichte geplant“ (15, `textMuted`).
- Liste der geplanten Rezepte, Abstand 12. Karte: Thumbnail 64×64 (Radius 14), Name (16 / 700), Meta „25 Min · 4 Portionen“; rechts runder Button 44 px, Rand 2 px `primary`, Haken → „gekocht“ (bestehende Animation beibehalten).
- Darunter Hinweis-Karte in `accent`, Radius 18: „Einkaufsliste ist bereit“ + „14 Zutaten aus 3 Rezepten“, rechts Button „Ansehen“ (`primary`) → wechselt zur Liste.
- Leerer Zustand bleibt wie bisher, nur im neuen Stil.

## Screen: Einkaufsliste

- Titel „Einkaufsliste“, rechts daneben „Entwurf · 8 Zutaten“ (14, `textMuted`).
- Weiße Karte mit Zeilen (min. 40 hoch, Trennlinie `divider`): Menge links in fester Spalte (70 px, 14 / 700, `quantity`), Name rechts (15).
- Darunter Abschnitt „Diese Grundzutaten brauchst du“ (14 / 700, `textMuted`) mit gestrichelten Chips (Rand 1,5 px dashed `dashed`, „+“ und Name). Antippen holt die Zutat auf die Liste.
- Bottom-Bar mit „An Todoist senden“ (siehe oben). Bestätigung und Snapshot-Verhalten bleiben unverändert.

## Screen: Einstellungen

- Kopf: Zurück-Pfeil (44er Touch-Ziel) + Titel „Einstellungen“. Kein Segmented Control, keine Bottom-Bar.
- Abschnitte mit Titel (13 / 700 / uppercase, `textSubtle`), jeweils Karte darunter:
  1. **Haushalt**: Karte in `primary`. „Einladungscode“ (hellgrün `#CFE0C3`), Code groß in Monospace, `accent`, letter-spacing 4; Button „Teilen“ (`accent`). Trennlinie, dann Mitglieder mit rundem Initialen-Avatar (32 px).
  2. **Grundzutaten**: weiße Karte, kurzer Hinweis, Chips (`chipMuted`) mit kleinem ×, dazu gestrichelter Chip „+ Hinzufügen“.
  3. **Tags**: weiße Karte, Zeilen (48 hoch) mit Name, Anzahl Rezepte, Pfeil → bearbeiten; unten „+ Neuer Tag“ (`quantity`).
  4. **Todoist**: Zeile „Verbindung“ mit Badge „Verbunden“ (`success`), Zeile „Zielprojekt“ mit Projektname + Pfeil.
  5. **Account**: E-Mail-Adresse, „Abmelden“ in `danger`.

## Login-Screen

- Zentrierter Inhalt (E-Mail-Schritt und Code-Schritt identisch aufgebaut): `BrandMark`-Komponente (Variante `large`) oben, darunter der Rest des Formulars.
- `BrandMark` (`large`): App-Icon 96×96 px, Radius `radii.card`, darunter mit 12 px Abstand der Schriftzug „mealio“ (Fraunces, wie im Kopfbereich), darunter mit 4 px Abstand der Slogan „Off your mind, onto your plate.“ (Figtree, 13 px, kursiv, `textMuted`).
- `BrandMark` (`inline`, im gemeinsamen Kopfbereich): App-Icon 34×34 px, Radius `radii.icon`, Schriftzug daneben – unverändert gegenüber vorher, nur als gemeinsame Komponente mit der `large`-Variante extrahiert.
- Darunter der bestehende Screen-Titel bzw. Hinweistext (Code-Schritt: „Code eingeben“ + „Wir haben einen Code an … geschickt.“; E-Mail-Schritt: nur der Hinweistext, kein zusätzlicher Titel, da `mealio` selbst die Überschrift ist).

## Rezept hinzufügen (Bottom-Sheet)

- Öffnet als Sheet von unten (Hintergrund abgedunkelt), oben Griff-Strich, Radius oben 28.
- Kopf: Titel „Rezept hinzufügen“ (Fraunces 26) + Schließen-X rechts.
- Darunter Segmented Control im Stil des Haupt-Kopfs mit „Link“ / „Text“ / „Manuell“.
- Eingabefelder: Höhe 52, Radius 14, Rand 1,5 px `border`, Hintergrund `surface`; Label darüber (14 / 700).
- Tags: Auswahl-Chips (gewählt = `primary` gefüllt mit hellem Text, sonst Outline) + gestrichelter Chip „+ Neuer Tag“.
- Portionen: Stepper mit − / Zahl / + (44er Touch-Ziele).
- **Link**: Hinweistext, URL-Feld mit Button „Einfügen“ (aus Zwischenablage), Tags, Portionen; Button unten „Rezept importieren“.
- **Text**: Rezeptname, großes Textfeld für den eingefügten Text mit Hinweis „Zutaten und Zubereitung werden automatisch erkannt“, Tags; Button „Rezept speichern“.
- **Manuell**: gestrichelte Fläche „Foto hinzufügen“, Rezeptname, Kochzeit (Min) und Portionen nebeneinander, Zutaten als Liste (Menge + Name + ×, darunter „+ Zutat hinzufügen“), Zubereitung (optional), Tags; Button „Rezept speichern“.
- Der Speichern-/Importieren-Button ist volle Breite, `primary`, Höhe 52.

## Rezept-Detail

- Großes Bild oben (ca. 300 hoch, ohne Foto Platzhalterfarbe), darauf runde helle Buttons (44 px, Schatten): links Zurück, rechts „…“ (Bearbeiten / Löschen).
- Inhaltsbereich überlappt das Bild um 24 px mit Radius oben 24.
- Titel Fraunces 30, darunter Tags als ruhige Chips (`chipMuted`, nicht klickbar).
- Zwei Info-Kacheln nebeneinander: Kochzeit (Uhr-Icon) und Portionen mit − / +, das die Zutatenmengen umrechnet.
- „Zutaten” (Fraunces 22) in weißer Karte wie in der Einkaufsliste; Grundzutaten rechts dezent mit „Grundzutat” markiert.
- Link „Original-Rezept öffnen”, falls eine Quelle existiert.
- Bottom-Bar: „+ Zum Wochenplan“ (`primary`); wenn schon im Plan: „Im Wochenplan“ mit Haken, Outline-Stil, antippen entfernt.

## Icons

Linien-Icons, Strichstärke ca. 2–2,6, runde Enden, Farbe `primary` (bzw. `onPrimary` auf Grün). Keine Emojis. Empfehlung: `lucide-react-native` (Plus, Check, Settings, Send, ChevronLeft, ChevronRight, X).
