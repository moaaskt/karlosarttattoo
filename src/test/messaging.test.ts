import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  interpolateTemplate,
  extractVariablesFromTemplate,
  DEFAULT_TEMPLATES,
} from "../lib/messaging/engine";
import { sanitizeWhatsAppNumber } from "../server/lib/messaging-service";
import {
  closeDatabase,
  listMessageTemplates,
  getMessageTemplateById,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  createMessageLog,
  listMessageLogs,
  getMessagingSettings,
  saveMessagingSettings,
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

describe("Módulo de Mensageria Automatizada — Fase 06", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    process.env.ADMIN_PASSWORD = "test-admin-secret-2026";
    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_API_KEY;
    delete process.env.EVOLUTION_INSTANCE_NAME;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("TASK-02: Motor de Interpolação & Extração de Variáveis", () => {
    test("interpolateTemplate substitui tags simples e insensíveis a maiúsculas", () => {
      const template = "Olá {{Nome}}, seu agendamento para {{Ideia}} no {{local}} está confirmado!";
      const data = {
        nome: "Gabriel Souza",
        ideia: "Dragão oriental em blackwork",
        local: "Estúdio Privado em Palhoça",
      };

      const result = interpolateTemplate(template, data);
      assert.strictEqual(
        result,
        "Olá Gabriel Souza, seu agendamento para Dragão oriental em blackwork no Estúdio Privado em Palhoça está confirmado!",
      );
    });

    test("interpolateTemplate deduz primeiro_nome automaticamente quando ausente", () => {
      const template = "Fala {{primeiro_nome}}, tudo certo?";
      const result = interpolateTemplate(template, { nome: "Camila Becker Duarte" });
      assert.strictEqual(result, "Fala Camila, tudo certo?");
    });

    test("interpolateTemplate mapeia sinônimos de dados (client_name, client_phone, idea, location)", () => {
      const template = "Cliente {{nome}} ({{telefone}}) pediu {{ideia}} em {{local}}";
      const leadData = {
        client_name: "Lucas Pereira",
        client_phone: "48991112233",
        idea: "Fênix nas costas",
        location: "domicilio",
      };

      const result = interpolateTemplate(template, leadData);
      assert.strictEqual(
        result,
        "Cliente Lucas Pereira (48991112233) pediu Fênix nas costas em domicilio",
      );
    });

    test("interpolateTemplate limpa variáveis não informadas sem quebrar o texto", () => {
      const template = "Oi {{nome}}! Valor do sinal: {{valor_sinal}} - PIX: {{chave_pix}}";
      const result = interpolateTemplate(template, { nome: "Lucas" });
      assert.strictEqual(result, "Oi Lucas! Valor do sinal:  - PIX: ");
    });

    test("extractVariablesFromTemplate detecta tags únicas normalizadas", () => {
      const body = "Olá {{nome}}, confirmamos sua sessão para {{data_agendamento}} às {{Horario_Agendamento}} com {{Nome}}.";
      const vars = extractVariablesFromTemplate(body);
      assert.strictEqual(vars.length, 3);
      assert.ok(vars.includes("nome"));
      assert.ok(vars.includes("data_agendamento"));
      assert.ok(vars.includes("horario_agendamento"));
    });

    test("DEFAULT_TEMPLATES possui templates padrão completos", () => {
      assert.ok(DEFAULT_TEMPLATES.length >= 5);
      const welcome = DEFAULT_TEMPLATES.find((t) => t.category === "welcome");
      assert.ok(welcome);
      assert.strictEqual(welcome.channel, "whatsapp");
      assert.ok(welcome.body.includes("{{primeiro_nome}}"));
    });
  });

  describe("TASK-03: Sanitização de Telefones para WhatsApp", () => {
    test("sanitizeWhatsAppNumber formata celulares com DDD sem duplicar 55", () => {
      assert.strictEqual(sanitizeWhatsAppNumber("(48) 99123-4567"), "5548991234567");
      assert.strictEqual(sanitizeWhatsAppNumber("048 99123-4567"), "5548991234567");
      assert.strictEqual(sanitizeWhatsAppNumber("48991234567"), "5548991234567");
      assert.strictEqual(sanitizeWhatsAppNumber("5548991234567"), "5548991234567");
      assert.strictEqual(sanitizeWhatsAppNumber("+55 (48) 99123-4567"), "5548991234567");
    });

    test("sanitizeWhatsAppNumber preserva números curtos ou inválidos para tratamento posterior", () => {
      assert.strictEqual(sanitizeWhatsAppNumber("123"), "123");
      assert.strictEqual(sanitizeWhatsAppNumber(""), "");
    });
  });

  describe("TASK-04: Persistência no SQLite (Templates, Logs e Configurações)", () => {
    test("Inicializa templates padrão no banco SQLite via seed", () => {
      const templates = listMessageTemplates();
      assert.ok(templates.length >= 5);
      assert.ok(templates.every((t) => t.id && t.name && t.body));
    });

    test("CRUD de templates funciona perfeitamente", () => {
      const created = createMessageTemplate({
        name: "Template de Teste VIP",
        category: "booking_confirm",
        channel: "whatsapp",
        body: "Olá {{nome}}, sua sessão VIP está confirmada!",
        variables: ["nome"],
        active: true,
      });

      assert.ok(created.id);
      assert.strictEqual(created.name, "Template de Teste VIP");

      const fetched = getMessageTemplateById(created.id);
      assert.ok(fetched);
      assert.strictEqual(fetched.name, "Template de Teste VIP");

      const updated = updateMessageTemplate(created.id, {
        name: "Template de Teste VIP Atualizado",
        active: false,
      });
      assert.ok(updated);
      assert.strictEqual(updated.name, "Template de Teste VIP Atualizado");
      assert.strictEqual(updated.active, false);

      const deleted = deleteMessageTemplate(created.id);
      assert.strictEqual(deleted, true);
      assert.strictEqual(getMessageTemplateById(created.id), null);
    });

    test("createMessageLog e listMessageLogs registram e recuperam histórico", () => {
      const log = createMessageLog({
        lead_id: "lead_123",
        lead_name: "Ana Clara",
        channel: "whatsapp",
        recipient: "5548999998888",
        status: "sent",
        payload: JSON.stringify({ body: "Mensagem de teste" }),
      });

      assert.ok(log.id);
      assert.strictEqual(log.status, "sent");

      const logs = listMessageLogs(10);
      assert.ok(logs.length >= 1);
      assert.strictEqual(logs[0].recipient, "5548999998888");
    });

    test("saveMessagingSettings e getMessagingSettings persistem configurações no banco", () => {
      saveMessagingSettings({
        evolutionUrl: "https://api.evolution.exemplo.com",
        evolutionApiKey: "minha-chave-secreta",
        instanceName: "karlos-tattoo-principal",
      });

      const config = getMessagingSettings();
      assert.strictEqual(config.evolutionUrl, "https://api.evolution.exemplo.com");
      assert.strictEqual(config.evolutionApiKey, "minha-chave-secreta");
      assert.strictEqual(config.instanceName, "karlos-tattoo-principal");
    });
  });

  describe("TASK-05: Rotas de API /api/messages/*", () => {
    test("Rejeita requisições não autorizadas com 401 Unauthorized", async () => {
      const unauthReq = new Request("http://localhost:8080/api/messages/templates");
      const res = await handleMessagesRequest(unauthReq);
      assert.strictEqual(res.status, 401);
    });

    test("OPTIONS responde 204 com cabeçalhos CORS", async () => {
      const optReq = new Request("http://localhost:8080/api/messages/templates", {
        method: "OPTIONS",
      });
      const res = await handleMessagesRequest(optReq);
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get("access-control-allow-origin"), "*");
    });

    test("GET /api/messages/templates retorna lista de templates", async () => {
      const req = createAuthRequest("http://localhost:8080/api/messages/templates");
      const res = await handleMessagesRequest(req);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.ok(Array.isArray(json.templates));
      assert.ok(json.templates.length >= 5);
    });

    test("POST /api/messages/templates valida corpo com Zod e retorna 201 ao criar", async () => {
      const invalidReq = createAuthRequest("http://localhost:8080/api/messages/templates", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const invalidRes = await handleMessagesRequest(invalidReq);
      assert.strictEqual(invalidRes.status, 422);

      const validReq = createAuthRequest("http://localhost:8080/api/messages/templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Novo Template API",
          category: "promo",
          channel: "whatsapp",
          body: "Olá {{nome}}, temos novidades!",
        }),
      });
      const validRes = await handleMessagesRequest(validReq);
      assert.strictEqual(validRes.status, 201);
      const json = await validRes.json();
      assert.ok(json.template.id);
      assert.strictEqual(json.template.name, "Novo Template API");
      assert.ok(json.template.variables.includes("nome"));
    });

    test("POST /api/messages/send sem credenciais configuradas retorna 502 e registra log", async () => {
      const sendReq = createAuthRequest("http://localhost:8080/api/messages/send", {
        method: "POST",
        body: JSON.stringify({
          channel: "whatsapp",
          recipient: "(48) 99123-4567",
          body: "Olá {{nome}}, este é um teste!",
          variables_data: { nome: "Rodrigo" },
          lead_id: "lead_teste",
          lead_name: "Rodrigo",
        }),
      });

      const res = await sendMessagesReqHelper(sendReq);
      // Sem credenciais Evolution API configuradas no ambiente, deve retornar 502 Bad Gateway com o erro
      assert.strictEqual(res.status, 502);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes("Credenciais da Evolution API"));
      assert.ok(json.logId);

      // Confere se o log de erro foi gravado no banco
      const logs = listMessageLogs(1);
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].status, "failed");
      assert.strictEqual(logs[0].recipient, "5548991234567");
      assert.ok(logs[0].error.includes("Credenciais da Evolution API"));
    });
  });
});

async function sendMessagesReqHelper(req: Request) {
  return await handleMessagesRequest(req);
}
