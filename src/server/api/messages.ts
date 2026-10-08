import { z } from "zod";
import {
  isAuthorized,
  unauthorizedResponse,
  jsonResponse,
  corsHeaders,
} from "./auth";
import {
  listMessageTemplates,
  getMessageTemplateById,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  createMessageLog,
  listMessageLogs,
  getMessagingSettings,
  saveMessagingSettings,
} from "../../lib/db";
import {
  interpolateTemplate,
  extractVariablesFromTemplate,
} from "../../lib/messaging/engine";
import {
  sendWhatsAppMessage,
  sendEmailMessage,
  testEvolutionConnection,
  testSmtpConnection,
} from "../lib/messaging-service";
import type { Channel, TemplateCategory } from "../../lib/messaging/types";

// Esquemas de Validação Zod
const createTemplateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório"),
  category: z.enum([
    "welcome",
    "deposit_request",
    "booking_confirm",
    "reminder",
    "post_care",
    "promo",
  ]),
  channel: z.enum(["whatsapp", "email"]),
  subject: z.string().optional(),
  body: z.string().min(1, "Corpo da mensagem é obrigatório"),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional().default(true),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z
    .enum(["welcome", "deposit_request", "booking_confirm", "reminder", "post_care", "promo"])
    .optional(),
  channel: z.enum(["whatsapp", "email"]).optional(),
  subject: z.string().optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

const sendMessageSchema = z.object({
  channel: z.enum(["whatsapp", "email"]),
  recipient: z.string().min(1, "Destinatário é obrigatório"),
  body: z.string().optional(),
  template_id: z.string().optional(),
  subject: z.string().optional(),
  lead_id: z.string().optional(),
  lead_name: z.string().optional(),
  variables_data: z.record(z.any()).optional(),
});

const testConnectionSchema = z.object({
  channel: z.enum(["whatsapp", "email"]),
  config: z
    .object({
      evolutionUrl: z.string().optional(),
      evolutionApiKey: z.string().optional(),
      instanceName: z.string().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPass: z.string().optional(),
      smtpFrom: z.string().optional(),
    })
    .optional(),
});

const updateConfigSchema = z.object({
  evolutionUrl: z.string().optional(),
  evolutionApiKey: z.string().optional(),
  instanceName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().optional(),
});

export async function handleMessagesRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  try {
    // 1. /api/messages/templates
    if (pathname === "/api/messages/templates") {
      if (method === "GET") {
        const templates = listMessageTemplates();
        return jsonResponse({ templates });
      }

      if (method === "POST") {
        const bodyText = await request.text();
        const json = bodyText ? JSON.parse(bodyText) : {};
        const parsed = createTemplateSchema.safeParse(json);

        if (!parsed.success) {
          return jsonResponse(
            { error: "Dados inválidos para template", details: parsed.error.format() },
            422,
          );
        }

        const vars =
          parsed.data.variables && parsed.data.variables.length > 0
            ? parsed.data.variables
            : extractVariablesFromTemplate(parsed.data.body);

        const created = createMessageTemplate({
          name: parsed.data.name,
          category: parsed.data.category as TemplateCategory,
          channel: parsed.data.channel as Channel,
          subject: parsed.data.subject,
          body: parsed.data.body,
          variables: vars,
          active: parsed.data.active ?? true,
        });

        return jsonResponse({ template: created }, 201);
      }
    }

    // 2. /api/messages/templates/:id
    const templateIdMatch = pathname.match(/^\/api\/messages\/templates\/([^/]+)$/);
    if (templateIdMatch) {
      const templateId = templateIdMatch[1];

      if (method === "GET") {
        const tpl = getMessageTemplateById(templateId);
        if (!tpl) return jsonResponse({ error: "Template não encontrado" }, 404);
        return jsonResponse({ template: tpl });
      }

      if (method === "PATCH") {
        const bodyText = await request.text();
        const json = bodyText ? JSON.parse(bodyText) : {};
        const parsed = updateTemplateSchema.safeParse(json);

        if (!parsed.success) {
          return jsonResponse(
            { error: "Dados inválidos para atualização", details: parsed.error.format() },
            422,
          );
        }

        let vars = parsed.data.variables;
        if (!vars && parsed.data.body) {
          vars = extractVariablesFromTemplate(parsed.data.body);
        }

        const updated = updateMessageTemplate(templateId, {
          ...parsed.data,
          variables: vars,
        });

        if (!updated) return jsonResponse({ error: "Template não encontrado" }, 404);
        return jsonResponse({ template: updated });
      }

      if (method === "DELETE") {
        const success = deleteMessageTemplate(templateId);
        if (!success) return jsonResponse({ error: "Template não encontrado" }, 404);
        return jsonResponse({ success: true, message: "Template excluído com sucesso" });
      }
    }

    // 3. /api/messages/send
    if (pathname === "/api/messages/send" && method === "POST") {
      const bodyText = await request.text();
      const json = bodyText ? JSON.parse(bodyText) : {};
      const parsed = sendMessageSchema.safeParse(json);

      if (!parsed.success) {
        return jsonResponse(
          { error: "Dados de envio inválidos", details: parsed.error.format() },
          422,
        );
      }

      const {
        channel,
        recipient,
        template_id,
        lead_id,
        lead_name,
        variables_data = {},
      } = parsed.data;

      let finalBody = parsed.data.body || "";
      let finalSubject = parsed.data.subject || "";

      // Se template_id foi informado, busca o modelo
      if (template_id) {
        const tpl = getMessageTemplateById(template_id);
        if (!tpl) {
          return jsonResponse({ error: `Template id '${template_id}' não encontrado` }, 404);
        }
        finalBody = tpl.body;
        if (tpl.subject && !finalSubject) {
          finalSubject = tpl.subject;
        }
      }

      if (!finalBody.trim()) {
        return jsonResponse({ error: "O corpo da mensagem não pode estar vazio" }, 422);
      }

      // Interpolação de variáveis
      const interpolatedBody = interpolateTemplate(finalBody, variables_data);
      const interpolatedSubject = finalSubject
        ? interpolateTemplate(finalSubject, variables_data)
        : "";

      const currentConfig = getMessagingSettings();

      let sendResult;
      if (channel === "whatsapp") {
        sendResult = await sendWhatsAppMessage({
          recipient,
          message: interpolatedBody,
          config: currentConfig,
        });
      } else {
        sendResult = await sendEmailMessage({
          recipient,
          subject: interpolatedSubject || "Karlos Art Tattoo",
          body: interpolatedBody,
          config: currentConfig,
        });
      }

      // Gravação do log no SQLite
      const log = createMessageLog({
        lead_id,
        lead_name,
        channel,
        recipient: sendResult.recipient || recipient,
        status: sendResult.success ? "sent" : "failed",
        error: sendResult.error,
        payload: JSON.stringify({
          subject: interpolatedSubject || undefined,
          body: interpolatedBody,
        }),
      });

      sendResult.logId = log.id;

      if (!sendResult.success) {
        return jsonResponse(
          {
            success: false,
            error: sendResult.error,
            logId: log.id,
            channel,
            recipient,
          },
          502,
        );
      }

      return jsonResponse({
        success: true,
        messageId: sendResult.messageId,
        logId: log.id,
        channel,
        recipient: sendResult.recipient,
      });
    }

    // 4. /api/messages/test-connection
    if (pathname === "/api/messages/test-connection" && method === "POST") {
      const bodyText = await request.text();
      const json = bodyText ? JSON.parse(bodyText) : {};
      const parsed = testConnectionSchema.safeParse(json);

      if (!parsed.success) {
        return jsonResponse({ error: "Payload inválido", details: parsed.error.format() }, 422);
      }

      const { channel, config } = parsed.data;
      const mergedConfig = { ...getMessagingSettings(), ...config };

      let result;
      if (channel === "whatsapp") {
        result = await testEvolutionConnection(mergedConfig);
      } else {
        result = await testSmtpConnection(mergedConfig);
      }

      return jsonResponse(result);
    }

    // 5. /api/messages/logs
    if (pathname === "/api/messages/logs" && method === "GET") {
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit ? Math.max(1, Math.min(200, Number(rawLimit))) : 50;
      const logs = listMessageLogs(limit);
      return jsonResponse({ logs });
    }

    // 6. /api/messages/config
    if (pathname === "/api/messages/config") {
      if (method === "GET") {
        const config = getMessagingSettings();
        // Mascara chaves sensíveis para segurança da exibição
        const safeConfig = {
          ...config,
          hasSmtpPass: Boolean(config.smtpPass),
          hasEvolutionKey: Boolean(config.evolutionApiKey),
        };
        return jsonResponse({ config: safeConfig });
      }

      if (method === "PATCH") {
        const bodyText = await request.text();
        const json = bodyText ? JSON.parse(bodyText) : {};
        const parsed = updateConfigSchema.safeParse(json);

        if (!parsed.success) {
          return jsonResponse({ error: "Configuração inválida", details: parsed.error.format() }, 422);
        }

        saveMessagingSettings(parsed.data);
        const updated = getMessagingSettings();
        return jsonResponse({
          success: true,
          config: {
            ...updated,
            hasSmtpPass: Boolean(updated.smtpPass),
            hasEvolutionKey: Boolean(updated.evolutionApiKey),
          },
        });
      }
    }

    return jsonResponse({ error: "Rota de mensageria não encontrada" }, 404);
  } catch (err: any) {
    console.error("[Messages API] Erro interno:", err);
    return jsonResponse({ error: "Erro interno no processamento de mensagens" }, 500);
  }
}
