import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getDatabase,
  closeDatabase,
  createLead,
  createBooking,
  getBookingById,
  createTimeBlock,
} from "../lib/db";
import { handleBookingsRequest } from "../server/api/bookings";

// Assegura execução em memória para isolamento total
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

describe("Contratos de API, Bloqueio 405 e Sincronização Lead ↔ Booking (TASK-14, 15, 17)", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    process.env.ADMIN_PASSWORD = "test-admin-secret-2026";
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  // =========================================================================
  // TASK-14: Contrato 405 Method Not Allowed e Cabeçalho Allow
  // =========================================================================
  describe("TASK-14 — Bloqueio 405 Method Not Allowed e Contratos de Erro", () => {
    test("DELETE /api/bookings retorna 405, header Allow: GET, PATCH e mensagem padronizada", async () => {
      // Cria booking prévio para validar que não é removido
      const b = createBooking(
        {
          client_name: "Cliente Inalterado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      const req = createAuthRequest(`http://localhost:8080/api/bookings/${b.booking.id}`, {
        method: "DELETE",
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 405, "Status deve ser 405 Method Not Allowed");
      assert.equal(res.headers.get("Allow"), "GET, PATCH", "Header Allow deve ser 'GET, PATCH'");

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(
        body.error,
        "Agendamentos não podem ser excluídos fisicamente. Utilize PATCH para atualizar o status para 'cancelado'.",
      );

      // Garante que o agendamento permanece intacto na base
      const check = getBookingById(b.booking.id);
      assert.ok(check, "Registro físico não pode ser excluído");
    });

    test("POST /api/bookings com payload inválido retorna 422 tipado Zod", async () => {
      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          client_name: "A", // muito curto (< 2)
          client_phone: "123", // inválido (< 8 dígitos)
          start_at: "data-invalida",
          end_at: "data-invalida",
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.ok(body.error);
      assert.ok(body.details);
    });

    test("Conflito duro de horário retorna 409 com conflict_type tipado", async () => {
      // Cria booking base (13:00-15:00 UTC)
      createBooking(
        {
          client_name: "Base Existente",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );

      // Tenta criar sobreposto
      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Colidente",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T14:00:00.000Z",
          end_at: "2026-10-15T16:00:00.000Z",
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.conflict_type, "booking_conflict");
      assert.ok(Array.isArray(body.conflicts));
      assert.equal(body.conflicts.length, 1);
    });
  });

  // =========================================================================
  // TASK-15: Sincronização Atômica Lead ↔ Booking & Rollback com Trigger
  // =========================================================================
  describe("TASK-15 — Sincronização Atômica Lead ↔ Booking", () => {
    test("POST /api/bookings com lead_id inexistente retorna 422 e não cria booking (rollback)", async () => {
      const db = getDatabase();
      const countBefore = (db.prepare("SELECT COUNT(*) as c FROM bookings").get() as any).c;

      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          lead_id: "lead_inexistente_123",
          client_name: "Cliente Fantasma",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          force: true,
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.error, "Lead informado não existe");

      const countAfter = (db.prepare("SELECT COUNT(*) as c FROM bookings").get() as any).c;
      assert.equal(
        countAfter,
        countBefore,
        "Nenhum booking deve ser persistido em caso de lead inválido",
      );
    });

    test("POST /api/bookings com lead_id existente avança lead de 'novo' para 'agendado'", async () => {
      const db = getDatabase();
      const lead = createLead({
        name: "Lead Para Agendar",
        phone: "48999993333",
        email: "lead@teste.com",
        service: "tatuagem",
        message: "Quero fechar o braço",
      });
      assert.equal(lead.status, "novo");

      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          lead_id: lead.id,
          client_name: "Lead Para Agendar",
          client_phone: "48999993333",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          force: true,
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.ok(body.booking);

      // Confere que lead avançou para agendado
      const updatedLead = db.prepare("SELECT status FROM leads WHERE id = ?").get(lead.id) as any;
      assert.equal(updatedLead.status, "agendado");

      // Confere auditoria lead_linked em booking_events
      const bDetail = getBookingById(body.booking.id);
      assert.ok(bDetail?.events.some((e) => e.event_type === "lead_linked"));
    });

    test("Lead em 'arquivado' não regride ao vincular novo booking", async () => {
      const db = getDatabase();
      const lead = createLead({
        name: "Lead Arquivado",
        phone: "48999994444",
        email: "arquivado@teste.com",
        service: "tatuagem",
      });
      db.prepare("UPDATE leads SET status = 'arquivado' WHERE id = ?").run(lead.id);

      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          lead_id: lead.id,
          client_name: "Lead Arquivado",
          client_phone: "48999994444",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          force: true,
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 201);

      const checkLead = db.prepare("SELECT status FROM leads WHERE id = ?").get(lead.id) as any;
      assert.equal(checkLead.status, "arquivado", "Lead arquivado não deve regredir");
    });

    test("Cancelamento atômico recua lead para 'contatado' quando sem outros bookings ativos", async () => {
      const db = getDatabase();
      const lead = createLead({
        name: "Lead Cancelamento",
        phone: "48999995555",
        email: "canc@teste.com",
        service: "tatuagem",
      });

      const b = createBooking(
        {
          lead_id: lead.id,
          client_name: lead.name,
          client_phone: lead.phone,
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      // Cancela o booking via PATCH /api/bookings/:id/status
      const req = createAuthRequest(`http://localhost:8080/api/bookings/${b.booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelado" }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 200);

      // Como o lead não possui outros bookings, recua para contatado (não para novo)
      const checkLead = db.prepare("SELECT status FROM leads WHERE id = ?").get(lead.id) as any;
      assert.equal(
        checkLead.status,
        "contatado",
        "Lead deve recuar para contatado ao perder todos bookings",
      );
    });

    test("Teste de rollback obrigatório com trigger SQLite BEFORE UPDATE ON leads", async () => {
      const db = getDatabase();
      const lead = createLead({
        name: "Lead Rollback Test",
        phone: "48999996666",
        email: "rollback@teste.com",
        service: "tatuagem",
      });

      const b = createBooking(
        {
          lead_id: lead.id,
          client_name: lead.name,
          client_phone: lead.phone,
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      // Cria trigger temporário simulando falha no update de lead
      db.exec(`
        CREATE TRIGGER test_fail_lead_update
        BEFORE UPDATE ON leads
        FOR EACH ROW
        BEGIN
          SELECT RAISE(ABORT, 'Simulated lead update failure for rollback test');
        END;
      `);

      try {
        const req = createAuthRequest(`http://localhost:8080/api/bookings/${b.booking.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelado" }),
        });

        // A requisição deve falhar/lançar erro devido ao trigger
        let threw = false;
        try {
          const res = await handleBookingsRequest(req);
          if (res.status >= 500) threw = true;
        } catch {
          threw = true;
        }
        assert.ok(threw, "Deve abortar a operação");

        // Valida que o rollback foi completo: booking NÃO pode ter ficado como cancelado!
        const checkBooking = db
          .prepare("SELECT status FROM bookings WHERE id = ?")
          .get(b.booking.id) as any;
        assert.equal(
          checkBooking.status,
          "pendente",
          "Booking deve permanecer em 'pendente' devido ao rollback",
        );

        const checkLead = db.prepare("SELECT status FROM leads WHERE id = ?").get(lead.id) as any;
        assert.equal(checkLead.status, "agendado", "Lead deve permanecer em 'agendado'");
      } finally {
        db.exec("DROP TRIGGER IF EXISTS test_fail_lead_update;");
      }
    });
  });

  // =========================================================================
  // TASK-17: Precedência de Conflitos e Auditoria de Warnings Ignorados
  // =========================================================================
  describe("TASK-17 — Precedência de Conflitos e Auditoria em booking_events", () => {
    test("Conflito duro de time block com force: true não é ignorado e retorna 409 imediato", async () => {
      // Bloqueio das 13:00 às 15:00 UTC
      createTimeBlock({
        start_at: "2026-10-15T13:00:00.000Z",
        end_at: "2026-10-15T15:00:00.000Z",
        reason_tag: "folga_criacao",
      });

      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Cliente Invasor",
          client_phone: "48999997777",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:30:00.000Z",
          end_at: "2026-10-15T14:30:00.000Z",
          force: true, // force não deve ignorar time block!
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.conflict_type, "time_block_conflict");
      assert.equal(body.success, false);
    });

    test("Criação com force registra avisos ignorados no note de booking_events", async () => {
      // Domingo (fora do expediente)
      const req = createAuthRequest("http://localhost:8080/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Cliente Domingo Auditado",
          client_phone: "48999998888",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-18T15:00:00.000Z",
          end_at: "2026-10-18T18:00:00.000Z",
          force: true,
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.ok(body.booking);

      const bDetail = getBookingById(body.booking.id);
      const createdEvent = bDetail?.events.find((e) => e.event_type === "created");
      assert.ok(createdEvent, "Evento 'created' deve existir");
      assert.ok(
        createdEvent.note?.includes("Avisos ignorados com force: outside_hours"),
        `Note deve registrar avisos ignorados. Recebido: ${createdEvent.note}`,
      );
    });
  });
});
