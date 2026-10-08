import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getDatabase,
  closeDatabase,
  createBooking,
  updateBookingStatus,
  rescheduleBooking,
  updateDepositStatus,
  createTimeBlock,
  listTimeBlocks,
  deleteTimeBlock,
  getSettings,
  listBookings,
  updateBookingData,
} from "../lib/db";
import {
  expandWindow,
  expandAllDay,
  isWithinWorkHours,
  isValidISODate,
} from "../lib/booking-utils";
import { isAuthorized } from "../server/api/auth";
import { handleBookingsRequest } from "../server/api/bookings";
import { handleSettingsRequest } from "../server/api/settings";
import { handleAvailabilityRulesRequest } from "../server/api/availability-rules";
import { handleTimeBlocksRequest } from "../server/api/time-blocks";

// Assegura que todos os testes executam estritamente em memória
process.env.DB_PATH = ":memory:";

describe("Sistema de Agendamento Karlos Art Tattoo — Suite Integral", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  // =========================================================================
  // 1. Sobreposições de Horário (Parcial início, Parcial fim, Total, Contido)
  // =========================================================================
  describe("1. Detecção de Sobreposições de Horário", () => {
    test("detecta sobreposição parcial no início", () => {
      // Base: Terça 10:00-12:00 local (13:00-15:00 UTC)
      const b1 = createBooking(
        {
          client_name: "Cliente Base",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b1.booking, "Booking base deve ser criado");

      // Início durante b1 (14:30 - 16:30 UTC)
      const b2 = createBooking(
        {
          client_name: "Sobreposição Início",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: "2026-10-13T14:30:00.000Z",
          end_at: "2026-10-13T16:30:00.000Z",
        },
        true,
      );
      assert.equal(b2.error, "booking_conflict");
      assert.ok(b2.conflicts && b2.conflicts.length > 0);
    });

    test("detecta sobreposição parcial no fim", () => {
      // Base: 13:00-15:00 UTC
      createBooking(
        {
          client_name: "Cliente Base",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T15:00:00.000Z",
        },
        true,
      );

      // Fim durante b1 (12:00 - 13:30 UTC)
      const bOverlap = createBooking(
        {
          client_name: "Sobreposição Fim",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: "2026-10-13T12:00:00.000Z",
          end_at: "2026-10-13T13:30:00.000Z",
        },
        true,
      );
      assert.equal(bOverlap.error, "booking_conflict");
    });

    test("detecta sobreposição total (novo engloba o existente)", () => {
      // Base: 14:00-16:00 UTC
      createBooking(
        {
          client_name: "Cliente Base",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-13T14:00:00.000Z",
          end_at: "2026-10-13T16:00:00.000Z",
        },
        true,
      );

      // Novo engloba totalmente (13:00 - 17:00 UTC)
      const bEnveloping = createBooking(
        {
          client_name: "Engloba Base",
          client_phone: "48999993333",
          location: "estudio",
          session_type: "projeto",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T17:00:00.000Z",
        },
        true,
      );
      assert.equal(bEnveloping.error, "booking_conflict");
    });

    test("detecta booking contido dentro de outro", () => {
      // Base: 13:00-17:00 UTC
      createBooking(
        {
          client_name: "Cliente Base Longo",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "projeto",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T17:00:00.000Z",
        },
        true,
      );

      // Novo contido (14:00 - 15:00 UTC)
      const bContained = createBooking(
        {
          client_name: "Contido",
          client_phone: "48999994444",
          location: "estudio",
          session_type: "flash",
          start_at: "2026-10-13T14:00:00.000Z",
          end_at: "2026-10-13T15:00:00.000Z",
        },
        true,
      );
      assert.equal(bContained.error, "booking_conflict");
    });
  });

  // =========================================================================
  // 2. Regras de Buffer (30 minutos padrão, bordas e violação de 1 minuto)
  // =========================================================================
  describe("2. Regras de Buffer Simétrico (30 minutos)", () => {
    test("adjacência exata (fim = início) com buffer 30 conflita", () => {
      // b1 termina às 15:00 UTC
      createBooking(
        {
          client_name: "Cliente 1",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T15:00:00.000Z",
        },
        true,
      );

      // b2 começa exatamente às 15:00 UTC (adjacência exata, sem respiro)
      const bAdjacent = createBooking(
        {
          client_name: "Cliente Adjacente",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: "2026-10-13T15:00:00.000Z",
          end_at: "2026-10-13T16:00:00.000Z",
        },
        true,
      );
      assert.equal(bAdjacent.error, "booking_conflict");
    });

    test("borda exata do buffer (começa em fim + 30 min) passa com sucesso", () => {
      // b1 termina às 15:00:00.000Z
      createBooking(
        {
          client_name: "Cliente 1",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T15:00:00.000Z",
        },
        true,
      );

      // b2 começa em 15:30:00.000Z (exatos 30 min depois)
      const bBorder = createBooking(
        {
          client_name: "Cliente Borda Exata",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: "2026-10-13T15:30:00.000Z",
          end_at: "2026-10-13T17:00:00.000Z",
        },
        true,
      );
      assert.ok(bBorder.booking, "Deve ser criado na borda exata do buffer");
      assert.equal(bBorder.error, undefined);
    });

    test("violação do buffer por 1 minuto (começa em fim + 29 min) conflita", () => {
      // b1 termina às 15:00:00.000Z
      createBooking(
        {
          client_name: "Cliente 1",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-13T13:00:00.000Z",
          end_at: "2026-10-13T15:00:00.000Z",
        },
        true,
      );

      // b2 tenta começar às 15:29:00.000Z (1 minuto antes da liberação do buffer)
      const bViolation1Min = createBooking(
        {
          client_name: "Cliente Violação 1 Minuto",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: "2026-10-13T15:29:00.000Z",
          end_at: "2026-10-13T17:00:00.000Z",
        },
        true,
      );
      assert.equal(bViolation1Min.error, "booking_conflict");
    });
  });

  // =========================================================================
  // 3. Liberação de Slot por Cancelamento e No-Show
  // =========================================================================
  describe("3. Liberação de Slot (Cancelado e No-Show)", () => {
    test("cancelamento libera o slot para novo agendamento no mesmo horário", () => {
      const slotStart = "2026-10-14T13:00:00.000Z";
      const slotEnd = "2026-10-14T15:00:00.000Z";

      const b1 = createBooking(
        {
          client_name: "Cliente Vai Cancelar",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: slotStart,
          end_at: slotEnd,
        },
        true,
      );
      assert.ok(b1.booking);

      // Cancela b1
      updateBookingStatus(b1.booking.id, "cancelado");

      // Novo agendamento no mesmo exato horário
      const b2 = createBooking(
        {
          client_name: "Novo Cliente no Slot Liberado",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: slotStart,
          end_at: slotEnd,
        },
        true,
      );
      assert.ok(b2.booking, "Slot deve estar disponível após cancelamento");
      assert.equal(b2.booking.client_name, "Novo Cliente no Slot Liberado");
    });

    test("no_show libera o slot para novo agendamento no mesmo horário", () => {
      const slotStart = "2026-10-14T17:00:00.000Z";
      const slotEnd = "2026-10-14T19:00:00.000Z";

      const b1 = createBooking(
        {
          client_name: "Cliente Faltoso",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: slotStart,
          end_at: slotEnd,
        },
        true,
      );
      assert.ok(b1.booking);

      // Registra falta
      updateBookingStatus(b1.booking.id, "no_show");

      // Novo agendamento no mesmo horário
      const b2 = createBooking(
        {
          client_name: "Cliente Substituto",
          client_phone: "48999993333",
          location: "estudio",
          session_type: "flash",
          start_at: slotStart,
          end_at: slotEnd,
        },
        true,
      );
      assert.ok(b2.booking, "Slot deve estar disponível após no_show");
    });
  });

  // =========================================================================
  // 4. Remarcação (Reschedule)
  // =========================================================================
  describe("4. Regras de Remarcação", () => {
    test("remarcar para horário que sobrepõe apenas a si mesmo passa", () => {
      // 13:00 - 15:00 UTC
      const b1 = createBooking(
        {
          client_name: "Cliente Remarcando",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-14T13:00:00.000Z",
          end_at: "2026-10-14T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b1.booking);

      // Desloca 30 minutos mais tarde (13:30 - 15:30 UTC), que colide com o próprio horário original
      const resched = rescheduleBooking(
        b1.booking.id,
        "2026-10-14T13:30:00.000Z",
        "2026-10-14T15:30:00.000Z",
        true,
      );
      assert.ok(resched.booking, "Não deve colidir com o próprio ID");
      assert.equal(resched.booking.start_at, "2026-10-14T13:30:00.000Z");
    });

    test("remarcar sobre outro booking ou seu buffer retorna 409", () => {
      // b1: 13:00 - 15:00 UTC
      const b1 = createBooking(
        {
          client_name: "Cliente 1",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-14T13:00:00.000Z",
          end_at: "2026-10-14T15:00:00.000Z",
        },
        true,
      );

      // b2: 17:00 - 19:00 UTC
      const b2 = createBooking(
        {
          client_name: "Cliente 2",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-14T17:00:00.000Z",
          end_at: "2026-10-14T19:00:00.000Z",
        },
        true,
      );
      assert.ok(b1.booking && b2.booking);

      // Tenta remarcar b1 para 16:45 UTC (dentro do buffer de 30m de b2)
      const reschedConflict = rescheduleBooking(
        b1.booking.id,
        "2026-10-14T15:00:00.000Z",
        "2026-10-14T16:45:00.000Z",
        true,
      );
      assert.equal(reschedConflict.error, "booking_conflict");
    });

    test("remarcar sobre time_block retorna time_block_conflict", () => {
      createTimeBlock({
        start_at: "2026-10-14T18:00:00.000Z",
        end_at: "2026-10-14T21:00:00.000Z",
        reason_tag: "pessoal",
      });

      const b1 = createBooking(
        {
          client_name: "Cliente",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-14T13:00:00.000Z",
          end_at: "2026-10-14T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b1.booking);

      // Tenta remarcar b1 para dentro do time_block
      const reschedTb = rescheduleBooking(
        b1.booking.id,
        "2026-10-14T18:30:00.000Z",
        "2026-10-14T20:00:00.000Z",
        true,
      );
      assert.equal(reschedTb.error, "time_block_conflict");
    });

    test("invariante: remarcar booking cancelado ou concluído é recusado", () => {
      const b1 = createBooking(
        {
          client_name: "Cliente Encerrado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-14T13:00:00.000Z",
          end_at: "2026-10-14T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b1.booking);
      updateBookingStatus(b1.booking.id, "cancelado");

      const reschedCancelled = rescheduleBooking(
        b1.booking.id,
        "2026-10-14T16:00:00.000Z",
        "2026-10-14T18:00:00.000Z",
        true,
      );
      assert.equal(reschedCancelled.error, "invalid_status");
    });
  });

  // =========================================================================
  // 5. Bloqueio Duro contra Time Blocks
  // =========================================================================
  describe("5. Bloqueio Duro contra Time Blocks", () => {
    test("booking dentro de time_block retorna 409 mesmo com force: true", () => {
      createTimeBlock({
        start_at: "2026-10-15T12:00:00.000Z",
        end_at: "2026-10-15T16:00:00.000Z",
        reason_tag: "viagem_guest",
      });

      // Tentativa de booking com force: true
      const bAttempt = createBooking(
        {
          client_name: "Invasor do TimeBlock",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true, // force: true NÃO DEVE burlar time_block
      );
      assert.equal(bAttempt.error, "time_block_conflict");
      assert.equal(bAttempt.booking, undefined);
    });
  });

  // =========================================================================
  // 6. Validação de Expediente (Availability Rules)
  // =========================================================================
  describe("6. Horário de Expediente", () => {
    test("fora do expediente sem force retorna warning e não persiste", () => {
      // Domingo (2026-10-18) — fechado no seed
      const bSunday = createBooking(
        {
          client_name: "Cliente Domingo",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-18T15:00:00.000Z",
          end_at: "2026-10-18T18:00:00.000Z",
        },
        false, // sem force
      );
      assert.ok(bSunday.requires_force, "Deve exigir force");
      assert.ok(bSunday.warnings, "Deve conter array de warnings");
      assert.ok(bSunday.warnings.some((w) => w.code === "outside_hours"));
      assert.equal(bSunday.booking, undefined);
    });

    test("fora do expediente com force: true cria com sucesso e warning", () => {
      const bSundayForce = createBooking(
        {
          client_name: "Cliente Domingo Excepcional",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-18T15:00:00.000Z",
          end_at: "2026-10-18T18:00:00.000Z",
        },
        true, // com force
      );
      assert.ok(bSundayForce.booking);
      assert.ok(bSundayForce.warnings);
      assert.ok(bSundayForce.warnings.some((w) => w.code === "outside_hours"));
    });
  });

  // =========================================================================
  // 7. Time Block sobre Booking Ativo
  // =========================================================================
  describe("7. Time Block sobre Booking Ativo", () => {
    test("time_block sobre booking ativo sem force retorna 409 com conflitos", () => {
      // Booking ativo
      createBooking(
        {
          client_name: "Cliente Marcado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-16T17:00:00.000Z",
          end_at: "2026-10-16T19:00:00.000Z",
        },
        true,
      );

      // Tenta criar time block sem force cobrindo o booking
      const tbRes = createTimeBlock(
        {
          start_at: "2026-10-16T16:00:00.000Z",
          end_at: "2026-10-16T20:00:00.000Z",
          reason_tag: "folga_criacao",
        },
        false,
      );
      assert.equal(tbRes.error, "booking_conflict");
      assert.ok(tbRes.conflicts && tbRes.conflicts.length > 0);
    });

    test("time_block sobre booking ativo com force: true passa", () => {
      createBooking(
        {
          client_name: "Cliente Marcado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-16T17:00:00.000Z",
          end_at: "2026-10-16T19:00:00.000Z",
        },
        true,
      );

      const tbForce = createTimeBlock(
        {
          start_at: "2026-10-16T16:00:00.000Z",
          end_at: "2026-10-16T20:00:00.000Z",
          reason_tag: "folga_criacao",
        },
        true,
      );
      assert.ok(tbForce.timeBlock);
    });
  });

  // =========================================================================
  // 8. Intervalo Semiaberto All Day
  // =========================================================================
  describe("8. Intervalo Semiaberto All Day", () => {
    test("converte meia-noite local de SP (UTC-3) para 03:00Z em intervalo semiaberto", () => {
      const timezone = "America/Sao_Paulo";
      // 1 dia civil: 2026-10-15
      const singleDay = expandAllDay("2026-10-15", timezone);
      assert.equal(singleDay.start, "2026-10-15T03:00:00.000Z");
      assert.equal(singleDay.end, "2026-10-16T03:00:00.000Z");
      assert.ok(isValidISODate(singleDay.start));
      assert.ok(isValidISODate(singleDay.end));
    });

    test("multi-dia: bloqueio de 15/10 a 17/10 encerra na meia-noite local do dia 18 (03:00Z)", () => {
      const timezone = "America/Sao_Paulo";
      const multiDay = expandAllDay("2026-10-15", timezone, "2026-10-17");
      assert.equal(multiDay.start, "2026-10-15T03:00:00.000Z");
      assert.equal(multiDay.end, "2026-10-18T03:00:00.000Z");
    });
  });

  // =========================================================================
  // 9. Concorrência com BEGIN IMMEDIATE
  // =========================================================================
  describe("9. Concorrência Atômica", () => {
    test("apenas uma criação vence para o mesmo slot", () => {
      const slotStart = "2026-10-20T13:00:00.000Z";
      const slotEnd = "2026-10-20T15:00:00.000Z";

      const c1 = createBooking(
        {
          client_name: "Concorrente 1",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: slotStart,
          end_at: slotEnd,
        },
        true,
      );

      const c2 = createBooking(
        {
          client_name: "Concorrente 2",
          client_phone: "48999992222",
          location: "estudio",
          session_type: "flash",
          start_at: slotStart,
          end_at: slotEnd,
        },
        true,
      );

      assert.ok(c1.booking, "O primeiro deve vencer");
      assert.equal(c2.error, "booking_conflict", "O segundo deve ser rejeitado");
    });
  });

  // =========================================================================
  // 10. Máquina de Estados Completa & Invariantes
  // =========================================================================
  describe("10. Máquina de Estados e Invariantes", () => {
    test("pendente -> confirmado exige sinal pago ou dispensado", () => {
      const b = createBooking(
        {
          client_name: "Cliente Teste",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-21T13:00:00.000Z",
          end_at: "2026-10-21T15:00:00.000Z",
          deposit_status: "pendente",
        },
        true,
      );
      assert.ok(b.booking);

      const failConfirm = updateBookingStatus(b.booking.id, "confirmado");
      assert.equal(failConfirm.error, "deposit_required");

      // Paga o sinal
      updateDepositStatus(b.booking.id, "pago", 10000);
      const successConfirm = updateBookingStatus(b.booking.id, "confirmado");
      assert.equal(successConfirm.booking?.status, "confirmado");
    });

    test("confirmado com sinal pago exige definir destino (retido/devolvido) ao cancelar", () => {
      const b = createBooking(
        {
          client_name: "Cliente Pago",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-21T16:00:00.000Z",
          end_at: "2026-10-21T18:00:00.000Z",
          deposit_status: "pago",
          status: "confirmado",
        },
        true,
      );
      assert.ok(b.booking);

      // Cancelar sem definir destino do sinal
      const cancelWithoutDest = updateBookingStatus(b.booking.id, "cancelado");
      assert.equal(cancelWithoutDest.error, "deposit_action_required");

      // Cancelar com sinal retido
      const cancelWithDest = updateBookingStatus(b.booking.id, "cancelado", {
        depositAction: "retido",
      });
      assert.equal(cancelWithDest.booking?.status, "cancelado");
      assert.equal(cancelWithDest.booking?.deposit_status, "retido");
    });

    test("invariante: estados terminais ('cancelado', 'no_show', 'concluido') não mudam de status", () => {
      const b = createBooking(
        {
          client_name: "Cliente Final",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-21T19:00:00.000Z",
          end_at: "2026-10-21T21:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      // Conclui
      updateBookingStatus(b.booking.id, "concluido");

      // Tenta reabrir como confirmado ou pendente
      const tryConfirm = updateBookingStatus(b.booking.id, "confirmado");
      assert.equal(tryConfirm.error, "invalid_transition");

      const tryCancel = updateBookingStatus(b.booking.id, "cancelado");
      assert.equal(tryCancel.error, "invalid_transition");
    });

    test("invariante: PATCH /deposit em booking confirmado não pode mudar para pendente", () => {
      const b = createBooking(
        {
          client_name: "Cliente Confirmado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-22T13:00:00.000Z",
          end_at: "2026-10-22T15:00:00.000Z",
          deposit_status: "dispensado",
          status: "confirmado",
        },
        true,
      );
      assert.ok(b.booking);

      const tryRevertDeposit = updateDepositStatus(b.booking.id, "pendente");
      assert.equal(tryRevertDeposit.error, "invalid_deposit_status");
    });

    test("invariante: retido/devolvido só válidos em booking cancelado ou no_show", () => {
      const b = createBooking(
        {
          client_name: "Cliente Ativo",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-22T16:00:00.000Z",
          end_at: "2026-10-22T18:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      const tryRetained = updateDepositStatus(b.booking.id, "retido");
      assert.equal(tryRetained.error, "invalid_deposit_status");

      const tryRefunded = updateDepositStatus(b.booking.id, "devolvido");
      assert.equal(tryRefunded.error, "invalid_deposit_status");
    });

    test("invariante: deposit_cents não pode ser maior que price_total_cents", () => {
      const bExcessDeposit = createBooking(
        {
          client_name: "Cliente Erro Valor",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-22T19:00:00.000Z",
          end_at: "2026-10-22T21:00:00.000Z",
          deposit_cents: 50000,
          price_total_cents: 30000, // Menor que o sinal!
        },
        true,
      );
      assert.equal(bExcessDeposit.error, "validation_error");
    });
  });

  // =========================================================================
  // 11. Segurança de Autenticação (Sem fallback hardcoded)
  // =========================================================================
  describe("11. Segurança de Autenticação", () => {
    test("recusa acesso se ADMIN_PASSWORD não estiver configurado no ambiente", () => {
      const originalEnv = process.env.ADMIN_PASSWORD;
      delete process.env.ADMIN_PASSWORD;

      const req = new Request("http://localhost:3000/api/bookings", {
        headers: { Authorization: "Bearer karlos2026" },
      });
      assert.equal(isAuthorized(req), false, "Deve recusar sem ADMIN_PASSWORD em env");

      process.env.ADMIN_PASSWORD = originalEnv;
    });

    test("autentica apenas quando token confere via timing-safe compare", () => {
      process.env.ADMIN_PASSWORD = "segredo_ultra_forte_2026";

      const validReq = new Request("http://localhost:3000/api/bookings", {
        headers: { Authorization: "Bearer segredo_ultra_forte_2026" },
      });
      assert.equal(isAuthorized(validReq), true);

      const invalidReq = new Request("http://localhost:3000/api/bookings", {
        headers: { Authorization: "Bearer senha_errada" },
      });
      assert.equal(isAuthorized(invalidReq), false);
    });
  });

  // =========================================================================
  // 12. TASK-05b — Edição de Dados, Regras de Depósito e Filtros de Sobreposição
  // =========================================================================
  describe("12. TASK-05b — Edição de Dados, Regras de Depósito e Filtros de Sobreposição", () => {
    const authHeaders = {
      Authorization: "Bearer teste_pass",
      "Content-Type": "application/json",
    };

    beforeEach(() => {
      process.env.ADMIN_PASSWORD = "teste_pass";
    });

    test("POST /api/bookings: deposit_cents > price_total_cents quando price_total_cents > 0 retorna 422", async () => {
      const req = new Request("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: "Cliente Invalido",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          price_total_cents: 10000,
          deposit_cents: 15000,
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 422);
    });

    test("POST /api/bookings: deposit_cents > 0 quando price_total_cents === 0 é aceito", async () => {
      const req = new Request("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: "Cliente Preco Livre",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          price_total_cents: 0,
          deposit_cents: 5000,
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 201);
    });

    test("PATCH /api/bookings/:id/deposit: deposit_cents > price_total_cents retorna 422", async () => {
      const b = createBooking(
        {
          client_name: "Cliente Teste",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          price_total_cents: 20000,
          deposit_cents: 5000,
        },
        true,
      );
      assert.ok(b.booking);

      const req = new Request(`http://localhost:3000/api/bookings/${b.booking.id}/deposit`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          deposit_status: "pago",
          deposit_cents: 25000, // Maior que price_total_cents (20000)
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 422);
    });

    test("PATCH /api/bookings/:id: edita client_name de booking pendente com sucesso", async () => {
      const b = createBooking(
        {
          client_name: "Nome Antigo",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      const req = new Request(`http://localhost:3000/api/bookings/${b.booking.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: "Nome Novo",
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.booking.client_name, "Nome Novo");
    });

    test("PATCH /api/bookings/:id: reenvio de campos com mesmo valor não lança erro 422", async () => {
      const b = createBooking(
        {
          client_name: "Nome Inalterado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      const req = new Request(`http://localhost:3000/api/bookings/${b.booking.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: "Nome Inalterado",
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 200);
    });

    test("PATCH /api/bookings/:id: recusa alteração de contato em booking cancelado", async () => {
      const b = createBooking(
        {
          client_name: "Cliente Cancelado",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);
      updateBookingStatus(b.booking.id, "cancelado");

      const req = new Request(`http://localhost:3000/api/bookings/${b.booking.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: "Novo Nome",
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 422);
    });

    test("PATCH /api/bookings/:id: permite alteração de contato em booking concluído", async () => {
      const b = createBooking(
        {
          client_name: "Cliente Concluido",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          deposit_status: "pago",
          status: "confirmado",
        },
        true,
      );
      assert.ok(b.booking);
      updateBookingStatus(b.booking.id, "concluido");

      const req = new Request(`http://localhost:3000/api/bookings/${b.booking.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: "Nome Corrigido",
        }),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.booking.client_name, "Nome Corrigido");
    });

    test("PATCH /api/bookings/:id: body vazio retorna 422", async () => {
      const b = createBooking(
        {
          client_name: "Cliente",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      const req = new Request(`http://localhost:3000/api/bookings/${b.booking.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      const res = await handleBookingsRequest(req);
      assert.equal(res.status, 422);
    });

    test("PATCH /api/bookings/:id: validação mesclada recusa deposit_cents > price_total_cents", async () => {
      const b = createBooking(
        {
          client_name: "Cliente",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          price_total_cents: 30000,
          deposit_cents: 10000,
        },
        true,
      );
      assert.ok(b.booking);

      // Reduz o preço total para menos do que o depósito atual (10000)
      const res = updateBookingData(b.booking.id, {
        price_total_cents: 5000,
      });
      assert.equal(res.error, "validation_error");
    });

    test("PATCH /api/bookings/:id: recusa alterar deposit_cents se sinal já foi pago", async () => {
      const b = createBooking(
        {
          client_name: "Cliente",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          price_total_cents: 30000,
          deposit_cents: 10000,
          deposit_status: "pago",
          status: "confirmado",
        },
        true,
      );
      assert.ok(b.booking);

      const res = updateBookingData(b.booking.id, {
        deposit_cents: 15000,
      });
      assert.equal(res.error, "invalid_deposit");
    });

    test("PATCH /api/bookings/:id: gravar note_updated em booking_events ao alterar notes", async () => {
      const b = createBooking(
        {
          client_name: "Cliente Notas",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          notes: "Nota inicial",
        },
        true,
      );
      assert.ok(b.booking);

      const res = updateBookingData(b.booking.id, {
        notes: "Nova nota do cliente",
      });
      assert.ok(res.booking);

      const db = getDatabase();
      const events = db
        .prepare(
          "SELECT * FROM booking_events WHERE booking_id = ? AND event_type = 'note_updated'",
        )
        .all(b.booking.id) as Array<{ old_value: string; new_value: string }>;
      assert.equal(events.length, 1);
      assert.equal(events[0].old_value, "Nota inicial");
      assert.equal(events[0].new_value, "Nova nota do cliente");
    });

    test("cobertura do filtro de sobreposição em listBookings e listTimeBlocks", () => {
      // Cria booking das 10:00 às 12:00 local (13:00Z às 15:00Z) com force: true
      const b = createBooking(
        {
          client_name: "Cliente Filtro",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );
      assert.ok(b.booking);

      // Sobreposição parcial: 12:00Z às 14:00Z -> deve incluir o booking
      const listSob = listBookings("2026-10-15T12:00:00.000Z", "2026-10-15T14:00:00.000Z");
      assert.equal(
        listSob.some((item) => item.id === b.booking!.id),
        true,
      );

      // Adjacência exata: 15:00Z às 17:00Z (fim do booking = início da busca) -> NÃO deve incluir
      const listAdj = listBookings("2026-10-15T15:00:00.000Z", "2026-10-15T17:00:00.000Z");
      assert.equal(
        listAdj.some((item) => item.id === b.booking!.id),
        false,
      );

      // TimeBlocks: cria bloqueio das 13:00Z às 15:00Z
      const tb = createTimeBlock(
        {
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
          reason_tag: "outro",
        },
        true,
      );
      assert.ok(tb.timeBlock);

      const tbSob = listTimeBlocks("2026-10-15T12:00:00.000Z", "2026-10-15T14:00:00.000Z");
      assert.equal(
        tbSob.some((item) => item.id === tb.timeBlock!.id),
        true,
      );

      const tbAdj = listTimeBlocks("2026-10-15T15:00:00.000Z", "2026-10-15T17:00:00.000Z");
      assert.equal(
        tbAdj.some((item) => item.id === tb.timeBlock!.id),
        false,
      );
    });
  });

  // =========================================================================
  // 13. TASK-16 e TASK-18 — Settings Transacionais, Anti-Sobreposição e Conflitos D-08
  // =========================================================================
  describe("13. TASK-16 e TASK-18 — Settings Transacionais, Anti-Sobreposição e Conflitos D-08", () => {
    const authHeaders = {
      Authorization: "Bearer test-admin-token",
      "Content-Type": "application/json",
    };

    beforeEach(() => {
      process.env.ADMIN_PASSWORD = "test-admin-token";
    });

    test("PATCH /api/settings: timezone IANA inválido retorna 422", async () => {
      const req = new Request("http://localhost:3000/api/settings", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          key: "timezone",
          value: "Fuso/Inexistente_123",
        }),
      });

      const res = await handleSettingsRequest(req);
      assert.equal(res.status, 422);
      const json = (await res.json()) as any;
      assert.ok(json.error.includes("Fuso horário IANA inválido"));
    });

    test("PATCH /api/settings: buffer_minutes fora do intervalo 0-240 retorna 422", async () => {
      const req = new Request("http://localhost:3000/api/settings", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          key: "buffer_minutes",
          value: "300",
        }),
      });

      const res = await handleSettingsRequest(req);
      assert.equal(res.status, 422);
      const json = (await res.json()) as any;
      assert.ok(json.error.includes("buffer_minutes"));
    });

    test("PATCH /api/settings: presets válidos como JSON são salvos com sucesso", async () => {
      const req = new Request("http://localhost:3000/api/settings", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          key: "presets",
          value: JSON.stringify(["09:00", "14:00", "19:00"]),
        }),
      });

      const res = await handleSettingsRequest(req);
      assert.equal(res.status, 200);
      const s = getSettings();
      assert.equal(s["presets"], JSON.stringify(["09:00", "14:00", "19:00"]));
    });

    test("PUT /api/availability-rules: detecta sobreposição no mesmo dia e retorna 422", async () => {
      const req = new Request("http://localhost:3000/api/availability-rules", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          rules: [
            { day_of_week: 2, window_start: "09:00", window_end: "14:00", is_active: 1 },
            { day_of_week: 2, window_start: "13:00", window_end: "18:00", is_active: 1 }, // Sobrepõe 13:00 < 14:00
          ],
        }),
      });

      const res = await handleAvailabilityRulesRequest(req);
      assert.equal(res.status, 422);
      const json = (await res.json()) as any;
      assert.ok(json.error.includes("Sobreposição de horários detectada"));
    });

    test("PUT /api/availability-rules: substitui em lote regras sem sobreposição com sucesso", async () => {
      const req = new Request("http://localhost:3000/api/availability-rules", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          rules: [
            { day_of_week: 2, window_start: "09:00", window_end: "12:00", is_active: 1 },
            { day_of_week: 2, window_start: "13:00", window_end: "18:00", is_active: 1 },
          ],
        }),
      });

      const res = await handleAvailabilityRulesRequest(req);
      assert.equal(res.status, 200);
      const json = (await res.json()) as any;
      assert.equal(json.rules.length, 2);
    });

    test("POST /api/time-blocks: retorna conflito estruturado com type booking e time_block", async () => {
      // 1. Cria booking ativo
      createBooking(
        {
          client_name: "Cliente Conflitante",
          client_phone: "48999991111",
          location: "estudio",
          session_type: "tatuagem",
          start_at: "2026-10-15T13:00:00.000Z",
          end_at: "2026-10-15T15:00:00.000Z",
        },
        true,
      );

      // 2. Tenta criar time block sem force
      const req = new Request("http://localhost:3000/api/time-blocks", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          start_at: "2026-10-15T12:00:00.000Z",
          end_at: "2026-10-15T16:00:00.000Z",
          reason_tag: "evento",
          force: false,
        }),
      });

      const res = await handleTimeBlocksRequest(req);
      assert.equal(res.status, 409);
      const json = (await res.json()) as any;
      assert.equal(json.conflict_type, "time_block_conflict");
      assert.ok(Array.isArray(json.conflicts));
      assert.equal(json.conflicts[0].type, "booking");
      assert.equal(json.conflicts[0].client_name, "Cliente Conflitante");
    });
  });
});

