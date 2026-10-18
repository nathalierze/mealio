// Zentrale CORS-Origin-Allowlist für alle Edge Functions. withSupabase()
// handhabt CORS standardmäßig selbst (permissiv, statisch beim Cold-Start
// konfiguriert) - das kann nicht pro Anfrage zwischen mehreren erlaubten
// Origins unterscheiden. Jede Function deaktiviert deshalb withSupabase()s
// eigenes CORS (cors: "disabled") und nutzt die Helfer hier stattdessen,
// die den Origin-Header der jeweiligen Anfrage auswerten und nur spiegeln,
// wenn er in dieser Liste steht.
export const ALLOWED_ORIGINS = [
  "https://mealio.mealio-deutschland.workers.dev",
  "https://mealiodeutschland.netlify.app",
];

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

// Am Anfang des fetch-Handlers aufrufen: beantwortet einen Preflight-Request
// direkt, sonst null (weiter zur eigentlichen Logik).
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeadersFor(req.headers.get("Origin")) });
}

// Auf die fertige Response der eigentlichen Logik anwenden, bevor sie
// zurückgegeben wird.
export function withCorsHeaders(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeadersFor(req.headers.get("Origin")))) {
    headers.set(key, value);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
