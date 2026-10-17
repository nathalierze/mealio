// Lädt die Todoist-Projekte des verbundenen Haushalts, damit in den
// Einstellungen eins ausgewählt werden kann (statt dass Aufgaben immer im
// "Eingang" landen).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { data: household, error } = await ctx.supabase
      .from("households")
      .select("todoist_api_token")
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!household?.todoist_api_token) {
      return Response.json({ error: "Kein Todoist-Konto verbunden." }, { status: 400 });
    }

    const res = await fetch("https://api.todoist.com/api/v1/projects", {
      headers: { "Authorization": `Bearer ${household.todoist_api_token}` },
    });

    if (!res.ok) {
      const bodyText = await res.text();
      return Response.json(
        { error: `Todoist-Projekte konnten nicht geladen werden (${res.status}).`, details: bodyText },
        { status: 502 },
      );
    }

    const data = await res.json();
    // API v1 paginiert, die Projekte liegen unter "results".
    const projects = (data.results ?? data).map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));

    return Response.json({ projects });
  }),
};
