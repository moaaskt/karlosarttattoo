import test from "node:test";
import assert from "node:assert/strict";
import {
  displayToCents,
  centsToDisplay,
  formatWhatsAppPhone,
  toUTCString,
  getErrorMessage,
  ERROR_MESSAGES,
} from "../lib/api-client";
import {
  bookingToEvent,
  timeBlockToEvent,
  deriveSlotMinTime,
  deriveSlotMaxTime,
  localToUTC,
  utcToLocal,
  VALID_TRANSITIONS,
} from "../lib/agenda-utils";
import type { Booking, TimeBlock, AvailabilityRule } from "../lib/db";

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

test("displayToCents", () => {
  assert.equal(displayToCents("150,00"), 15000);
  assert.equal(displayToCents("150.50"), 15050); // ponto decimal
  assert.equal(displayToCents("1.500,00"), 150000); // milhar + decimal
  assert.equal(displayToCents("1.500"), 150000); // ponto de milhar (3 dígitos pós-ponto)
  assert.equal(displayToCents("R$ 75,00"), 7500);
  assert.throws(() => displayToCents(""), /vazio/);
  assert.throws(() => displayToCents("abc"), /não numérico/);
  assert.throws(() => displayToCents("-50"), /negativo/);
});

test("formatWhatsAppPhone", () => {
  assert.equal(formatWhatsAppPhone("(48) 99123-4567"), "5548991234567");
  assert.equal(formatWhatsAppPhone("+55 48 99123-4567"), "5548991234567"); // sem DDI duplicado
  assert.equal(formatWhatsAppPhone("48 99123-4567"), "5548991234567");
  assert.equal(formatWhatsAppPhone("0 48 99123-4567"), "5548991234567"); // remove 0 inicial
});

test("centsToDisplay", () => {
  assert.equal(centsToDisplay(15000), "R$ 150,00");
  assert.equal(centsToDisplay(0), "R$ 0,00");
});

test("toUTCString", () => {
  const iso = toUTCString(new Date("2026-10-15T12:00:00Z"));
  assert.ok(iso.endsWith("Z"));
  assert.ok(ISO_UTC_RE.test(iso));
});

test("getErrorMessage", () => {
  assert.ok(getErrorMessage("booking_conflict").length > 0);
  assert.equal(getErrorMessage(undefined), ERROR_MESSAGES.unknown);
  assert.equal(getErrorMessage("codigo_inexistente"), ERROR_MESSAGES.unknown);
});

test("localToUTC e utcToLocal (fuso SP)", () => {
  const utc = localToUTC("2026-10-15", "10:00", "America/Sao_Paulo");
  assert.equal(utc, "2026-10-15T13:00:00.000Z"); // SP = UTC-3

  const local = utcToLocal("2026-10-15T13:00:00.000Z", "America/Sao_Paulo");
  assert.deepEqual(local, { date: "2026-10-15", time: "10:00" });

  // Ida e volta
  const roundTrip = utcToLocal(
    localToUTC("2026-10-15", "14:30", "America/Sao_Paulo"),
    "America/Sao_Paulo"
  );
  assert.deepEqual(roundTrip, { date: "2026-10-15", time: "14:30" });

  // Virada de dia: 03:00 UTC = 00:00 SP (meia-noite local)
  const midnight = utcToLocal("2026-10-16T03:00:00.000Z", "America/Sao_Paulo");
  assert.deepEqual(midnight, { date: "2026-10-16", time: "00:00" });

  // Fim cruzando meia-noite: 22:00 + 4h = 02:00 do dia seguinte
  const crossMidnight = localToUTC("2026-10-16", "02:00", "America/Sao_Paulo");
  assert.equal(crossMidnight, "2026-10-16T05:00:00.000Z");
});

test("VALID_TRANSITIONS", () => {
  assert.deepEqual(VALID_TRANSITIONS.pendente, ["confirmado", "cancelado", "no_show"]);
  assert.deepEqual(VALID_TRANSITIONS.confirmado, ["concluido", "cancelado", "no_show"]);
  assert.deepEqual(VALID_TRANSITIONS.concluido, []);
  assert.deepEqual(VALID_TRANSITIONS.cancelado, []);
  assert.deepEqual(VALID_TRANSITIONS.no_show, []);
});

test("bookingToEvent — interactive=false (Onda A) vs interactive=true (Onda B)", () => {
  const fakePendente = {
    id: "b1",
    status: "pendente",
    deposit_status: "pendente",
    client_name: "Teste",
    session_type: "tatuagem",
    start_at: "2026-10-15T13:00:00.000Z",
    end_at: "2026-10-15T17:00:00.000Z",
  } as Booking;

  // Onda A: interactive = false -> editable SEMPRE false
  const evA = bookingToEvent(fakePendente, false, false);
  assert.ok(evA !== null);
  assert.equal(evA!.editable, false);

  // Onda B: interactive = true -> editable true para pendente
  const evB = bookingToEvent(fakePendente, false, true);
  assert.ok(evB !== null);
  assert.equal(evB!.editable, true);

  // Cancelado oculto / visível
  const fakeCancelado = { ...fakePendente, id: "b2", status: "cancelado" } as Booking;
  assert.equal(bookingToEvent(fakeCancelado, false, true), null); // oculto
  const evCanceladoVisivel = bookingToEvent(fakeCancelado, true, true);
  assert.ok(evCanceladoVisivel !== null);
  assert.equal(evCanceladoVisivel!.editable, false); // cancelado nunca editável

  // Concluído nunca editável mesmo interactive=true
  const fakeConcluido = { ...fakePendente, id: "b3", status: "concluido" } as Booking;
  assert.equal(bookingToEvent(fakeConcluido, false, true)!.editable, false);
});

test("timeBlockToEvent", () => {
  const tb = {
    id: "tb-1",
    start_at: "2026-10-15T12:00:00.000Z",
    end_at: "2026-10-15T14:00:00.000Z",
    all_day: 0,
    reason_tag: "folga_criacao",
    note: "Desenho autoral",
  } as TimeBlock;
  const ev = timeBlockToEvent(tb);
  assert.equal(ev.id, "tb-tb-1");
  assert.equal(ev.title, "Folga / Criação: Desenho autoral");
  assert.equal(ev.display, "background");
  assert.equal(ev.editable, false);
  assert.equal(ev.backgroundColor, "rgba(239, 68, 68, 0.25)");
});

test("deriveSlotMinTime e deriveSlotMaxTime", () => {
  const rules = [
    { id: "r1", day_of_week: 2, window_start: "09:00", window_end: "20:00", is_active: 1 },
    { id: "r2", day_of_week: 2, window_start: "14:00", window_end: "20:00", is_active: 0 }, // inativa
  ] as AvailabilityRule[];
  assert.equal(deriveSlotMinTime(rules), "08:00:00"); // 09:00 - 1h
  assert.equal(deriveSlotMaxTime(rules), "21:00:00"); // 20:00 + 1h
  assert.equal(deriveSlotMinTime([]), "07:00:00"); // fallback sem regras ativas
  assert.equal(deriveSlotMaxTime([]), "23:00:00");
});
