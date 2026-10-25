// Portiert 1:1 aus app/lib/baseIngredients.ts (dort: Fallback, falls Claude
// ausfällt). Hier: deterministische Grundzutaten-Klassifizierung für Rezepte,
// die schon in recipe_ingredients stehen - deren Name ist bereits sauber
// (kein Freitext-Rauschen), Claude muss das nicht mehr erkennen.
const IGNORABLE_WORDS = [
  "und",
  "nach",
  "geschmack",
  "etwas",
  "prise",
  "prisen",
  "frisch",
  "frischer",
  "gemahlen",
  "gemahlener",
  "zum",
  "zur",
  "für",
  "optional",
  "mehr",
  "wenig",
  "viel",
  "ca",
  "circa",
  "anbraten",
  "braten",
  "kochen",
  "abschmecken",
  "würzen",
  "tl",
  "el",
  "g",
  "kg",
  "gramm",
  "kilogramm",
  "ml",
  "l",
  "liter",
  "milliliter",
  "stück",
  "stk",
  "dose",
  "dosen",
  "packung",
  "pck",
  "bund",
  "zehe",
  "zehen",
  "scheibe",
  "scheiben",
  "stange",
  "stangen",
  "handvoll",
  "esslöffel",
  "teelöffel",
  "tasse",
  "tassen",
];

export function isBaseIngredient(ingredient: string, baseIngredientKeywords: string[]): boolean {
  const words = ingredient
    .toLowerCase()
    .replace(/[^a-zäöüß\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return false;
  return words.every(
    (w) => baseIngredientKeywords.some((kw) => w.includes(kw)) || IGNORABLE_WORDS.includes(w),
  );
}
