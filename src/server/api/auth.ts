import crypto from "node:crypto";

/**
 * Autenticação e utilitários HTTP compartilhados para APIs administrativas do Karlos Art Tattoo.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Compara duas strings em tempo constante para proteção contra timing attacks.
 */
function safeCompare(candidate: string, secret: string): boolean {
  if (typeof candidate !== "string" || typeof secret !== "string") {
    return false;
  }
  const bufA = Buffer.from(candidate);
  const bufB = Buffer.from(secret);
  if (bufA.length !== bufB.length) {
    // Executa uma comparação dummy para reduzir variação de timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extrai o valor de um cookie específico do header Cookie.
 */
function getCookieValue(cookieHeader: string, cookieName: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Valida autorização administrativa via Header Bearer, Cookie admin_token ou Query token.
 * 
 * REGRA DE SEGURANÇA CRÍTICA:
 * Se ADMIN_PASSWORD não estiver configurado no ambiente, recusa categoricamente
 * qualquer acesso administrativo (sem senhas de fallback hardcoded).
 */
export function isAuthorized(request: Request): boolean {
  const adminSecret = process.env.ADMIN_PASSWORD;
  if (!adminSecret || adminSecret.trim() === "") {
    // Sem senha administrativa configurada, bloqueio total
    return false;
  }

  // 1. Bearer Token no Authorization Header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.substring(7).trim();
    if (safeCompare(candidate, adminSecret)) {
      return true;
    }
  }

  // 2. Cookie admin_token
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieCandidate = getCookieValue(cookieHeader, "admin_token");
  if (cookieCandidate && safeCompare(cookieCandidate, adminSecret)) {
    return true;
  }

  // 3. Query param ?token=
  const url = new URL(request.url);
  const queryCandidate = url.searchParams.get("token");
  if (queryCandidate && safeCompare(queryCandidate, adminSecret)) {
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

export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(extraHeaders || {}) },
  });
}
