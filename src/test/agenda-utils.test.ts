import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  addMinutesToLocalTime,
  combineDateTimeToUTC,
  isPastDateTime,
  isFutureWindowExceeded,
  localToUTC,
  utcToLocal,
} from "../lib/agenda-utils";

describe("agenda-utils — Funções Puras e Validações Temporais (TASK-12)", () => {
  const SP_TZ = "America/Sao_Paulo";
  // Relógio congelado determinístico: 15/10/2026 12:00:00Z (09:00:00 local em SP)
  const FROZEN_NOW_UTC = "2026-10-15T12:00:00.000Z";

  describe("addMinutesToLocalTime", () => {
    test("soma simples de minutos dentro do mesmo dia", () => {
      assert.equal(addMinutesToLocalTime("10:00", 120), "12:00");
      assert.equal(addMinutesToLocalTime("14:15", 45), "15:00");
      assert.equal(addMinutesToLocalTime("09:00", 0), "09:00");
    });

    test("virada de meia-noite (23:30 + 150 min = 02:00)", () => {
      assert.equal(addMinutesToLocalTime("23:30", 150), "02:00");
    });

    test("acréscimo de 300 minutos a partir das 21:00 (21:00 + 300 min = 02:00)", () => {
      assert.equal(addMinutesToLocalTime("21:00", 300), "02:00");
    });

    test("lança erro com formato inválido", () => {
      assert.throws(() => addMinutesToLocalTime("invalido", 30), /Horário inválido/);
    });
  });

  describe("combineDateTimeToUTC", () => {
    test("combina data e hora local no fuso SP para ISO UTC estrito", () => {
      // 10:00 em SP (UTC-3) -> 13:00 UTC
      const utc = combineDateTimeToUTC("2026-10-15", "10:00", SP_TZ);
      assert.equal(utc, "2026-10-15T13:00:00.000Z");
    });

    test("virada de dia em UTC (22:00 em SP -> 01:00 UTC do dia seguinte)", () => {
      const utc = combineDateTimeToUTC("2026-10-15", "22:00", SP_TZ);
      assert.equal(utc, "2026-10-16T01:00:00.000Z");
    });
  });

  describe("isPastDateTime com relógio injetável", () => {
    test("horário anterior ao now congelado retorna true", () => {
      // 15/10 08:30 em SP é antes de 15/10 09:00 (FROZEN_NOW_UTC)
      assert.equal(isPastDateTime("2026-10-15", "08:30", SP_TZ, FROZEN_NOW_UTC), true);
      // Dia anterior
      assert.equal(isPastDateTime("2026-10-14", "18:00", SP_TZ, FROZEN_NOW_UTC), true);
    });

    test("horário posterior ao now congelado retorna false", () => {
      // 15/10 09:30 em SP é depois de 15/10 09:00 (FROZEN_NOW_UTC)
      assert.equal(isPastDateTime("2026-10-15", "09:30", SP_TZ, FROZEN_NOW_UTC), false);
      // Dia seguinte
      assert.equal(isPastDateTime("2026-10-16", "10:00", SP_TZ, FROZEN_NOW_UTC), false);
    });

    test("aceita objeto Date como now", () => {
      const nowDate = new Date("2026-10-15T12:00:00.000Z");
      assert.equal(isPastDateTime("2026-10-15", "08:00", SP_TZ, nowDate), true);
      assert.equal(isPastDateTime("2026-10-15", "11:00", SP_TZ, nowDate), false);
    });
  });

  describe("isFutureWindowExceeded com relógio injetável", () => {
    test("respeita o limite de dias futuros parametrizado", () => {
      // FROZEN_NOW em SP é 2026-10-15
      const maxDays = 30;

      // 26 dias após (2026-11-10) -> permitido
      assert.equal(isFutureWindowExceeded("2026-11-10", SP_TZ, maxDays, FROZEN_NOW_UTC), false);

      // Exatamente 30 dias (2026-11-14) -> permitido
      assert.equal(isFutureWindowExceeded("2026-11-14", SP_TZ, maxDays, FROZEN_NOW_UTC), false);

      // 32 dias após (2026-11-16) -> excede limite
      assert.equal(isFutureWindowExceeded("2026-11-16", SP_TZ, maxDays, FROZEN_NOW_UTC), true);
    });

    test("retorna false quando maxDays não está configurado ou <= 0", () => {
      assert.equal(isFutureWindowExceeded("2028-01-01", SP_TZ, 0, FROZEN_NOW_UTC), false);
      assert.equal(isFutureWindowExceeded("2028-01-01", SP_TZ, -5, FROZEN_NOW_UTC), false);
    });
  });
});
