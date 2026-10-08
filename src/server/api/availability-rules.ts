import { z } from "zod";
import {
  listAvailabilityRules,
  upsertAvailabilityRule,
  replaceAvailabilityRules,
  deleteAvailabilityRule,
} from "../../lib/db";
import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";

const timeFormatRe = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ruleSchema = z
  .object({
    id: z.string().optional(),
    day_of_week: z.number().int().min(0, "Dia da semana deve ser entre 0 e 6").max(6),
    window_start: z.string().regex(timeFormatRe, "Formato HH:mm esperado (ex: 09:00)"),
    window_end: z.string().regex(timeFormatRe, "Formato HH:mm esperado (ex: 18:00)"),
    is_active: z.number().int().min(0).max(1).optional().default(1),
  })
  .refine((data) => data.window_end > data.window_start, {
    message: "window_end deve ser posterior a window_start",
    path: ["window_end"],
  });

const batchRulesSchema = z.object({
  rules: z.array(ruleSchema),
});

export async function handleAvailabilityRulesRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const pathParts = url.pathname
    .replace(/^\/api\/availability-rules\/?/, "")
    .split("/")
    .filter(Boolean);

  // 1. GET /api/availability-rules
  if (method === "GET") {
    try {
      const rules = listAvailabilityRules();
      return jsonResponse({ success: true, rules });
    } catch (err) {
      console.error("[AvailabilityRules API] Erro ao listar regras:", err);
      return jsonResponse({ error: "Erro interno ao listar regras de disponibilidade." }, 500);
    }
  }

  // 2. PUT /api/availability-rules (substituição em lote com anti-sobreposição atômica)
  if (method === "PUT" && pathParts.length === 0) {
    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
      }

      const parsed = batchRulesSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "Formato inválido de regras de disponibilidade.",
            details: parsed.error.format(),
          },
          422,
        );
      }

      const rules = replaceAvailabilityRules(parsed.data.rules);
      return jsonResponse({
        success: true,
        message: "Regras de disponibilidade atualizadas com sucesso.",
        rules,
      });
    } catch (err: any) {
      console.error("[AvailabilityRules API] Erro ao atualizar regras em lote:", err);
      return jsonResponse(
        {
          error: err.message || "Erro ao atualizar regras de disponibilidade.",
        },
        422,
      );
    }
  }

  // 2. POST /api/availability-rules (criação / atualização)
  if (method === "POST" && pathParts.length === 0) {
    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
      }

      const parsed = ruleSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "Dados de regra inválidos.",
            details: parsed.error.format(),
          },
          422,
        );
      }

      const rule = upsertAvailabilityRule(parsed.data);
      return jsonResponse({ success: true, rule }, 201);
    } catch (err) {
      console.error("[AvailabilityRules API] Erro ao salvar regra:", err);
      return jsonResponse({ error: "Erro interno ao salvar regra de disponibilidade." }, 500);
    }
  }

  // 3. DELETE /api/availability-rules/:id
  if (method === "DELETE" && pathParts.length === 1) {
    const id = pathParts[0];
    try {
      const deleted = deleteAvailabilityRule(id);
      if (!deleted) {
        return jsonResponse({ error: "Regra não encontrada." }, 404);
      }
      return jsonResponse({ success: true, message: "Regra excluída com sucesso." });
    } catch (err) {
      console.error(`[AvailabilityRules API] Erro ao deletar regra ${id}:`, err);
      return jsonResponse({ error: "Erro interno ao excluir regra de disponibilidade." }, 500);
    }
  }

  return jsonResponse({ error: `Método ${method} não suportado.` }, 405);
}
