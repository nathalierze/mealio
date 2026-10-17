-- Manuelle Migration von Freitext-Zutaten (recipes.ingredients) in die
-- strukturierte Tabelle recipe_ingredients. Portion 2 von 2 (Rezepte 31,
-- 32, 35, 39), per Review mit der Nutzerin bestätigt (siehe Chat-Verlauf).
-- recipes.ingredients bleibt unverändert.
--
-- Abweichungen von Portion 1 (bewusst, nicht rückwirkend angepasst):
-- - "Gehackte Tomate" (Dose als Einheit) statt "Tomate (Dose)", da sich
--   gehackte und ganze/geschälte Dosentomaten als unterschiedliche
--   Produkte herausgestellt haben. Kein Aggregations-Risiko, da die
--   Einheiten (Dose vs. g) ohnehin nie zusammengefasst würden.
-- - Mengen-Mehrzahl-Zutaten (Mandeln, Sprossen) bleiben im Plural statt
--   künstlich vereinzelt zu werden.

-- Rezept 31: Spaghetti Aglio e Olio
-- "2 Kellen Nudelwasser" bewusst weggelassen (keine passende Einheit,
-- kein Einkaufs-Artikel).
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (31, 235, 'g',    'Spaghetti',          0),
  (31, 6.5, 'EL',   'Olivenöl',           1),
  (31, 2,   'Zehe', 'Knoblauch',          2),
  (31, 1,   'TL',   'Chiliflocken',       3),
  (31, 3,   'EL',   'Frische Petersilie', 4);

-- Rezept 32: Brokkoli-Tofu-Wok
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (32, 1,    'Zehe',  'Knoblauch',             0),
  (32, 10,   'g',     'Ingwer',                1),
  (32, 2,    'TL',    'Sesamöl',               2),
  (32, 250,  'g',     'Tofu',                  3),
  (32, 50,   'g',     'Mandeln',               4),
  (32, 400,  'g',     'Brokkoli',              5),
  (32, 1,    'Stück', 'Paprika',               6),
  (32, 1,    'Stück', 'Zwiebel',               7),
  (32, 1,    'Stück', 'Chili',                 8),
  (32, 3,    'EL',    'Olivenöl',              9),
  (32, null, null,    'Salz',                  10),
  (32, 250,  'ml',    'Gemüsebrühe',           11),
  (32, 2.5,  'EL',    'Sojasoße',              12),
  (32, null, null,    'Pfeffer',               13),
  (32, 1.5,  'EL',    'Limettensaft',          14),
  (32, 50,   'g',     'Mungobohnen-Sprossen',  15);

-- Rezept 35: Linsenlasagne
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (35, 1,    'EL',    'Bratöl',                           0),
  (35, 1,    'Stück', 'Zwiebel',                          1),
  (35, 1,    'Zehe',  'Knoblauch',                        2),
  (35, 170,  'g',     'Rote Linsen',                      3),
  (35, 1.5,  'Stück', 'Zucchini',                         4),
  (35, 4,    'EL',    'Frischkäse',                       5),
  (35, 1,    'Dose',  'Gehackte Tomate',                  6),
  (35, 250,  'g',     'Passierte Tomaten',                7),
  (35, null, 'Prise', 'Zitronensaft',                     8),
  (35, 1,    'TL',    'Curry Mild',                       9),
  (35, 1,    'TL',    'Kräuter der Provence',             10),
  (35, 1,    'EL',    'Gewürzmischung Italienische Art',  11),
  (35, null, null,    'Pfeffer',                          12),
  (35, null, null,    'Salz',                             13),
  (35, 9,    'Stück', 'Vollkorn-Lasagneplatten',          14),
  (35, 200,  'g',     'Reibekäse',                        15);

-- Rezept 39: Grüne Bohnen Pfanne mit Kartoffeln & Hack
-- "neutrales Öl" (Alternative ohne feste Menge) weggelassen, nur Ghee
-- gespeichert. "Chilipulver" aus der "1/2 TL Chilipulver & Chiliflocken"-
-- Zeile komplett weggelassen, nur Chiliflocken behalten.
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (39, 2,    'EL',    'Ghee',               0),
  (39, 400,  'g',     'Rinderhackfleisch',  1),
  (39, 1,    'Stück', 'Zwiebel',            2),
  (39, 4,    'Zehe',  'Knoblauch',          3),
  (39, 2,    'Stück', 'Tomate',             4),
  (39, 2,    'EL',    'Tomatenmark',        5),
  (39, 3.5,  'Stück', 'Kartoffel',          6),
  (39, 300,  'ml',    'Wasser',             7),
  (39, null, null,    'Frischer Koriander', 8),
  (39, 0.5,  'TL',    'Kurkuma',            9),
  (39, 0.5,  'TL',    'Chiliflocken',       10),
  (39, 0.5,  'TL',    'Garam Masala',       11),
  (39, null, null,    'Salz',               12),
  (39, null, null,    'Pfeffer',            13),
  (39, 400,  'g',     'Buschbohnen',        14),
  (39, 1.5,  'TL',    'Korianderpulver',    15),
  (39, 0.5,  'TL',    'Kreuzkümmelsamen',   16);
