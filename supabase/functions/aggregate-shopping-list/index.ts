// Aggregiert Zutaten mehrerer Rezepte zu einer Einkaufsliste (Hauptliste +
// Grundzutaten getrennt). Claude übernimmt NUR das Sprachverständnis
// (Freitext-Zeile in menge/einheit/name zerlegen, als Grundzutat
// klassifizieren) - und zwar NUR noch für Rezepte, die noch keine Zeilen in
// recipe_ingredients haben. Für bereits migrierte Rezepte sind Menge/Einheit/
// Name schon strukturiert vorhanden; die Grundzutaten-Klassifizierung läuft
// dort über dieselbe deterministische Heuristik, die auch als Fallback dient
// (_shared/baseIngredients.ts) - kein Freitext-Rauschen mehr, Claude muss das
// nicht mehr erkennen.
//
// Performance-Hintergrund (gemessen 25.10.2026, 5 Rezepte, alle unmigriert):
// Claude-Aufruf = 15,3s von 16,1s Gesamtzeit (94,8%), dominiert durch
// Output-Tokens (2158), nicht durch Eingabegröße - Prompt-Caching würde hier
// kaum helfen (verkürzt nur die Eingabeverarbeitung). Der Claude-Aufruf
// entfällt deshalb komplett, sobald alle angefragten Rezepte migriert sind.
//
// Das eigentliche Zusammenfassen/Summieren passiert weiterhin deterministisch
// in Code, NICHT durch das Modell: LLMs sind bei stumpfer Arithmetik/
// Einheiten-Vergleich unzuverlässig (z.B. "500g Tomaten" + "2 Tomaten"
// fälschlich zu "502g" summiert). Mengen werden nur zusammengezählt, wenn
// Name UND (normalisierte) Einheit exakt übereinstimmen.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { isBaseIngredient } from "../_shared/baseIngredients.ts";

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

function mergeIngredient(
  groups: Map<string, Group>,
  recipeName: string,
  name: string,
  menge: number | null,
  einheitRaw: string | null,
  isBase: boolean,
) {
  const unit = normalizeUnit(einheitRaw);
  const key = `${name.trim().toLowerCase()}|${unit ?? ""}`;
  const existing = groups.get(key);

  if (existing) {
    if (existing.menge !== null && menge !== null) {
      existing.menge += menge;
    } else {
      existing.menge = null;
    }
    existing.sourceRecipes.add(recipeName);
  } else {
    groups.set(key, { name, menge, einheit: unit, isBase, sourceRecipes: new Set([recipeName]) });
  }
}

export default {
  fetch: async (req: Request) => {
    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;
    const res = await withSupabase({ auth: "user", cors: "disabled" }, async (req, ctx) => {
    const t0 = Date.now();
    const { recipeIds } = await req.json();
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return Response.json({ error: "recipeIds ist erforderlich." }, { status: 400 });
    }

    const [recipesRes, householdRes, existingIngredientsRes] = await Promise.all([
      ctx.supabase.from("recipes").select("id, name, ingredients").in("id", recipeIds),
      ctx.supabase.from("households").select("base_ingredients").maybeSingle(),
      ctx.supabase
        .from("recipe_ingredients")
        .select("recipe_id, menge, einheit, name")
        .in("recipe_id", recipeIds),
    ]);

    if (recipesRes.error) {
      return Response.json({ error: recipesRes.error.message }, { status: 500 });
    }
    if (householdRes.error) {
      return Response.json({ error: householdRes.error.message }, { status: 500 });
    }
    if (existingIngredientsRes.error) {
      return Response.json({ error: existingIngredientsRes.error.message }, { status: 500 });
    }
    const tFetched = Date.now();

    const recipes = recipesRes.data ?? [];
    const baseIngredients = householdRes.data?.base_ingredients ?? [];
    const recipeNameById = new Map(recipes.map((r) => [r.id, r.name as string]));

    // Bereits migrierte Rezepte: menge/einheit/name sind schon strukturiert,
    // kein Claude-Aufruf nötig - Grundzutaten-Klassifizierung läuft
    // deterministisch über dieselbe Heuristik wie im Client-Fallback.
    const migratedByRecipe = new Map<number, { menge: number | null; einheit: string | null; name: string }[]>();
    for (const row of existingIngredientsRes.data ?? []) {
      const list = migratedByRecipe.get(row.recipe_id) ?? [];
      list.push({ menge: row.menge, einheit: row.einheit, name: row.name });
      migratedByRecipe.set(row.recipe_id, list);
    }
    const unmigratedIds = (recipeIds as number[]).filter((id) => !migratedByRecipe.has(id));

    const groups = new Map<string, Group>();

    for (const [recipeId, rows] of migratedByRecipe) {
      const recipeName = recipeNameById.get(recipeId) ?? "Unbekanntes Rezept";
      for (const row of rows) {
        mergeIngredient(
          groups,
          recipeName,
          row.name,
          row.menge,
          row.einheit,
          isBaseIngredient(row.name, baseIngredients),
        );
      }
    }

    let claudeUsage: unknown = null;
    let promptChars = 0;

    if (unmigratedIds.length > 0) {
      if (!ANTHROPIC_API_KEY) {
        return Response.json(
          { error: "ANTHROPIC_API_KEY ist nicht als Secret gesetzt." },
          { status: 500 },
        );
      }

      const unmigratedRecipes = recipes.filter((r) => unmigratedIds.includes(r.id));
      const recipesBlock = unmigratedRecipes
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
      promptChars = prompt.length;

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
      claudeUsage = anthropicData.usage ?? null;
      const toolUse = anthropicData.content?.find((c: { type: string }) => c.type === "tool_use");
      if (!toolUse) {
        return Response.json({ error: "Claude hat kein strukturiertes Ergebnis geliefert." }, {
          status: 502,
        });
      }

      const result = toolUse.input as ToolResult;

      for (const recipeId of unmigratedIds) {
        const parsed = result.parsed_by_recipe[String(recipeId)] ?? [];
        const recipeName = recipeNameById.get(recipeId) ?? "Unbekanntes Rezept";
        for (const ing of parsed) {
          mergeIngredient(groups, recipeName, ing.name, ing.menge, ing.einheit, ing.is_base_ingredient);
        }
      }

      const tClaudeDone = Date.now();

      // Zerlegte Zutaten in recipe_ingredients schreiben - wir wissen hier
      // bereits (ohne erneute Abfrage), dass genau diese Rezepte noch keine
      // Zeilen hatten. Parallel statt sequentiell.
      await Promise.all(
        unmigratedIds.map((recipeId) => {
          const parsed = result.parsed_by_recipe[String(recipeId)];
          if (!parsed || parsed.length === 0) return Promise.resolve();
          return ctx.supabase.from("recipe_ingredients").insert(
            parsed.map((ing, index) => ({
              recipe_id: recipeId,
              menge: ing.menge,
              einheit: ing.einheit,
              name: ing.name,
              sort_order: index,
            })),
          );
        }),
      );
      const tBackfillDone = Date.now();

      console.log(
        "aggregate-shopping-list timing:",
        JSON.stringify({
          recipeCount: recipeIds.length,
          migratedCount: migratedByRecipe.size,
          unmigratedCount: unmigratedIds.length,
          fetchMs: tFetched - t0,
          claudeMs: tClaudeDone - tFetched,
          backfillMs: tBackfillDone - tClaudeDone,
          totalMs: tBackfillDone - t0,
          claudeUsage,
          promptChars,
        }),
      );
    } else {
      console.log(
        "aggregate-shopping-list timing:",
        JSON.stringify({
          recipeCount: recipeIds.length,
          migratedCount: migratedByRecipe.size,
          unmigratedCount: 0,
          fetchMs: tFetched - t0,
          claudeSkipped: true,
          totalMs: Date.now() - t0,
        }),
      );
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

    return Response.json({ mainItems, baseItems });
    })(req);
    return withCorsHeaders(req, res);
  },
};
