import { z } from "zod";
import { getSettings, updateSetting, updateSettingsBatch } from "../../lib/db";
import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";

const timeFormatRe = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateSettingEntry(key: string, value: string): { valid: boolean; error?: string } {
  if (key === "timezone") {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
    } catch {
      return { valid: false, error: `Fuso horário IANA inválido: '${value}'.` };
    }
  } else if (key === "buffer_minutes") {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 240) {
      return { valid: false, error: "buffer_minutes deve ser um número inteiro entre 0 e 240 minutos." };
    }
  } else if (key === "presets") {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return { valid: false, error: "presets deve ser um array JSON de horários no formato HH:mm." };
      }
      for (const item of parsed) {
        if (typeof item !== "string" || !timeFormatRe.test(item)) {
          return { valid: false, error: `Preset inválido '${item}'. Formato esperado: HH:mm (ex: 14:00).` };
        }
      }
    } catch {
      return { valid: false, error: "presets deve ser um JSON válido contendo lista de horários HH:mm." };
    }
  }
  return { valid: true };
}

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

        const entries = Object.entries(parsed.data.settings);
        for (const [k, v] of entries) {
          const val = validateSettingEntry(k, String(v));
          if (!val.valid) {
            return jsonResponse({ error: val.error, key: k }, 422);
          }
        }

        updateSettingsBatch(parsed.data.settings);
      } else {
        const parsed = updateSingleSettingSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Parâmetros 'key' e 'value' são obrigatórios." }, 422);
        }

        const val = validateSettingEntry(parsed.data.key, parsed.data.value);
        if (!val.valid) {
          return jsonResponse({ error: val.error, key: parsed.data.key }, 422);
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
