import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { closeDatabase, getDatabase, createMessageTemplate } from "../lib/db";
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

describe("Fase 08: Messaging Administration Hub & Quality Assurance", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    process.env.ADMIN_PASSWORD = "test-admin-secret-2026";
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("TASK-01: CRUD Administrativo de Templates (/api/messages/templates)", () => {
    test("POST /api/messages/templates cria template com variáveis dinâmicas extraídas", async () => {
      const payload = {
        name: "Lembrete Personalizado VIP",
        category: "reminder",
        channel: "whatsapp",
        body: "Olá {{primeiro_nome}}, sua sessão para {{ideia}} está confirmada no {{local}}!",
        active: true,
      };

      const req = createAuthRequest("http://localhost:3000/api/messages/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const res = await handleMessagesRequest(req);
      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.ok(data.template);
      assert.strictEqual(data.template.name, "Lembrete Personalizado VIP");
      assert.strictEqual(data.template.channel, "whatsapp");
      assert.ok(Array.isArray(data.template.variables));
      assert.ok(data.template.variables.includes("primeiro_nome"));
      assert.ok(data.template.variables.includes("ideia"));
      assert.ok(data.template.variables.includes("local"));
    });

    test("PATCH /api/messages/templates/:id atualiza campos e re-extrai variáveis se corpo mudar", async () => {
      // Cria template inicial
      const created = createMessageTemplate({
        name: "Template Provisório",
        category: "promo",
        channel: "email",
        subject: "Novidades do Mês",
        body: "Olá {{nome}}, temos flash tattoos!",
        variables: ["nome"],
        active: true,
      });

      const updatePayload = {
        name: "Flash Tattoo de Outono",
        subject: "Vagas Abertas — Karlos Art Tattoo",
        body: "Olá {{primeiro_nome}}, veja as vagas para {{estilo}} em {{local}}!",
      };

      const req = createAuthRequest(`http://localhost:3000/api/messages/templates/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload),
      });

      const res = await handleMessagesRequest(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.template.name, "Flash Tattoo de Outono");
      assert.strictEqual(data.template.subject, "Vagas Abertas — Karlos Art Tattoo");
      assert.ok(data.template.variables.includes("primeiro_nome"));
      assert.ok(data.template.variables.includes("estilo"));
      assert.ok(data.template.variables.includes("local"));
    });

    test("DELETE /api/messages/templates/:id remove template com sucesso", async () => {
      const created = createMessageTemplate({
        name: "Template Para Exclusão",
        category: "post_care",
        channel: "whatsapp",
        body: "Cuidados pós-tattoo",
        variables: [],
        active: false,
      });

      const req = createAuthRequest(`http://localhost:3000/api/messages/templates/${created.id}`, {
        method: "DELETE",
      });

      const res = await handleMessagesRequest(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Confirma que não é mais encontrado
      const checkReq = createAuthRequest(`http://localhost:3000/api/messages/templates/${created.id}`);
      const checkRes = await handleMessagesRequest(checkReq);
      assert.strictEqual(checkRes.status, 404);
    });
  });

  describe("TASK-03: Configurações de Conexão e Auditoria de Logs", () => {
    test("PATCH /api/messages/config grava configurações e GET /api/messages/config mascara segredos", async () => {
      const patchReq = createAuthRequest("http://localhost:3000/api/messages/config", {
        method: "PATCH",
        body: JSON.stringify({
          evolutionUrl: "https://evolution.karlos.art",
          evolutionApiKey: "secret_evolution_key_999",
          instanceName: "karlos-prod",
          smtpHost: "smtp.resend.com",
          smtpPort: 587,
          smtpUser: "resend",
          smtpPass: "re_secret_password_123",
          smtpFrom: "Karlos Art <contato@karlos.art>",
        }),
      });

      const patchRes = await handleMessagesRequest(patchReq);
      assert.strictEqual(patchRes.status, 200);
      const patchData = await patchRes.json();
      assert.strictEqual(patchData.success, true);
      assert.strictEqual(patchData.config.evolutionUrl, "https://evolution.karlos.art");
      assert.strictEqual(patchData.config.instanceName, "karlos-prod");

      // Consulta GET de segurança
      const getReq = createAuthRequest("http://localhost:3000/api/messages/config");
      const getRes = await handleMessagesRequest(getReq);
      assert.strictEqual(getRes.status, 200);
      const getData = await getRes.json();
      assert.strictEqual(getData.config.hasEvolutionKey, true);
      assert.strictEqual(getData.config.hasSmtpPass, true);
    });

    test("POST /api/messages/test-connection retorna diagnóstico estruturado para WhatsApp e SMTP", async () => {
      const waReq = createAuthRequest("http://localhost:3000/api/messages/test-connection", {
        method: "POST",
        body: JSON.stringify({
          channel: "whatsapp",
          config: {
            evolutionUrl: "https://invalida.teste",
            evolutionApiKey: "key",
            instanceName: "inst",
          },
        }),
      });

      const waRes = await handleMessagesRequest(waReq);
      assert.strictEqual(waRes.status, 200);
      const waData = await waRes.json();
      assert.strictEqual(typeof waData.success, "boolean");

      const smtpReq = createAuthRequest("http://localhost:3000/api/messages/test-connection", {
        method: "POST",
        body: JSON.stringify({
          channel: "email",
          config: {
            smtpHost: "invalido.host.local",
            smtpPort: 587,
          },
        }),
      });

      const smtpRes = await handleMessagesRequest(smtpReq);
      assert.strictEqual(smtpRes.status, 200);
      const smtpData = await smtpRes.json();
      assert.strictEqual(typeof smtpData.success, "boolean");
    });

    test("GET /api/messages/logs retorna histórico com limite respeitado", async () => {
      const req = createAuthRequest("http://localhost:3000/api/messages/logs?limit=10");
      const res = await handleMessagesRequest(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.logs));
    });
  });
});
