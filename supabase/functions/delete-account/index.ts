// Löscht den Account des aufrufenden Nutzers. Einzige Stelle im Projekt,
// die den service_role-Key nutzt (nur aus den Supabase Secrets, nie im
// Frontend). user_id kommt ausschließlich aus dem geprüften JWT, nie aus
// dem Request-Body.
//
// Atomizität: household_members.user_id hat "on delete cascade" auf
// auth.users, und ein Trigger auf household_members löscht einen leer
// gewordenen Haushalt automatisch (siehe Migration delete_account). Ein
// einziger auth.admin.deleteUser()-Aufruf reicht deshalb aus - die Kaskade
// und der Trigger laufen innerhalb derselben Transaktion wie das Löschen
// des Auth-Users. Entweder committet alles zusammen, oder nichts.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createClient } from "@supabase/supabase-js";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export default {
  fetch: async (req: Request) => {
    const preflight = handleCorsPreflight(req);
    if (preflight) return preflight;
    const res = await withSupabase({ auth: "user", cors: "disabled" }, async (_req, ctx) => {
    const { data: userData, error: userError } = await ctx.supabase.auth.getUser();
    if (userError || !userData?.user) {
      return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    const userId = userData.user.id;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return Response.json(
        { error: `Account konnte nicht gelöscht werden: ${deleteError.message}` },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
    })(req);
    return withCorsHeaders(req, res);
  },
};
