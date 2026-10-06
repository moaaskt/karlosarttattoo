import { z } from "zod";
import { createLead, listLeads, updateLeadStatus, getLeadStats, type Lead } from "../../lib/db";

// Esquema de validação Zod para novos leads (D-08)
export const createLeadSchema = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório" })
    .min(2, "Nome deve ter ao menos 2 caracteres"),
  phone: z
    .string({ required_error: "WhatsApp/Telefone é obrigatório" })
    .min(8, "Telefone inválido"),
  email: z.string({ required_error: "E-mail é obrigatório" }).email("E-mail com formato inválido"),
  service: z
    .string({ required_error: "Local/Tipo de atendimento é obrigatório" })
    .min(1, "Selecione o local de atendimento"),
  message: z.string().optional().default(""),
});

export const updateStatusSchema = z.object({
  id: z.string().min(1, "ID do lead é obrigatório"),
  status: z.enum(["novo", "contatado", "agendado", "arquivado"], {
    required_error: "Status é obrigatório",
  }),
});

// Rotina de notificação automática a cada novo lead recebido (D-10)
async function triggerLeadNotification(lead: Lead) {
  const notificationPayload = {
    event: "NEW_LEAD",
    timestamp: lead.createdAt,
    artist: "Karlos Art Tattoo",
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      service: lead.service,
      message: lead.message,
    },
  };

  // Se houver WEBHOOK_NOTIFICATION_URL configurado em variáveis de ambiente, dispara webhook
  const webhookUrl = process.env.WEBHOOK_NOTIFICATION_URL || process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPayload),
      });
      console.log(`[Notification] Webhook enviado com sucesso para ${webhookUrl}`);
    } catch (err) {
      console.error("[Notification] Falha ao disparar webhook de lead:", err);
    }
  } else {
    // Log estruturado do lead no console do servidor
    console.log(
      `\n🔔 [NOVO LEAD RECEBIDO] Karlos Art Tattoo\n` +
        `👤 Nome: ${lead.name}\n` +
        `📱 WhatsApp: ${lead.phone}\n` +
        `✉️ E-mail: ${lead.email}\n` +
        `📍 Atendimento: ${lead.service}\n` +
        `💬 Mensagem: ${lead.message}\n` +
        `🕒 Data: ${lead.createdAt}\n`,
    );
  }
}

import { isAuthorized } from "./auth";

/**
 * Handler principal para rota de API /api/leads
 * Suporta POST (criação pública de lead), GET (listagem + stats) e PATCH (atualização de status)
 */
export async function handleLeadsRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  // CORS headers para compatibilidade total
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 1. POST: Criação de novo lead vindo do BookingModal (público)
  if (method === "POST") {
    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return new Response(JSON.stringify({ error: "Corpo da requisição inválido ou vazio." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validation = createLeadSchema.safeParse(body);
      if (!validation.success) {
        const errorMessages = validation.error.errors.map((e) => e.message).join(", ");
        return new Response(
          JSON.stringify({ error: errorMessages, details: validation.error.format() }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const newLead = createLead(validation.data);

      // Disparo assíncrono da notificação
      triggerLeadNotification(newLead).catch((err) =>
        console.error("[Notification] Erro assíncrono:", err),
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Solicitação de agendamento registrada com sucesso!",
          leadId: newLead.id,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      console.error("[Leads API] Erro ao processar POST:", err);
      return new Response(
        JSON.stringify({ error: "Erro interno no servidor ao registrar lead." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // 2. GET: Listagem de leads e estatísticas (protegido para dashboard /admin)
  if (method === "GET") {
    if (!isAuthorized(request)) {
      return new Response(
        JSON.stringify({ error: "Acesso não autorizado. Chave de acesso requerida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      const url = new URL(request.url);
      const statusFilter = url.searchParams.get("status") || undefined;
      const leads = listLeads(statusFilter);
      const stats = getLeadStats();

      return new Response(
        JSON.stringify({
          success: true,
          leads,
          stats,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      console.error("[Leads API] Erro ao listar leads:", err);
      return new Response(JSON.stringify({ error: "Erro interno ao consultar leads." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 3. PATCH: Atualização de status do lead
  if (method === "PATCH") {
    if (!isAuthorized(request)) {
      return new Response(
        JSON.stringify({ error: "Acesso não autorizado. Chave de acesso requerida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      const body = await request.json().catch(() => null);
      const validation = updateStatusSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: validation.error.errors[0]?.message || "Dados inválidos." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const updated = updateLeadStatus(validation.data.id, validation.data.status);
      if (!updated) {
        return new Response(JSON.stringify({ error: "Lead não encontrado." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Status do lead atualizado com sucesso." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      console.error("[Leads API] Erro ao atualizar status:", err);
      return new Response(JSON.stringify({ error: "Erro interno ao atualizar status do lead." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: `Método ${method} não suportado.` }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
