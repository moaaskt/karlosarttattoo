import { DateTime } from "luxon";
import type { EventInput } from "@fullcalendar/core";
import type { Booking, TimeBlock, AvailabilityRule } from "./db";

export const SESSION_TYPE_LABEL: Record<Booking["session_type"], string> = {
  tatuagem: "Tatuagem",
  flash: "Flash",
  retoque: "Retoque",
  projeto: "Projeto",
  outro: "Outro",
};

export const STATUS_COLOR: Record<Booking["status"], string> = {
  pendente: "#f59e0b",
  confirmado: "#9be5ff",
  concluido: "#22c55e",
  cancelado: "#6b7280",
  no_show: "#ef4444",
};

export const DEPOSIT_BORDER: Record<Booking["deposit_status"], string> = {
  pendente: "#f59e0b",
  pago: "#22c55e",
  dispensado: "#9be5ff",
  retido: "#a855f7",
  devolvido: "#6b7280",
};

export const VALID_TRANSITIONS: Record<Booking["status"], Booking["status"][]> = {
  pendente: ["confirmado", "cancelado", "no_show"],
  confirmado: ["concluido", "cancelado", "no_show"],
  concluido: [],
  cancelado: [],
  no_show: [],
};

/**
 * Booking → EventInput FullCalendar.
 * editable = interactive && isEditable (event-level editable sobrescreve o do calendário).
 * Onda A passa interactive=false, Onda B true.
 */
export function bookingToEvent(
  b: Booking,
  showCancelled: boolean,
  interactive: boolean = false
): EventInput | null {
  if (!showCancelled && (b.status === "cancelado" || b.status === "no_show")) {
    return null;
  }
  const isEditable = b.status === "pendente" || b.status === "confirmado";
  return {
    id: b.id,
    title: `${b.client_name} · ${SESSION_TYPE_LABEL[b.session_type] ?? b.session_type}`,
    start: b.start_at,
    end: b.end_at,
    backgroundColor: STATUS_COLOR[b.status],
    borderColor: DEPOSIT_BORDER[b.deposit_status],
    textColor: "#070707",
    editable: interactive && isEditable,
    extendedProps: { booking: b, type: "booking" },
  };
}

export const REASON_TAG_LABEL: Record<TimeBlock["reason_tag"], string> = {
  viagem_guest: "Viagem / Guest",
  folga_criacao: "Folga / Criação",
  evento: "Evento",
  pessoal: "Pessoal",
  outro: "Bloqueio",
};

/** TimeBlock → EventInput com display: background e alto contraste */
export function timeBlockToEvent(tb: TimeBlock): EventInput {
  const reasonText = REASON_TAG_LABEL[tb.reason_tag] ?? "Bloqueio";
  const title = tb.note ? `${reasonText}: ${tb.note}` : reasonText;

  return {
    id: `tb-${tb.id}`,
    title,
    start: tb.start_at,
    end: tb.end_at,
    allDay: tb.all_day === 1,
    display: "background",
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    borderColor: "rgba(239, 68, 68, 0.45)",
    editable: false,
    extendedProps: { type: "time_block", timeBlock: tb },
  };
}

/** Menor window_start ativo − 1h. Fallback: "07:00:00" sem regras ativas. */
export function deriveSlotMinTime(rules: AvailabilityRule[]): string {
  const active = rules.filter((r) => r.is_active === 1);
  if (active.length === 0) return "07:00:00";
  const minStart = active.reduce(
    (min, r) => (r.window_start < min ? r.window_start : min),
    active[0].window_start
  );
  const [h, m] = minStart.split(":").map(Number);
  const minH = Math.max(0, h - 1);
  return `${String(minH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Maior window_end ativo + 1h. Fallback: "23:00:00" sem regras ativas. */
export function deriveSlotMaxTime(rules: AvailabilityRule[]): string {
  const active = rules.filter((r) => r.is_active === 1);
  if (active.length === 0) return "23:00:00";
  const maxEnd = active.reduce(
    (max, r) => (r.window_end > max ? r.window_end : max),
    active[0].window_end
  );
  const [h, m] = maxEnd.split(":").map(Number);
  const maxH = Math.min(24, h + 1);
  return `${String(maxH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Data+hora local no fuso tz → ISO UTC estrito (...sss.Z).
 * Ex: localToUTC("2026-10-15", "10:00", "America/Sao_Paulo") → "2026-10-15T13:00:00.000Z"
 */
export function localToUTC(date: string, time: string, tz: string): string {
  const dt = DateTime.fromISO(`${date}T${time}:00`, { zone: tz });
  if (!dt.isValid) {
    throw new Error(`Data inválida: ${date}T${time} em ${tz}`);
  }
  const iso = dt.toUTC().toISO({ includeOffset: true, suppressMilliseconds: false });
  if (!iso) {
    throw new Error(`Falha ao converter para UTC: ${date}T${time}`);
  }
  // Garante sufixo Z em vez de +00:00
  return iso.replace(/\+00:00$/, "Z");
}

/**
 * ISO UTC → { date: "YYYY-MM-DD", time: "HH:MM" } no fuso tz.
 * Ex: utcToLocal("2026-10-15T13:00:00.000Z", "America/Sao_Paulo") → { date: "2026-10-15", time: "10:00" }
 */
export function utcToLocal(iso: string, tz: string): { date: string; time: string } {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(tz);
  if (!dt.isValid) {
    throw new Error(`ISO inválido: ${iso}`);
  }
  return {
    date: dt.toFormat("yyyy-MM-dd"),
    time: dt.toFormat("HH:mm"),
  };
}
