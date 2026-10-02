/**
 * Autenticação e utilitários HTTP compartilhados para APIs administrativas do Karlos Art Tattoo.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Valida autorização administrativa via Header Bearer, Cookie admin_token ou Query token.
 */
export function isAuthorized(request: Request): boolean {
  const adminSecret = process.env.ADMIN_PASSWORD || "karlos2026";

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === adminSecret) return true;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  if (cookieHeader.includes(`admin_token=${adminSecret}`)) {
    return true;
  }

  const url = new URL(request.url);
  if (url.searchParams.get("token") === adminSecret) {
    return true;
  }

  return false;
}

export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Acesso não autorizado. Chave de acesso requerida." }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
