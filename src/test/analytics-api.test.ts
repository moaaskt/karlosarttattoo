import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { normalizePrivateKey, hasGoogleCredentials } from "../server/lib/google-auth";
import {
  getOrSetAnalyticsCache,
  invalidateAnalyticsCache,
  hasValidCache,
} from "../server/lib/analytics-cache";
import { generateMockAnalyticsData } from "../server/lib/analytics-mock";
import { handleAnalyticsRequest } from "../server/api/analytics";

process.env.ADMIN_PASSWORD = "test-admin-secret-2026";

function createAuthRequest(url: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${process.env.ADMIN_PASSWORD}`);
  return new Request(url, { ...init, headers });
}

describe("Integração de Analytics & SEO — Fase 05", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "test-admin-secret-2026";
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GA4_PROPERTY_ID;
    delete process.env.GSC_SITE_URL;
    invalidateAnalyticsCache();
  });

  afterEach(() => {
    invalidateAnalyticsCache();
  });

  describe("TASK-01: Autenticação Google & Normalização de Chave", () => {
    test("normalizePrivateKey trata quebras de linha literais \\n e aspas", () => {
      const raw = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----"';
      const normalized = normalizePrivateKey(raw);
      assert.ok(normalized.includes("BEGIN PRIVATE KEY"));
      assert.ok(normalized.includes("\n"));
      assert.ok(!normalized.startsWith('"'));
      assert.ok(!normalized.endsWith('"'));
    });

    test("hasGoogleCredentials retorna false quando variáveis estão ausentes", () => {
      assert.strictEqual(hasGoogleCredentials(), false);
    });

    test("hasGoogleCredentials retorna true quando credenciais mínimas válidas estão no ambiente", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "sa@karlos-tattoo.iam.gserviceaccount.com";
      process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg\n-----END PRIVATE KEY-----";
      assert.strictEqual(hasGoogleCredentials(), true);
    });
  });

  describe("TASK-02: Gerador de Mock & Cache em Memória", () => {
    test("generateMockAnalyticsData gera payload com cidades de SC e termos de busca coerentes", () => {
      const data = generateMockAnalyticsData("7d", "2026-10-08T10:00:00.000Z");
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.is_mock, true);
      assert.strictEqual(data.period, "7d");
      assert.strictEqual(data.timeline.length, 7);

      // Cidades de SC
      const palhoca = data.geo_cities.find((c) => c.city === "Palhoça");
      const floripa = data.geo_cities.find((c) => c.city === "Florianópolis");
      assert.ok(palhoca, "Deve conter Palhoça nas cidades");
      assert.ok(floripa, "Deve conter Florianópolis nas cidades");

      // Consultas GSC
      assert.ok(data.search_queries.length > 0);
      assert.ok(data.search_queries.some((q) => q.query.includes("tattoo") || q.query.includes("palhoça")));
    });

    test("getOrSetAnalyticsCache armazena e reutiliza dados no TTL", async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return generateMockAnalyticsData("7d");
      };

      const res1 = await getOrSetAnalyticsCache("7d", fetcher);
      assert.strictEqual(callCount, 1);
      assert.strictEqual(hasValidCache("7d"), true);

      const res2 = await getOrSetAnalyticsCache("7d", fetcher);
      assert.strictEqual(callCount, 1, "Segunda chamada deve vir do cache sem executar fetcher");
      assert.strictEqual(res1.cached_at, res2.cached_at);

      // Invalidação
      invalidateAnalyticsCache("7d");
      assert.strictEqual(hasValidCache("7d"), false);

      await getOrSetAnalyticsCache("7d", fetcher);
      assert.strictEqual(callCount, 2, "Após invalidação, fetcher deve ser chamado novamente");
    });
  });

  describe("TASK-03: Endpoint REST /api/analytics", () => {
    test("Rejeita requisições não autorizadas com 401 Unauthorized", async () => {
      const unauthReq = new Request("http://localhost:8080/api/analytics");
      const res = await handleAnalyticsRequest(unauthReq);
      assert.strictEqual(res.status, 401);
    });

    test("Responde OPTIONS com 204 e cabeçalhos CORS", async () => {
      const optReq = new Request("http://localhost:8080/api/analytics", {
        method: "OPTIONS",
      });
      const res = await handleAnalyticsRequest(optReq);
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get("access-control-allow-origin"), "*");
    });

    test("Rejeita métodos não suportados (ex: POST) com 405 Method Not Allowed", async () => {
      const postReq = createAuthRequest("http://localhost:8080/api/analytics", {
        method: "POST",
      });
      const res = await handleAnalyticsRequest(postReq);
      assert.strictEqual(res.status, 405);
    });

    test("GET /api/analytics retorna mock calibrado quando sem credenciais Google", async () => {
      const req = createAuthRequest("http://localhost:8080/api/analytics?period=7d");
      const res = await handleAnalyticsRequest(req);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.is_mock, true);
      assert.strictEqual(json.period, "7d");
      assert.ok(json.summary.total_sessions > 0);
      assert.ok(json.summary.active_users > 0);
      assert.strictEqual(json.timeline.length, 7);
      assert.ok(json.geo_cities.length >= 3);
      assert.ok(json.traffic_sources.length >= 2);
      assert.ok(json.search_queries.length >= 3);
    });

    test("GET /api/analytics com force=true invalida cache e gera novo payload", async () => {
      const req1 = createAuthRequest("http://localhost:8080/api/analytics?period=30d");
      const res1 = await handleAnalyticsRequest(req1);
      assert.strictEqual(res1.status, 200);

      assert.strictEqual(hasValidCache("30d"), true);

      // Chamada com force=true
      const reqForce = createAuthRequest("http://localhost:8080/api/analytics?period=30d&force=true");
      const resForce = await handleAnalyticsRequest(reqForce);
      assert.strictEqual(resForce.status, 200);
      const jsonForce = await resForce.json();
      assert.strictEqual(jsonForce.period, "30d");
      assert.strictEqual(jsonForce.timeline.length, 30);
    });
  });
});
