import { z } from "zod";
import { getSettings, updateSetting } from "../../lib/db";
import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";

const updateSingleSettingSchema = z.object({
  key: z.string().min(1, "A chave da configuração é obrigatória"),
  value: z.string(),
});

const updateMultipleSettingsSchema = z.object({
  settings: z.record(z.string()),
});

export async function handleSettingsRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  // 1. GET /api/settings
  if (method === "GET") {
    try {
      const settings = getSettings();
      return jsonResponse({ success: true, settings });
    } catch (err) {
      console.error("[Settings API] Erro ao buscar configurações:", err);
      return jsonResponse({ error: "Erro interno ao buscar configurações." }, 500);
    }
  }

  // 2. PATCH /api/settings
  if (method === "PATCH") {
    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
      }

      // Suporta atualização em lote { settings: { ... } } ou chave única { key, value }
      if (body.settings && typeof body.settings === "object") {
        const parsed = updateMultipleSettingsSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Formato inválido de configurações." }, 422);
        }
        for (const [k, v] of Object.entries(parsed.data.settings)) {
          updateSetting(k, String(v));
        }
      } else {
        const parsed = updateSingleSettingSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Parâmetros 'key' e 'value' são obrigatórios." }, 422);
        }
        updateSetting(parsed.data.key, parsed.data.value);
      }

      const updated = getSettings();
      return jsonResponse({
        success: true,
        message: "Configurações atualizadas com sucesso.",
        settings: updated,
      });
    } catch (err) {
      console.error("[Settings API] Erro ao atualizar configurações:", err);
      return jsonResponse({ error: "Erro interno ao atualizar configurações." }, 500);
    }
  }

  return jsonResponse({ error: `Método ${method} não suportado.` }, 405);
}
