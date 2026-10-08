import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  interpolateTemplate,
  sanitizeWhatsAppNumber,
  DEFAULT_TEMPLATES,
} from "../lib/messaging/engine";
import {
  closeDatabase,
  getDatabase,
  createLead,
  listMessageLogs,
} from "../lib/db";
import { handleMessagesRequest } from "../server/api/messages";

process.env.DB_PATH = ":memory:";
process.env.ADMIN_PASSWORD = "test-admin-secret-2026";

function createAuthRequest(url: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${process.env.ADMIN_PASSWORD}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(url, { ...init, headers });
}

describe("Fase 07: Quick Message Modal & Ações de Leads", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    process.env.ADMIN_PASSWORD = "test-admin-secret-2026";
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("TASK-01: Interpolação de Lead e Fallback para WhatsApp Web", () => {
    test("Sanitiza número de telefone brasileiro e gera link direto wa.me", () => {
      const leadPhone = "(48) 99123-4567";
      const sanitized = sanitizeWhatsAppNumber(leadPhone);
      assert.strictEqual(sanitized, "5548991234567");

      const message = "Olá Thiago! Seu orçamento foi recebido.";
      const waLink = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
      assert.ok(waLink.startsWith("https://wa.me/5548991234567?text="));
      assert.ok(waLink.includes(encodeURIComponent("Olá Thiago!")));
    });

    test("Interpola template padrão de Boas-Vindas com dados completos de um Lead", () => {
      const welcomeTpl = DEFAULT_TEMPLATES.find((t) => t.category === "welcome" && t.channel === "whatsapp");
      assert.ok(welcomeTpl);

      const lead = {
        name: "Mariana Alcantara",
        phone: "(48) 98877-6655",
        email: "mariana@test.com",
        service: "Estúdio Privado (Palhoça)",
        message: "Uma serpente com flores no antebraço esquerdo",
      };

      const interpolated = interpolateTemplate(welcomeTpl.body, {
        nome: lead.name,
        primeiro_nome: lead.name.split(" ")[0],
        telefone: lead.phone,
        email: lead.email,
        local: lead.service,
        ideia: lead.message,
      });

      assert.ok(interpolated.includes("Mariana"));
      assert.ok(interpolated.includes("Uma serpente com flores no antebraço esquerdo"));
      assert.ok(!interpolated.includes("{{"));
    });

    test("Interpola template de Confirmação com local, horário e data da sessão", () => {
      const confirmTpl = DEFAULT_TEMPLATES.find((t) => t.category === "booking_confirm" && t.channel === "whatsapp");
      assert.ok(confirmTpl);

      const interpolated = interpolateTemplate(confirmTpl.body, {
        nome: "Mariana Alcantara",
        primeiro_nome: "Mariana",
        data_agendamento: "22/10/2026",
        horario_agendamento: "14:00",
        local: "Estúdio Privado (Palhoça)",
        ideia: "Serpente floral",
      });

      assert.ok(interpolated.includes("Mariana"));
      assert.ok(interpolated.includes("22/10/2026"));
      assert.ok(interpolated.includes("14:00"));
      assert.ok(interpolated.includes("Estúdio Privado (Palhoça)"));
    });

    test("Interpola template de Cobrança de Sinal com dados personalizados e chave PIX", () => {
      const depositTpl = DEFAULT_TEMPLATES.find((t) => t.category === "deposit_request");
      assert.ok(depositTpl);

      const interpolated = interpolateTemplate(depositTpl.body, {
        nome: "Carlos Eduardo",
        primeiro_nome: "Carlos",
        valor_sinal: "R$ 150,00",
        chave_pix: "pix@karlosarttattoo.com.br",
      });

      assert.ok(interpolated.includes("Carlos"));
      assert.ok(interpolated.includes("R$ 150,00"));
      assert.ok(interpolated.includes("pix@karlosarttattoo.com.br"));
    });
  });

  describe("TASK-02 & TASK-03: Disparo de Mensagem Rápida e Auditoria no Banco", () => {
    test("POST /api/messages/send registra log com lead_id e status failed se não houver credenciais", async () => {
      // Inicia DB criando um lead de teste
      const db = getDatabase();
      const lead = createLead({
        name: "Renata Vasconcelos",
        phone: "(48) 99888-7766",
        email: "renata@teste.com",
        service: "Florianópolis / SJ",
        message: "Tatuagem floral em fine line",
      });

      const payload = {
        leadId: lead.id,
        leadName: lead.name,
        channel: "whatsapp",
        recipient: lead.phone,
        message: "Olá Renata, seu projeto foi aceito!",
      };

      const req = createAuthRequest("http://localhost:3000/api/messages/send", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const res = await handleMessagesRequest(req);
      assert.strictEqual(res.status, 502);
      const json = await res.json();

      assert.strictEqual(json.success, false);
      assert.strictEqual(json.channel, "whatsapp");

      // Verifica se o log foi gravado no banco SQLite com lead_id correspondente
      const logs = listMessageLogs();
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].lead_id, lead.id);
      assert.strictEqual(logs[0].lead_name, "Renata Vasconcelos");
      assert.strictEqual(logs[0].channel, "whatsapp");
      assert.strictEqual(logs[0].status, "failed");
    });
  });
});
