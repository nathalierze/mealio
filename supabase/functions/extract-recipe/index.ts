// Ruft Spoonacular auf, um ein Rezept aus einer URL zu extrahieren.
// Der Spoonacular-API-Key bleibt serverseitig (Secret), landet nie im Client.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

const SPOONACULAR_API_KEY = Deno.env.get("SPOONACULAR_API_KEY");

type SpoonacularIngredient = {
  original?: string;
  amount?: number;
  unit?: string;
  name?: string;
};

type SpoonacularRecipe = {
  title?: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  extendedIngredients?: SpoonacularIngredient[];
};

export default {
  fetch: async (req: Request) => {
    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;
    const res = await withSupabase({ auth: ["publishable", "secret"], cors: "disabled" }, async (req) => {
    if (!SPOONACULAR_API_KEY) {
      return Response.json(
        { error: "SPOONACULAR_API_KEY ist nicht als Secret gesetzt." },
        { status: 500 },
      );
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "url ist erforderlich." }, { status: 400 });
    }

    const spoonacularUrl =
      `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(url)}&apiKey=${SPOONACULAR_API_KEY}`;

    const res = await fetch(spoonacularUrl);
    if (!res.ok) {
      return Response.json(
        { error: `Spoonacular konnte das Rezept nicht laden (Status ${res.status}).` },
        { status: 502 },
      );
    }

    const data: SpoonacularRecipe = await res.json();

    const ingredients = (data.extendedIngredients ?? []).map((ing) =>
      ing.original ?? [ing.amount, ing.unit, ing.name].filter(Boolean).join(" ")
    );

    return Response.json({
      name: data.title ?? "Rezept",
      image: data.image ?? null,
      time: data.readyInMinutes ?? null,
      portions: data.servings ?? null,
      ingredients,
      source: data.sourceUrl ?? url,
    });
    })(req);
    return withCorsHeaders(req, res);
  },
};
