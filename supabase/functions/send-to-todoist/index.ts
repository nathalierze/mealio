// Erstellt Todoist-Tasks für die aktuellen Einkaufslisten-Positionen.
// Nutzt den PRO HAUSHALT gespeicherten Todoist-API-Token (households.
// todoist_api_token), nicht ein globales Secret - jeder Haushalt verbindet
// sein eigenes Todoist-Konto über die Einstellungen in der App.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

export default {
  // auth: "user" (Default) validiert das JWT der App-Session und liefert in
  // ctx.supabase einen RLS-gescopten Client - so sehen wir automatisch nur
  // den Haushalt des aufrufenden Nutzers.
  fetch: async (req: Request) => {
    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;
    const res = await withSupabase({ auth: "user", cors: "disabled" }, async (req, ctx) => {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "items ist erforderlich." }, { status: 400 });
    }

    const { data: household, error } = await ctx.supabase
      .from("households")
      .select("todoist_api_token, todoist_project_id")
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!household?.todoist_api_token) {
      return Response.json({ error: "Kein Todoist-Konto verbunden." }, { status: 400 });
    }
    if (!household.todoist_project_id) {
      return Response.json(
        { error: "Bitte zuerst ein Todoist-Projekt in den Einstellungen wählen." },
        { status: 400 },
      );
    }

    const token = household.todoist_api_token as string;
    const projectId = household.todoist_project_id as string;

    const results = await Promise.all(
      (items as string[]).map(async (content) => {
        const res = await fetch("https://api.todoist.com/api/v1/tasks", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, project_id: projectId }),
        });
        const bodyText = res.ok ? null : await res.text();
        return { ok: res.ok, status: res.status, bodyText };
      }),
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      return Response.json(
        {
          error:
            `${failed.length} von ${items.length} Aufgaben konnten nicht angelegt werden.`,
          details: failed.map((f) => ({ status: f.status, body: f.bodyText })),
        },
        { status: 502 },
      );
    }

    return Response.json({ success: true, count: items.length });
    })(req);
    return withCorsHeaders(req, res);
  },
};
