-- Manuelle Migration von Freitext-Zutaten (recipes.ingredients) in die
-- strukturierte Tabelle recipe_ingredients. Portion 1 von 2 (Rezepte 15,
-- 22, 23, 30), per Review mit der Nutzerin bestätigt (siehe Chat-Verlauf).
-- recipes.ingredients bleibt unverändert, dient weiterhin als Fallback-
-- Anzeige und wird erst nach vollständiger Migration aller Rezepte als
-- veraltet markiert.

-- Rezept 15: Hähnchen-Ananas-Curry
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (15, 1,    'Stück', 'Ananas',              0),
  (15, 250,  'ml',    'Kokosmilch',          1),
  (15, 400,  'g',     'Hähnchen-Oberkeule',  2),
  (15, 1,    'Stück', 'Zwiebel',             3),
  (15, 2,    'Zehe',  'Knoblauch',           4),
  (15, 15,   'g',     'Ingwer',              5),
  (15, 2,    'Stück', 'Tomate',              6),
  (15, 1,    'Stück', 'Frische Chili',       7),
  (15, null, null,    'Koriander',           8),
  (15, 2,    'TL',    'Paprikapulver',       9),
  (15, 0.5,  'TL',    'Kurkuma',             10),
  (15, 0.5,  'TL',    'Chilipulver',         11),
  (15, null, null,    'Salz',                12),
  (15, null, null,    'Pfeffer',             13),
  (15, 2,    'EL',    'Griechischer Joghurt',14),
  (15, 1,    'Zehe',  'Knoblauch',           15),
  (15, null, null,    'Zitronensaft',        16),
  (15, 2,    'EL',    'Olivenöl',            17),
  (15, 0.5,  'TL',    'Kurkuma',             18),
  (15, 1,    'TL',    'Paprikapulver',       19),
  (15, 0.5,  'TL',    'Chilipulver',         20),
  (15, null, null,    'Öl',                  21),
  (15, 1,    'TL',    'Korianderpulver',     22),
  (15, 1,    'TL',    'Korianderpulver',     23);

-- Rezept 22: Pasta Amatriciana
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (22, 800, 'g',    'Tomate (Dose)',   0),
  (22, 500, 'g',    'Spaghetti',       1),
  (22, 300, 'g',    'Guanciale',       2),
  (22, 120, 'g',    'Zwiebel',         3),
  (22, 2,   'Zehe', 'Knoblauch',       4),
  (22, 1,   'EL',   'Olivenöl',        5),
  (22, 1,   'TL',   'Salz',            6),
  (22, 0.5, 'TL',   'Zucker',          7),
  (22, 0.25,'TL',   'Schwarzer Pfeffer',8),
  (22, 50,  'g',    'Pecorino',        9);

-- Rezept 23: Nudelauflauf mit Schinken und Käse
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (23, 800, 'ml',   'Gemüsebrühe',          0),
  (23, 500, 'g',    'Nudeln',               1),
  (23, 400, 'g',    'Sahne',                2),
  (23, 250, 'g',    'Kochschinken',         3),
  (23, 200, 'g',    'Käse',                 4),
  (23, 50,  'g',    'Parmesan',             5),
  (23, 1,   'Stück','Zwiebel',              6),
  (23, 1,   'Zehe', 'Knoblauch',            7),
  (23, 2,   'EL',   'Tomatenmark',          8),
  (23, 2,   'EL',   'Mittelscharfer Senf',  9),
  (23, 1.5, 'TL',   'Salz',                 10),
  (23, 2,   'TL',   'Getrockneter Majoran', 11),
  (23, 0.25,'TL',   'Schwarzer Pfeffer',    12);

-- Rezept 30: Rotes Linsen Dal
insert into recipe_ingredients (recipe_id, menge, einheit, name, sort_order) values
  (30, 400,  'g',    'Tomate (Dose)',    0),
  (30, 250,  'ml',   'Gemüsebrühe',      1),
  (30, 200,  'g',    'Rote Linsen',      2),
  (30, 200,  'ml',   'Kokosmilch',       3),
  (30, 100,  'g',    'Zwiebel',          4),
  (30, 15,   'g',    'Koriander',        5),
  (30, 2,    'Zehe', 'Knoblauch',        6),
  (30, null, 'Prise','Limette',          7),
  (30, 1,    'EL',   'Olivenöl',         8),
  (30, 1,    'TL',   'Salz',             9),
  (30, 1,    'TL',   'Garam Masala',     10),
  (30, null, 'Prise','Schwarzer Pfeffer',11),
  (30, null, null,   'Joghurt',          12);
