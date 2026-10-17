// Aggregiert Zutaten mehrerer Rezepte zu einer Einkaufsliste (Hauptliste +
// Grundzutaten getrennt). Claude übernimmt NUR das Sprachverständnis
// (Zeile in menge/einheit/name zerlegen, als Grundzutat klassifizieren) -
// ein Aufruf pro Generierung, nicht pro Zutat (Kostenkontrolle). Das
// eigentliche Zusammenfassen/Summieren passiert deterministisch in Code,
// NICHT durch das Modell: LLMs sind bei stumpfer Arithmetik/Einheiten-
// Vergleich unzuverlässig (z.B. "500g Tomaten" + "2 Tomaten" fälschlich zu
// "502g" summiert). Hier werden Mengen nur zusammengezählt, wenn Name UND
// (normalisierte) Einheit exakt übereinstimmen - unterschiedliche Einheiten
// (z.B. Gramm vs. Stück) bleiben immer getrennte Zeilen.
//
// Schreibt die zerlegten Zutaten außerdem in recipe_ingredients, aber nur
// für Rezepte, die dort noch keine Zeilen haben - so migrieren sich alte
// Freitext-Rezepte nach und nach, sobald sie Teil einer Einkaufsliste sind.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001"; // kleines, günstiges Modell reicht für diese Aufgabe

type ParsedIngredient = {
  menge: number | null;
  einheit: string | null;
  name: string;
  is_base_ingredient: boolean;
};

type ToolResult = {
  parsed_by_recipe: Record<string, ParsedIngredient[]>;
};

const TOOL = {
  name: "submit_parsed_ingredients",
  description:
    "Gibt für jedes Rezept die zerlegten Zutaten zurück: Menge, Einheit, Name, und ob es sich um eine Grundzutat handelt.",
  input_schema: {
    type: "object",
    properties: {
      parsed_by_recipe: {
        type: "object",
        description: "Pro Rezept-ID (als String) die einzelnen Zutaten dieses Rezepts.",
        additionalProperties: {
          type: "array",
          items: {
            type: "object",
            properties: {
              menge: {
                type: ["number", "null"],
                description: "Numerische Menge, oder null wenn keine sinnvolle Zahl vorhanden ist (z.B. 'nach Geschmack').",
              },
              einheit: {
                type: ["string", "null"],
                description: "Einheit wie g, kg, ml, l, TL, EL, Stück - oder null, wenn es sich um eine reine Stückzahl ohne Einheit handelt (z.B. '2 Zwiebeln').",
              },
              name: {
                type: "string",
                description: "Normalisierter Name der Zutat, Singular, ohne Menge/Einheit (z.B. 'Zwiebel', nicht 'Zwiebeln').",
              },
              is_base_ingredient: {
                type: "boolean",
                description: "true, wenn es eine typische Grundzutat/Vorrats-Zutat ist (Salz, Pfeffer, Öl, Gewürze, Brühe etc. oder Varianten davon).",
              },
            },
            required: ["name", "is_base_ingredient"],
          },
        },
      },
    },
    required: ["parsed_by_recipe"],
  },
};

function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  const lower = unit.trim().toLowerCase();
  if (["g", "gramm", "gr"].includes(lower)) return "g";
  if (["kg", "kilogramm"].includes(lower)) return "kg";
  if (["ml", "milliliter"].includes(lower)) return "ml";
  if (["l", "liter"].includes(lower)) return "l";
  if (["tl", "teelöffel"].includes(lower)) return "tl";
  if (["el", "esslöffel"].includes(lower)) return "el";
  if (["stück", "stk", "stueck"].includes(lower)) return null; // Stückzahl = keine Einheit
  return lower;
}

type Group = {
  name: string;
  menge: number | null;
  einheit: string | null;
  isBase: boolean;
  sourceRecipes: Set<string>;
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (!ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY ist nicht als Secret gesetzt." },
        { status: 500 },
      );
    }

    const { recipeIds } = await req.json();
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return Response.json({ error: "recipeIds ist erforderlich." }, { status: 400 });
    }

    const { data: recipes, error: recipesError } = await ctx.supabase
      .from("recipes")
      .select("id, name, ingredients")
      .in("id", recipeIds);

    if (recipesError) {
      return Response.json({ error: recipesError.message }, { status: 500 });
    }

    const { data: household, error: householdError } = await ctx.supabase
      .from("households")
      .select("base_ingredients")
      .maybeSingle();

    if (householdError) {
      return Response.json({ error: householdError.message }, { status: 500 });
    }

    const baseIngredients = household?.base_ingredients ?? [];

    const recipesBlock = (recipes ?? [])
      .map(
        (r) =>
          `Rezept-ID ${r.id} ("${r.name}"):\n${(r.ingredients ?? []).map((i: string) => `- ${i}`).join("\n")}`,
      )
      .join("\n\n");

    const prompt =
      `Du bekommst Zutatenlisten aus mehreren Rezepten (Freitext-Zeilen).\n\n` +
      `Grundzutaten (is_base_ingredient = true) sind mindestens diese hier, plus Varianten/Synonyme ` +
      `davon (z.B. "Olivenöl" zählt zu "Öl"): ${baseIngredients.join(", ")}.\n\n` +
      `Zerlege JEDE Zeile jedes Rezepts in menge, einheit und name (siehe Tool-Beschreibung). ` +
      `Wichtig: Du sollst NICHTS zusammenfassen oder summieren - gib genau eine Zeile im Ergebnis pro Original-Zutatenzeile zurück. ` +
      `Das Zusammenfassen mehrerer Rezepte passiert an anderer Stelle im Code.\n\n` +
      `${recipesBlock}\n\n` +
      `Antworte ausschließlich über das Tool submit_parsed_ingredients.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_parsed_ingredients" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const bodyText = await anthropicRes.text();
      return Response.json(
        { error: `Claude API Fehler (${anthropicRes.status})`, details: bodyText },
        { status: 502 },
      );
    }

    const anthropicData = await anthropicRes.json();
    const toolUse = anthropicData.content?.find((c: { type: string }) => c.type === "tool_use");
    if (!toolUse) {
      return Response.json({ error: "Claude hat kein strukturiertes Ergebnis geliefert." }, {
        status: 502,
      });
    }

    const result = toolUse.input as ToolResult;
    const recipeNameById = new Map((recipes ?? []).map((r) => [r.id, r.name as string]));

    // ─── Deterministische Aggregation (kein LLM-Rechnen) ──────────────────
    const groups = new Map<string, Group>();

    for (const recipeId of recipeIds as number[]) {
      const parsed = result.parsed_by_recipe[String(recipeId)] ?? [];
      const recipeName = recipeNameById.get(recipeId) ?? "Unbekanntes Rezept";

      for (const ing of parsed) {
        const unit = normalizeUnit(ing.einheit);
        const key = `${ing.name.trim().toLowerCase()}|${unit ?? ""}`;
        const existing = groups.get(key);

        if (existing) {
          if (existing.menge !== null && ing.menge !== null) {
            existing.menge += ing.menge;
          } else {
            existing.menge = null;
          }
          existing.sourceRecipes.add(recipeName);
        } else {
          groups.set(key, {
            name: ing.name,
            menge: ing.menge,
            einheit: unit,
            isBase: ing.is_base_ingredient,
            sourceRecipes: new Set([recipeName]),
          });
        }
      }
    }

    const mainItems = [];
    const baseItems = [];
    for (const g of groups.values()) {
      const item = {
        name: g.name,
        menge: g.menge,
        einheit: g.einheit,
        source_recipes: Array.from(g.sourceRecipes),
      };
      if (g.isBase) baseItems.push(item);
      else mainItems.push(item);
    }

    // Zerlegte Zutaten in recipe_ingredients schreiben, aber nur für Rezepte,
    // die dort noch keine Zeilen haben (kein Überschreiben bestehender Daten).
    for (const recipeId of recipeIds as number[]) {
      const parsed = result.parsed_by_recipe[String(recipeId)];
      if (!parsed || parsed.length === 0) continue;

      const { count } = await ctx.supabase
        .from("recipe_ingredients")
        .select("id", { count: "exact", head: true })
        .eq("recipe_id", recipeId);

      if (count && count > 0) continue;

      await ctx.supabase.from("recipe_ingredients").insert(
        parsed.map((ing, index) => ({
          recipe_id: recipeId,
          menge: ing.menge,
          einheit: ing.einheit,
          name: ing.name,
          sort_order: index,
        })),
      );
    }

    return Response.json({ mainItems, baseItems });
  }),
};
