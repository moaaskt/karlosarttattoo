/**
 * Utilitários de data, timezone e cálculo de buffer para o sistema de agendamento (Karlos Art Tattoo).
 *
 * Todas as datas armazenadas no banco são strings UTC ISO 8601 com milissegundos e sufixo 'Z'
 * (ex: "2026-10-15T13:00:00.000Z"), permitindo comparações textuais seguras no SQLite.
 */

export interface AvailabilityRuleShape {
  id?: string;
  day_of_week: number;
  window_start: string;
  window_end: string;
  is_active: number;
}

/** Regex rígido de validação de datas UTC ISO com ms e Z */
export const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Serializa qualquer Date para UTC ISO com ms e Z */
export function serializeDate(d: Date): string {
  return d.toISOString();
}

/** Valida se uma string é ISO UTC válida com ms e Z */
export function isValidISODate(s: string): boolean {
  if (typeof s !== "string") return false;
  return ISO_UTC_RE.test(s) && !isNaN(Date.parse(s));
}

/**
 * Calcula a janela expandida pelo buffer (em milissegundos) para checagem anti-conflito.
 * Realizado em JS para ser passado pronto como parâmetros textuais na query SQLite.
 *
 * Fórmula:
 * windowStart = start_at - buffer
 * windowEnd   = end_at   + buffer
 */
export function expandWindow(
  startIso: string,
  endIso: string,
  bufferMinutes: number,
): {
  windowStart: string;
  windowEnd: string;
} {
  const bufMs = Math.max(0, bufferMinutes) * 60 * 1000;
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  return {
    windowStart: serializeDate(new Date(startDate.getTime() - bufMs)),
    windowEnd: serializeDate(new Date(endDate.getTime() + bufMs)),
  };
}

/**
 * Helper interno: obtém o offset do timezone (em ms) para uma data de referência.
 */
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
      partMap[part.type] = part.value;
    }
    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10) - 1;
    const day = parseInt(partMap.day, 10);
    let hour = parseInt(partMap.hour, 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(partMap.minute, 10);
    const second = parseInt(partMap.second, 10);
    const localTimeEquivalent = Date.UTC(year, month, day, hour, minute, second);
    return localTimeEquivalent - date.getTime();
  } catch {
    // Fallback para UTC caso o timezone seja inválido
    return 0;
  }
}

/**
 * Helper interno: decompõe uma data no timezone civil de destino.
 */
export function getLocalDateTimeParts(
  date: Date,
  timeZone: string,
): {
  ymd: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  time: string;
} {
  const offset = getTimezoneOffsetMs(date, timeZone);
  const localD = new Date(date.getTime() + offset);
  const year = localD.getUTCFullYear();
  const month = localD.getUTCMonth() + 1;
  const day = localD.getUTCDate();
  const dayOfWeek = localD.getUTCDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const hours = String(localD.getUTCHours()).padStart(2, "0");
  const mins = String(localD.getUTCMinutes()).padStart(2, "0");

  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    ymd,
    year,
    month,
    day,
    dayOfWeek,
    time: `${hours}:${mins}`,
  };
}

/**
 * Converte um dia civil (YYYY-MM-DD) na meia-noite local (00:00:00) expressa em UTC ISO.
 */
export function getLocalMidnightUtc(ymd: string, timeZone: string): Date {
  const [yearStr, monthStr, dayStr] = ymd.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Estimativa de meio-dia local para obter o offset seguro (sem ambiguidades de DST)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMs = getTimezoneOffsetMs(utcGuess, timeZone);
  const localTarget = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(localTarget - offsetMs);
}

/**
 * Converte um bloqueio all_day para intervalo semiaberto [start_at, end_at) em UTC.
 * start_at = meia-noite local do 1º dia -> UTC
 * end_at   = meia-noite local do dia seguinte ao último -> UTC
 *
 * Jamais usa '23:59:59'.
 *
 * @param startDateInput String YYYY-MM-DD ou data ISO do 1º dia
 * @param timeZone Timezone IANA (ex: 'America/Sao_Paulo')
 * @param endDateInput Opcional: data civil final (se for múltiplos dias)
 */
export function expandAllDay(
  startDateInput: string,
  timeZone: string,
  endDateInput?: string,
): {
  start: string;
  end: string;
} {
  // Se for ISO completa, extrair a data civil no fuso local
  let startYmd = startDateInput;
  if (startDateInput.includes("T")) {
    const d = new Date(startDateInput);
    startYmd = getLocalDateTimeParts(d, timeZone).ymd;
  }

  let endYmd = endDateInput || startYmd;
  if (endYmd.includes("T")) {
    const d = new Date(endYmd);
    endYmd = getLocalDateTimeParts(d, timeZone).ymd;
  }

  const startUtcDate = getLocalMidnightUtc(startYmd, timeZone);

  // Calcular o dia seguinte ao último dia:
  const [eYear, eMonth, eDay] = endYmd.split("-").map(Number);
  const nextDayCivil = new Date(Date.UTC(eYear, eMonth - 1, eDay + 1, 12, 0, 0));
  const nextYmd = `${nextDayCivil.getUTCFullYear()}-${String(nextDayCivil.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDayCivil.getUTCDate()).padStart(2, "0")}`;
  const endUtcDate = getLocalMidnightUtc(nextYmd, timeZone);

  return {
    start: serializeDate(startUtcDate),
    end: serializeDate(endUtcDate),
  };
}

/**
 * Verifica se um agendamento está totalmente dentro de alguma janela de disponibilidade.
 *
 * Regra:
 * - A sessão precisa iniciar e terminar no mesmo dia local.
 * - Deve existir ao menos uma janela ativa para aquele dia da semana em que:
 *   window_start <= session_start AND session_end <= window_end
 */
export function isWithinWorkHours(
  startIso: string,
  endIso: string,
  rules: AvailabilityRuleShape[],
  timeZone: string,
): boolean {
  if (!isValidISODate(startIso) || !isValidISODate(endIso)) return false;

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  if (endDate <= startDate) return false;

  const startParts = getLocalDateTimeParts(startDate, timeZone);
  const endParts = getLocalDateTimeParts(endDate, timeZone);

  // Sessão não pode cruzar dias diferentes
  if (startParts.ymd !== endParts.ymd) {
    return false;
  }

  const dayRules = rules.filter((r) => r.is_active === 1 && r.day_of_week === startParts.dayOfWeek);
  if (dayRules.length === 0) {
    return false;
  }

  // Verifica se a sessão cabe completamente dentro de uma das janelas disponíveis
  return dayRules.some((rule) => {
    return rule.window_start <= startParts.time && endParts.time <= rule.window_end;
  });
}

/**
 * Gera ID padronizado com prefixo e timestamp aleatório seguro.
 */
export function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${ts}_${rand}`;
}
