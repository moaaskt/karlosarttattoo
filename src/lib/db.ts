import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  isValidISODate,
  serializeDate,
  expandWindow,
  expandAllDay,
  isWithinWorkHours,
  generateId,
  type AvailabilityRuleShape,
} from "./booking-utils";
import { utcToLocal, isPastDateTime, isFutureWindowExceeded } from "./agenda-utils";

export interface BookingWarning {
  code: "outside_hours" | "past_date" | "future_window";
  message: string;
}

// ==========================================
// Tipagens e Modelos de Dados (D-01 a D-05)
// ==========================================

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  status: "novo" | "contatado" | "agendado" | "arquivado";
  createdAt: string;
}

export interface Booking {
  id: string;
  lead_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  location: "estudio" | "domicilio" | "evento";
  session_type: "tatuagem" | "flash" | "retoque" | "projeto" | "outro";
  start_at: string;
  end_at: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado" | "no_show";
  deposit_cents: number;
  deposit_status: "pendente" | "pago" | "dispensado" | "retido" | "devolvido";
  price_total_cents: number;
  project_id: string | null;
  session_number: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  start_at: string;
  end_at: string;
  all_day: number;
  reason_tag: "viagem_guest" | "folga_criacao" | "evento" | "pessoal" | "outro";
  note: string | null;
  created_at: string;
}

export interface AvailabilityRule {
  id: string;
  day_of_week: number;
  window_start: string;
  window_end: string;
  is_active: number;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type:
    | "created"
    | "confirmed"
    | "rescheduled"
    | "cancelled"
    | "no_show"
    | "completed"
    | "deposit_paid"
    | "deposit_waived"
    | "deposit_retained"
    | "deposit_refunded"
    | "note_updated"
    | "lead_linked";
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
}

export interface SettingsMap {
  [key: string]: string;
}

export interface CreateBookingInput {
  lead_id?: string | null;
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  location: "estudio" | "domicilio" | "evento";
  session_type: "tatuagem" | "flash" | "retoque" | "projeto" | "outro";
  start_at: string;
  end_at: string;
  status?: "pendente" | "confirmado";
  deposit_cents?: number;
  deposit_status?: "pendente" | "pago" | "dispensado";
  price_total_cents?: number;
  project_id?: string | null;
  session_number?: number | null;
  notes?: string | null;
}

export interface CreateTimeBlockInput {
  start_at: string;
  end_at?: string;
  all_day?: number;
  reason_tag: "viagem_guest" | "folga_criacao" | "evento" | "pessoal" | "outro";
  note?: string | null;
}

// ==========================================
// Instância do Banco e Migrações
// ==========================================

let dbInstance: DatabaseSync | null = null;

export function applyPragmasAndSchema(db: DatabaseSync) {
  // D-06: Pragmas obrigatórios
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  // 1. Tabela leads existente
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'novo',
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
  `);

  // 2. Tabela settings (D-04)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings VALUES
      ('timezone',       'America/Sao_Paulo'),
      ('buffer_minutes', '30'),
      ('preset_manha',   '09:00'),
      ('preset_tarde',   '14:00'),
      ('preset_noite',   '18:30');
  `);

  // 3. Tabela availability_rules (D-03)
  db.exec(`
    CREATE TABLE IF NOT EXISTS availability_rules (
      id           TEXT    PRIMARY KEY,
      day_of_week  INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      window_start TEXT    NOT NULL,
      window_end   TEXT    NOT NULL,
      is_active    INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      CHECK(window_end > window_start)
    );
    -- Seed padrão: Ter-Sex (09:00-12:30 e 14:00-20:00), Sáb (09:00-14:00)
    INSERT OR IGNORE INTO availability_rules VALUES
      ('ar_ter_1', 2, '09:00', '12:30', 1),
      ('ar_ter_2', 2, '14:00', '20:00', 1),
      ('ar_qua_1', 3, '09:00', '12:30', 1),
      ('ar_qua_2', 3, '14:00', '20:00', 1),
      ('ar_qui_1', 4, '09:00', '12:30', 1),
      ('ar_qui_2', 4, '14:00', '20:00', 1),
      ('ar_sex_1', 5, '09:00', '12:30', 1),
      ('ar_sex_2', 5, '14:00', '20:00', 1),
      ('ar_sab_1', 6, '09:00', '14:00', 1);
  `);

  // 4. Tabela bookings (D-01)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id                TEXT    PRIMARY KEY,
      lead_id           TEXT    NULL REFERENCES leads(id),
      client_name       TEXT    NOT NULL,
      client_phone      TEXT    NOT NULL,
      client_email      TEXT,
      location          TEXT    NOT NULL CHECK(location IN ('estudio','domicilio','evento')),
      session_type      TEXT    NOT NULL CHECK(session_type IN ('tatuagem','flash','retoque','projeto','outro')),
      start_at          TEXT    NOT NULL,
      end_at            TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'pendente'
        CHECK(status IN ('pendente','confirmado','concluido','cancelado','no_show')),
      deposit_cents     INTEGER NOT NULL DEFAULT 0,
      deposit_status    TEXT    NOT NULL DEFAULT 'pendente'
        CHECK(deposit_status IN ('pendente','pago','dispensado','retido','devolvido')),
      price_total_cents INTEGER NOT NULL DEFAULT 0,
      project_id        TEXT    NULL,
      session_number    INTEGER NULL,
      notes             TEXT,
      created_at        TEXT    NOT NULL,
      updated_at        TEXT    NOT NULL,
      CHECK(end_at > start_at)
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings (start_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
  `);

  // 5. Tabela time_blocks (D-02)
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_blocks (
      id          TEXT    PRIMARY KEY,
      start_at    TEXT    NOT NULL,
      end_at      TEXT    NOT NULL,
      all_day     INTEGER NOT NULL DEFAULT 0 CHECK(all_day IN (0, 1)),
      reason_tag  TEXT    NOT NULL
        CHECK(reason_tag IN ('viagem_guest','folga_criacao','evento','pessoal','outro')),
      note        TEXT,
      created_at  TEXT    NOT NULL,
      CHECK(end_at > start_at)
    );
    CREATE INDEX IF NOT EXISTS idx_time_blocks_range ON time_blocks (start_at, end_at);
  `);

  // 6. Tabela booking_events (D-05)
  db.exec(`
    CREATE TABLE IF NOT EXISTS booking_events (
      id          TEXT    PRIMARY KEY,
      booking_id  TEXT    NOT NULL REFERENCES bookings(id),
      event_type  TEXT    NOT NULL CHECK(event_type IN (
        'created','confirmed','rescheduled','cancelled','no_show','completed',
        'deposit_paid','deposit_waived','deposit_retained','deposit_refunded','note_updated','lead_linked'
      )),
      old_value   TEXT,
      new_value   TEXT,
      note        TEXT,
      created_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON booking_events (booking_id, created_at DESC);
  `);
}

/**
 * Retorna a instância ativa do SQLite.
 * Suporta injeção de caminho temporário via DB_PATH ou customPath (para testes isolados).
 */
export function getDatabase(customPath?: string): DatabaseSync {
  if (customPath) {
    const customDb = new DatabaseSync(customPath);
    applyPragmasAndSchema(customDb);
    return customDb;
  }

  if (dbInstance) return dbInstance;

  try {
    // 1. Verifica se foi especificado DB_PATH em variável de ambiente (ex: ':memory:' para testes)
    if (process.env.DB_PATH) {
      dbInstance = new DatabaseSync(process.env.DB_PATH);
      applyPragmasAndSchema(dbInstance);
      return dbInstance;
    }

    // 2. Persistência padrão em data/leads.db
    const dbDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
        // Fallback em ambientes com restrição de permissão
      }
    }

    const dbPath = fs.existsSync(dbDir) ? path.join(dbDir, "leads.db") : ":memory:";

    dbInstance = new DatabaseSync(dbPath);
    applyPragmasAndSchema(dbInstance);

    // Inserir leads demonstrativos caso a tabela esteja totalmente vazia
    const countStmt = dbInstance.prepare("SELECT COUNT(*) as count FROM leads");
    const result = countStmt.get() as { count: number } | undefined;
    if (result && result.count === 0) {
      const seedStmt = dbInstance.prepare(`
        INSERT INTO leads (id, name, phone, email, service, message, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      seedStmt.run(
        "lead_seed_01",
        "Mariana Silveira",
        "48991234567",
        "mariana.silveira@exemplo.com",
        "Estúdio Privado (Palhoça)",
        "Quero uma composição geométrica floral no antebraço, traços ultrafinos (fine line).",
        "novo",
        new Date(Date.now() - 3600000 * 2).toISOString(),
      );
      seedStmt.run(
        "lead_seed_02",
        "Lucas Mendonça",
        "48988765432",
        "lucas.mendonca@exemplo.com",
        "Atendimento a Domicílio (Florianópolis / São José / Região)",
        "Tatuagem autoral nas costas, estilo microrrealismo e projeção anatômica.",
        "contatado",
        new Date(Date.now() - 3600000 * 24).toISOString(),
      );
      seedStmt.run(
        "lead_seed_03",
        "Camila Duarte",
        "48996541230",
        "camila.duarte@exemplo.com",
        "Estúdio Privado (Palhoça)",
        "Lettering delicado na costela e símbolo minimalista.",
        "agendado",
        new Date(Date.now() - 3600000 * 48).toISOString(),
      );
    }

    return dbInstance;
  } catch (error) {
    console.error("[Database] Erro ao inicializar SQLite:", error);
    dbInstance = new DatabaseSync(":memory:");
    applyPragmasAndSchema(dbInstance);
    return dbInstance;
  }
}

/**
 * Fecha e reseta a conexão ativa com o banco.
 * Essencial para que suites de teste possam alternar de banco com segurança.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}

// ==========================================
// Módulo de Leads (Existente mantido)
// ==========================================

export function createLead(data: {
  name: string;
  phone: string;
  email: string;
  service: string;
  message?: string;
}): Lead {
  const db = getDatabase();
  const id = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();
  const status: Lead["status"] = "novo";
  const message = data.message || "";

  const stmt = db.prepare(`
    INSERT INTO leads (id, name, phone, email, service, message, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.name, data.phone, data.email, data.service, message, status, createdAt);

  return {
    id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    service: data.service,
    message,
    status,
    createdAt,
  };
}

export function listLeads(statusFilter?: string): Lead[] {
  const db = getDatabase();
  if (statusFilter && statusFilter !== "todos") {
    const stmt = db.prepare("SELECT * FROM leads WHERE status = ? ORDER BY createdAt DESC");
    return stmt.all(statusFilter) as unknown as Lead[];
  }
  const stmt = db.prepare("SELECT * FROM leads ORDER BY createdAt DESC");
  return stmt.all() as unknown as Lead[];
}

export function updateLeadStatus(id: string, status: Lead["status"]): boolean {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE leads SET status = ? WHERE id = ?");
  const info = stmt.run(status, id);
  return info.changes > 0;
}

export function getLeadStats() {
  const db = getDatabase();
  const all = (db.prepare("SELECT status FROM leads").all() as { status: string }[]) || [];
  const total = all.length;
  const novos = all.filter((l) => l.status === "novo").length;
  const contatados = all.filter((l) => l.status === "contatado").length;
  const agendados = all.filter((l) => l.status === "agendado").length;
  const arquivados = all.filter((l) => l.status === "arquivado").length;

  const conversionRate = total > 0 ? ((agendados / total) * 100).toFixed(1) : "0.0";

  return {
    total,
    novos,
    contatados,
    agendados,
    arquivados,
    conversionRate: `${conversionRate}%`,
  };
}

// ==========================================
// Módulo de Settings (D-04)
// ==========================================

export function getSettings(): SettingsMap {
  const db = getDatabase();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const map: SettingsMap = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export function updateSetting(key: string, value: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run(key, value);
}

// ==========================================
// Módulo de Availability Rules (D-03)
// ==========================================

export function listAvailabilityRules(): AvailabilityRule[] {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM availability_rules ORDER BY day_of_week ASC, window_start ASC")
    .all() as unknown as AvailabilityRule[];
}

export function upsertAvailabilityRule(rule: {
  id?: string;
  day_of_week: number;
  window_start: string;
  window_end: string;
  is_active?: number;
}): AvailabilityRule {
  const db = getDatabase();
  if (rule.window_end <= rule.window_start) {
    throw new Error("window_end deve ser posterior a window_start");
  }
  if (rule.day_of_week < 0 || rule.day_of_week > 6) {
    throw new Error("day_of_week deve estar entre 0 (Dom) e 6 (Sáb)");
  }

  const id = rule.id || generateId("ar");
  const isActive = rule.is_active ?? 1;

  const stmt = db.prepare(`
    INSERT INTO availability_rules (id, day_of_week, window_start, window_end, is_active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      day_of_week = excluded.day_of_week,
      window_start = excluded.window_start,
      window_end = excluded.window_end,
      is_active = excluded.is_active
  `);

  stmt.run(id, rule.day_of_week, rule.window_start, rule.window_end, isActive);

  return {
    id,
    day_of_week: rule.day_of_week,
    window_start: rule.window_start,
    window_end: rule.window_end,
    is_active: isActive,
  };
}

export function deleteAvailabilityRule(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM availability_rules WHERE id = ?");
  const info = stmt.run(id);
  return info.changes > 0;
}

// ==========================================
// Módulo de Time Blocks (D-02, D-13)
// ==========================================

export function createTimeBlock(
  data: CreateTimeBlockInput,
  force = false,
): {
  timeBlock?: TimeBlock;
  error?: "validation_error" | "booking_conflict";
  conflicts?: Array<{ id: string; client_name: string; start_at: string; end_at: string }>;
  message?: string;
} {
  const db = getDatabase();
  const settings = getSettings();
  const timezone = settings["timezone"] || "America/Sao_Paulo";

  let startAt = data.start_at;
  let endAt = data.end_at || data.start_at;
  const isAllDay = data.all_day === 1 ? 1 : 0;

  if (isAllDay) {
    // Converte para intervalo semiaberto [start, end)
    const expanded = expandAllDay(startAt, timezone, endAt);
    startAt = expanded.start;
    endAt = expanded.end;
  } else {
    if (!isValidISODate(startAt) || !isValidISODate(endAt)) {
      return {
        error: "validation_error",
        message: "start_at e end_at devem ser strings ISO UTC válidas (YYYY-MM-DDTHH:mm:ss.sssZ).",
      };
    }
    if (endAt <= startAt) {
      return {
        error: "validation_error",
        message: "end_at deve ser posterior a start_at.",
      };
    }
  }

  // D-13: Verificar conflito com agendamentos ativos se force não for true
  if (!force) {
    const bookingConflictStmt = db.prepare(`
      SELECT id, client_name, start_at, end_at FROM bookings
      WHERE status NOT IN ('cancelado', 'no_show')
        AND ? < end_at AND start_at < ?
    `);
    const activeConflicts = bookingConflictStmt.all(startAt, endAt) as Array<{
      id: string;
      client_name: string;
      start_at: string;
      end_at: string;
    }>;

    if (activeConflicts.length > 0) {
      return {
        error: "booking_conflict",
        conflicts: activeConflicts,
        message:
          "Existem agendamentos ativos no período selecionado. Confirme com force para prosseguir.",
      };
    }
  }

  const id = generateId("tb");
  const createdAt = serializeDate(new Date());

  const stmt = db.prepare(`
    INSERT INTO time_blocks (id, start_at, end_at, all_day, reason_tag, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, startAt, endAt, isAllDay, data.reason_tag, data.note || null, createdAt);

  return {
    timeBlock: {
      id,
      start_at: startAt,
      end_at: endAt,
      all_day: isAllDay,
      reason_tag: data.reason_tag,
      note: data.note || null,
      created_at: createdAt,
    },
  };
}

export function listTimeBlocks(from?: string, to?: string): TimeBlock[] {
  const db = getDatabase();
  if (from && to) {
    const stmt = db.prepare(`
      SELECT * FROM time_blocks
      WHERE ? < end_at AND start_at < ?
      ORDER BY start_at ASC
    `);
    return stmt.all(from, to) as unknown as TimeBlock[];
  }
  const stmt = db.prepare("SELECT * FROM time_blocks ORDER BY start_at ASC");
  return stmt.all() as unknown as TimeBlock[];
}

export function deleteTimeBlock(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM time_blocks WHERE id = ?");
  const info = stmt.run(id);
  return info.changes > 0;
}

// ==========================================
// Módulo de Bookings & Anti-Conflito (D-01, D-08, D-09, D-10, D-11)
// ==========================================

export function listBookings(from?: string, to?: string, statusFilter?: string): Booking[] {
  const db = getDatabase();

  let query = "SELECT * FROM bookings";
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (from && to) {
    conditions.push("? < end_at AND start_at < ?");
    params.push(from, to);
  }

  if (statusFilter && statusFilter !== "todos") {
    conditions.push("status = ?");
    params.push(statusFilter);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY start_at ASC";

  const stmt = db.prepare(query);
  return stmt.all(...params) as unknown as Booking[];
}

export function getBookingById(id: string): (Booking & { events: BookingEvent[] }) | null {
  const db = getDatabase();
  const bookingStmt = db.prepare("SELECT * FROM bookings WHERE id = ?");
  const booking = bookingStmt.get(id) as unknown as Booking | undefined;
  if (!booking) return null;

  const eventsStmt = db.prepare(
    "SELECT * FROM booking_events WHERE booking_id = ? ORDER BY created_at ASC",
  );
  const events = eventsStmt.all(id) as unknown as BookingEvent[];

  return {
    ...booking,
    events,
  };
}

export function calculateBookingWarnings(
  startAt: string,
  endAt: string,
  settings: Record<string, string>,
  now?: Date | string,
): BookingWarning[] {
  const timezone = settings["timezone"] || "America/Sao_Paulo";
  const rules = listAvailabilityRules();
  const warnings: BookingWarning[] = [];

  // 1. Outside hours
  const isWithinHours = isWithinWorkHours(startAt, endAt, rules, timezone);
  if (!isWithinHours) {
    warnings.push({
      code: "outside_hours",
      message: "O horário escolhido está fora do expediente de atendimento regular.",
    });
  }

  // 2. Past date
  const local = utcToLocal(startAt, timezone);
  if (isPastDateTime(local.date, local.time, timezone, now)) {
    warnings.push({
      code: "past_date",
      message: "A data e horário informados estão no passado.",
    });
  }

  // 3. Future window
  const futureDaysLimit = parseInt(settings["future_days_limit"] || "0", 10);
  if (futureDaysLimit > 0 && isFutureWindowExceeded(local.date, timezone, futureDaysLimit, now)) {
    warnings.push({
      code: "future_window",
      message: `A data informada ultrapassa a janela limite de ${futureDaysLimit} dias futuros.`,
    });
  }

  return warnings;
}

export function createBooking(
  data: CreateBookingInput,
  force = false,
  options?: { now?: Date | string },
): {
  booking?: Booking;
  error?: "time_block_conflict" | "booking_conflict" | "validation_error";
  requires_force?: boolean;
  warnings?: BookingWarning[];
  conflicts?: Array<{
    id: string;
    client_name?: string;
    start_at: string;
    end_at: string;
    reason_tag?: string;
  }>;
  message?: string;
} {
  const db = getDatabase();

  // 1. Validações preliminares de datas
  if (!isValidISODate(data.start_at) || !isValidISODate(data.end_at)) {
    return {
      error: "validation_error",
      message:
        "start_at e end_at devem ser strings ISO UTC válidas (ex: 2026-10-15T13:00:00.000Z).",
    };
  }
  if (data.end_at <= data.start_at) {
    return {
      error: "validation_error",
      message: "end_at deve ser estritamente posterior a start_at.",
    };
  }

  const depositCents = data.deposit_cents || 0;
  const priceTotalCents = data.price_total_cents || 0;

  // Invariante: sinal não pode ser superior ao valor total se total for definido
  if (priceTotalCents > 0 && depositCents > priceTotalCents) {
    return {
      error: "validation_error",
      message:
        "O valor do sinal (deposit_cents) não pode ser superior ao valor total (price_total_cents).",
    };
  }

  const settings = getSettings();
  const bufferMinutes = parseInt(settings["buffer_minutes"] || "30", 10);
  const { windowStart, windowEnd } = expandWindow(data.start_at, data.end_at, bufferMinutes);

  // Transação com BEGIN IMMEDIATE (D-09)
  db.exec("BEGIN IMMEDIATE");

  try {
    // 2. Validação e avanço do lead_id (TASK-15)
    if (data.lead_id) {
      const lead = db.prepare("SELECT id, status FROM leads WHERE id = ?").get(data.lead_id) as
        { id: string; status: Lead["status"] } | undefined;

      if (!lead) {
        db.exec("ROLLBACK");
        return {
          error: "validation_error",
          message: "Lead informado não existe",
        };
      }

      // Regra de avanço unidirecional: novo ou contatado -> agendado
      if (lead.status === "novo" || lead.status === "contatado") {
        db.prepare("UPDATE leads SET status = 'agendado' WHERE id = ?").run(data.lead_id);
      }
    }

    // 3. Checar conflito com time_blocks (Precedência Absoluta — bloqueio duro, sem buffer, SEM BYPASS mesmo com force: true!)
    const timeBlockConflictStmt = db.prepare(`
      SELECT id, reason_tag, note, start_at, end_at FROM time_blocks
      WHERE ? < end_at AND start_at < ?
    `);
    const tbConflicts = timeBlockConflictStmt.all(data.start_at, data.end_at) as Array<{
      id: string;
      reason_tag: string;
      note: string | null;
      start_at: string;
      end_at: string;
    }>;

    if (tbConflicts.length > 0) {
      db.exec("ROLLBACK");
      return {
        error: "time_block_conflict",
        conflicts: tbConflicts,
        message:
          "Conflito com bloqueio de tempo (folga/viagem) existente no período. Bloqueio absoluto.",
      };
    }

    // 4. Checar conflito com outros bookings ativos (Precedência Absoluta — usando janela expandida)
    const bookingConflictStmt = db.prepare(`
      SELECT id, client_name, start_at, end_at FROM bookings
      WHERE status NOT IN ('cancelado', 'no_show')
        AND ? < end_at AND start_at < ?
    `);
    const bConflicts = bookingConflictStmt.all(windowStart, windowEnd) as Array<{
      id: string;
      client_name: string;
      start_at: string;
      end_at: string;
    }>;

    if (bConflicts.length > 0) {
      db.exec("ROLLBACK");
      return {
        error: "booking_conflict",
        conflicts: bConflicts,
        message: `Conflito de horário com agendamento ativo (considerando intervalo de respiro de ${bufferMinutes} min).`,
      };
    }

    // 5. Conflitos duros superados -> calcular avisos acumulados (TASK-17)
    const warnings = calculateBookingWarnings(data.start_at, data.end_at, settings, options?.now);

    if (warnings.length > 0 && !force) {
      db.exec("ROLLBACK");
      return {
        requires_force: true,
        warnings,
        message: warnings.map((w) => w.message).join(" "),
      };
    }

    // 6. Inserir agendamento
    const id = generateId("bkg");
    const now = serializeDate(new Date());
    const status = data.status || "pendente";
    const depositStatus = data.deposit_status || "pendente";

    // Regra: se status for criado direto como confirmado, exige sinal pago ou dispensado
    if (status === "confirmado" && depositStatus !== "pago" && depositStatus !== "dispensado") {
      db.exec("ROLLBACK");
      return {
        error: "validation_error",
        message: "Status confirmado exige sinal pago ou dispensado.",
      };
    }

    const insertBookingStmt = db.prepare(`
      INSERT INTO bookings (
        id, lead_id, client_name, client_phone, client_email,
        location, session_type, start_at, end_at, status,
        deposit_cents, deposit_status, price_total_cents,
        project_id, session_number, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBookingStmt.run(
      id,
      data.lead_id || null,
      data.client_name,
      data.client_phone,
      data.client_email || null,
      data.location,
      data.session_type,
      data.start_at,
      data.end_at,
      status,
      depositCents,
      depositStatus,
      priceTotalCents,
      data.project_id || null,
      data.session_number || null,
      data.notes || null,
      now,
      now,
    );

    // Eventos de auditoria em booking_events
    const insertEventStmt = db.prepare(`
      INSERT INTO booking_events (id, booking_id, event_type, old_value, new_value, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    if (data.lead_id) {
      insertEventStmt.run(
        generateId("bke"),
        id,
        "lead_linked",
        null,
        JSON.stringify({ lead_id: data.lead_id }),
        "Lead associado ao agendamento",
        now,
      );
    }

    const newBookingData: Booking = {
      id,
      lead_id: data.lead_id || null,
      client_name: data.client_name,
      client_phone: data.client_phone,
      client_email: data.client_email || null,
      location: data.location,
      session_type: data.session_type,
      start_at: data.start_at,
      end_at: data.end_at,
      status,
      deposit_cents: depositCents,
      deposit_status: depositStatus,
      price_total_cents: priceTotalCents,
      project_id: data.project_id || null,
      session_number: data.session_number || null,
      notes: data.notes || null,
      created_at: now,
      updated_at: now,
    };

    const createNote =
      force && warnings.length > 0
        ? `Agendamento criado no sistema. Avisos ignorados com force: ${warnings.map((w) => w.code).join(", ")}`
        : "Agendamento criado no sistema";

    insertEventStmt.run(
      generateId("bke"),
      id,
      "created",
      null,
      JSON.stringify(newBookingData),
      createNote,
      now,
    );

    db.exec("COMMIT");

    return {
      booking: newBookingData,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // safe
    }
    throw err;
  }
}

/**
 * Atualização de status seguindo a máquina de estados rígida (D-10) e invariantes.
 */
export function updateBookingStatus(
  id: string,
  newStatus: Booking["status"],
  options?: {
    depositAction?: "retido" | "devolvido";
    note?: string;
  },
): {
  booking?: Booking;
  error?: "not_found" | "invalid_transition" | "deposit_required" | "deposit_action_required";
  message?: string;
} {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");

  try {
    const current = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as
      Booking | undefined;
    if (!current) {
      db.exec("ROLLBACK");
      return { error: "not_found", message: "Agendamento não encontrado." };
    }

    // INVARIANTE: Estados terminais ('cancelado', 'no_show', 'concluido') não podem ter seu status alterado
    if (
      current.status === "cancelado" ||
      current.status === "no_show" ||
      current.status === "concluido"
    ) {
      db.exec("ROLLBACK");
      return {
        error: "invalid_transition",
        message: `Transição recusada. Agendamentos com status '${current.status}' são finais e não permitem novas alterações de status.`,
      };
    }

    // Validar máquina de estados para agendamentos em andamento
    if (newStatus === "confirmado") {
      if (current.status !== "pendente") {
        db.exec("ROLLBACK");
        return {
          error: "invalid_transition",
          message: `Não é possível confirmar um agendamento com status '${current.status}'.`,
        };
      }
      if (current.deposit_status !== "pago" && current.deposit_status !== "dispensado") {
        db.exec("ROLLBACK");
        return {
          error: "deposit_required",
          message: "Confirmação exige sinal com status 'pago' ou 'dispensado'.",
        };
      }
    } else if (newStatus === "cancelado" || newStatus === "no_show") {
      // Regra de sinal: se deposit_status for 'pago', exige escolher retido ou devolvido
      if (current.deposit_status === "pago") {
        if (
          !options?.depositAction ||
          (options.depositAction !== "retido" && options.depositAction !== "devolvido")
        ) {
          db.exec("ROLLBACK");
          return {
            error: "deposit_action_required",
            message:
              "Para cancelar ou registrar falta com sinal pago, é obrigatório definir o destino do sinal ('retido' ou 'devolvido').",
          };
        }
      }
    } else if (newStatus === "concluido") {
      if (current.status !== "confirmado" && current.status !== "pendente") {
        db.exec("ROLLBACK");
        return {
          error: "invalid_transition",
          message: `Não é possível concluir um agendamento com status '${current.status}'.`,
        };
      }
    } else if (newStatus === "pendente") {
      // Não é permitido rebaixar confirmado para pendente
      if (current.status === "confirmado") {
        db.exec("ROLLBACK");
        return {
          error: "invalid_transition",
          message: "Não é permitido reverter um agendamento confirmado para pendente.",
        };
      }
    }

    const now = serializeDate(new Date());
    let nextDepositStatus = current.deposit_status;
    if (
      (newStatus === "cancelado" || newStatus === "no_show") &&
      current.deposit_status === "pago" &&
      options?.depositAction
    ) {
      nextDepositStatus = options.depositAction;
    }

    const updateStmt = db.prepare(`
      UPDATE bookings
      SET status = ?, deposit_status = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(newStatus, nextDepositStatus, now, id);

    // Evento de transição
    const eventTypeMap: Record<Booking["status"], BookingEvent["event_type"]> = {
      confirmado: "confirmed",
      cancelado: "cancelled",
      no_show: "no_show",
      concluido: "completed",
      pendente: "note_updated",
    };

    const eventId = generateId("bke");
    db.prepare(
      `
      INSERT INTO booking_events (id, booking_id, event_type, old_value, new_value, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      eventId,
      id,
      eventTypeMap[newStatus],
      JSON.stringify({ status: current.status, deposit_status: current.deposit_status }),
      JSON.stringify({ status: newStatus, deposit_status: nextDepositStatus }),
      options?.note || `Status alterado de ${current.status} para ${newStatus}`,
      now,
    );

    // Se houve mudança no status do sinal junto ao cancelamento/falta, grava evento específico
    if (nextDepositStatus !== current.deposit_status) {
      const depositEventId = generateId("bke");
      const depEventType = nextDepositStatus === "retido" ? "deposit_retained" : "deposit_refunded";
      db.prepare(
        `
        INSERT INTO booking_events (id, booking_id, event_type, old_value, new_value, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        depositEventId,
        id,
        depEventType,
        current.deposit_status,
        nextDepositStatus,
        `Sinal ${nextDepositStatus} devido ao encerramento como ${newStatus}`,
        now,
      );
    }

    // Se o agendamento foi cancelado ou registrado no-show e possuía lead_id vinculado (TASK-15)
    if (current.lead_id && (newStatus === "cancelado" || newStatus === "no_show")) {
      const activeLeadsBookings = db
        .prepare(
          `
        SELECT COUNT(*) as c FROM bookings
        WHERE lead_id = ? AND id != ? AND status NOT IN ('cancelado', 'no_show')
      `,
        )
        .get(current.lead_id, id) as { c: number };

      if (activeLeadsBookings.c === 0) {
        db.prepare(
          `
          UPDATE leads
          SET status = 'contatado'
          WHERE id = ? AND status = 'agendado'
        `,
        ).run(current.lead_id);
      }
    }

    db.exec("COMMIT");

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as Booking;
    return { booking: updated };
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // rollback safe
    }
    throw err;
  }
}

/**
 * Remarcação de agendamento — D-11 (Ação que mantém o status atual e audita)
 * INVARIANTE: Apenas agendamentos 'pendente' ou 'confirmado' podem ser remarcados.
 */
export function rescheduleBooking(
  id: string,
  newStartAt: string,
  newEndAt: string,
  force = false,
  note?: string,
  options?: { now?: Date | string },
): {
  booking?: Booking;
  error?:
    | "not_found"
    | "validation_error"
    | "invalid_status"
    | "time_block_conflict"
    | "booking_conflict";
  requires_force?: boolean;
  warnings?: BookingWarning[];
  conflicts?: Array<{ id: string; client_name?: string; start_at: string; end_at: string }>;
  message?: string;
} {
  const db = getDatabase();

  if (!isValidISODate(newStartAt) || !isValidISODate(newEndAt)) {
    return {
      error: "validation_error",
      message: "newStartAt e newEndAt devem ser strings ISO UTC válidas.",
    };
  }
  if (newEndAt <= newStartAt) {
    return {
      error: "validation_error",
      message: "newEndAt deve ser posterior a newStartAt.",
    };
  }

  const settings = getSettings();
  const bufferMinutes = parseInt(settings["buffer_minutes"] || "30", 10);
  const { windowStart, windowEnd } = expandWindow(newStartAt, newEndAt, bufferMinutes);

  db.exec("BEGIN IMMEDIATE");

  try {
    const current = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as
      Booking | undefined;
    if (!current) {
      db.exec("ROLLBACK");
      return { error: "not_found", message: "Agendamento não encontrado." };
    }

    // INVARIANTE: Remarcação só pode ocorrer em agendamentos pendentes ou confirmados
    if (current.status !== "pendente" && current.status !== "confirmado") {
      db.exec("ROLLBACK");
      return {
        error: "invalid_status",
        message: `Apenas agendamentos 'pendente' ou 'confirmado' podem ser remarcados. Status atual: '${current.status}'.`,
      };
    }

    // 1. Checa time_blocks no novo horário (Precedência Absoluta — bloqueio duro, sem bypass)
    const timeBlockConflictStmt = db.prepare(`
      SELECT id, reason_tag, note, start_at, end_at FROM time_blocks
      WHERE ? < end_at AND start_at < ?
    `);
    const tbConflicts = timeBlockConflictStmt.all(newStartAt, newEndAt) as Array<{
      id: string;
      reason_tag: string;
      note: string | null;
      start_at: string;
      end_at: string;
    }>;

    if (tbConflicts.length > 0) {
      db.exec("ROLLBACK");
      return {
        error: "time_block_conflict",
        conflicts: tbConflicts,
        message: "Conflito com bloqueio de tempo (folga/viagem) no novo horário.",
      };
    }

    // 2. Checa outros bookings com buffer (Precedência Absoluta — excluindo o próprio agendamento!)
    const bookingConflictStmt = db.prepare(`
      SELECT id, client_name, start_at, end_at FROM bookings
      WHERE id != ?
        AND status NOT IN ('cancelado', 'no_show')
        AND ? < end_at AND start_at < ?
    `);
    const bConflicts = bookingConflictStmt.all(id, windowStart, windowEnd) as Array<{
      id: string;
      client_name: string;
      start_at: string;
      end_at: string;
    }>;

    if (bConflicts.length > 0) {
      db.exec("ROLLBACK");
      return {
        error: "booking_conflict",
        conflicts: bConflicts,
        message: "Conflito com outro agendamento ativo no novo horário.",
      };
    }

    // 3. Conflitos duros superados -> calcular avisos acumulados (TASK-17)
    const warnings = calculateBookingWarnings(newStartAt, newEndAt, settings, options?.now);

    if (warnings.length > 0 && !force) {
      db.exec("ROLLBACK");
      return {
        requires_force: true,
        warnings,
        message: warnings.map((w) => w.message).join(" "),
      };
    }

    const now = serializeDate(new Date());

    // Atualiza horários mantendo o status atual
    db.prepare(
      `
      UPDATE bookings
      SET start_at = ?, end_at = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(newStartAt, newEndAt, now, id);

    // Grava evento de remarcação com auditoria de force se aplicável
    const finalNote =
      force && warnings.length > 0
        ? `${note || "Sessão remarcada"}. Avisos ignorados com force: ${warnings.map((w) => w.code).join(", ")}`
        : note || "Sessão remarcada";

    const eventId = generateId("bke");
    db.prepare(
      `
      INSERT INTO booking_events (id, booking_id, event_type, old_value, new_value, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      eventId,
      id,
      "rescheduled",
      JSON.stringify({ start_at: current.start_at, end_at: current.end_at }),
      JSON.stringify({ start_at: newStartAt, end_at: newEndAt }),
      finalNote,
      now,
    );

    db.exec("COMMIT");

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as Booking;
    return {
      booking: updated,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // safe
    }
    throw err;
  }
}

/**
 * Atualização específica do status do sinal (D-10)
 * INVARIANTES:
 * - Se confirmado, não pode mudar para 'pendente' (confirmado exige pago ou dispensado).
 * - 'retido' e 'devolvido' são válidos apenas quando cancelado ou no_show.
 */
export function updateDepositStatus(
  id: string,
  depositStatus: Booking["deposit_status"],
  depositCents?: number,
  note?: string,
): {
  booking?: Booking;
  error?: "not_found" | "invalid_deposit_status";
  message?: string;
} {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");

  try {
    const current = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as
      Booking | undefined;
    if (!current) {
      db.exec("ROLLBACK");
      return { error: "not_found", message: "Agendamento não encontrado." };
    }

    // INVARIANTE: Se já confirmado, não pode voltar sinal para pendente
    if (current.status === "confirmado" && depositStatus === "pendente") {
      db.exec("ROLLBACK");
      return {
        error: "invalid_deposit_status",
        message:
          "Agendamento com status 'confirmado' exige sinal pago ou dispensado. Não é permitido retornar o sinal para 'pendente'.",
      };
    }

    // INVARIANTE: 'retido' e 'devolvido' só válidos após cancelado ou no_show
    if (depositStatus === "retido" || depositStatus === "devolvido") {
      if (current.status !== "cancelado" && current.status !== "no_show") {
        db.exec("ROLLBACK");
        return {
          error: "invalid_deposit_status",
          message:
            "O sinal só pode ser 'retido' ou 'devolvido' após o cancelamento ou no-show da sessão.",
        };
      }
    }

    const nextCents = typeof depositCents === "number" ? depositCents : current.deposit_cents;

    // Invariante de valor: deposit_cents <= price_total_cents
    if (current.price_total_cents > 0 && nextCents > current.price_total_cents) {
      db.exec("ROLLBACK");
      return {
        error: "invalid_deposit_status",
        message: "O valor do sinal não pode ser superior ao valor total do agendamento.",
      };
    }

    const now = serializeDate(new Date());

    db.prepare(
      `
      UPDATE bookings
      SET deposit_status = ?, deposit_cents = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(depositStatus, nextCents, now, id);

    let eventType: BookingEvent["event_type"] = "note_updated";
    if (depositStatus === "pago") eventType = "deposit_paid";
    else if (depositStatus === "dispensado") eventType = "deposit_waived";
    else if (depositStatus === "retido") eventType = "deposit_retained";
    else if (depositStatus === "devolvido") eventType = "deposit_refunded";

    const eventId = generateId("bke");
    db.prepare(
      `
      INSERT INTO booking_events (id, booking_id, event_type, old_value, new_value, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      eventId,
      id,
      eventType,
      JSON.stringify({
        deposit_status: current.deposit_status,
        deposit_cents: current.deposit_cents,
      }),
      JSON.stringify({ deposit_status: depositStatus, deposit_cents: nextCents }),
      note || `Status do sinal alterado para ${depositStatus}`,
      now,
    );

    db.exec("COMMIT");

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as Booking;
    return { booking: updated };
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // safe
    }
    throw err;
  }
}

export interface UpdateBookingDataPatch {
  client_name?: string;
  client_phone?: string;
  client_email?: string | null;
  location?: "estudio" | "domicilio" | "evento";
  session_type?: "tatuagem" | "flash" | "retoque" | "projeto" | "outro";
  price_total_cents?: number;
  deposit_cents?: number;
  notes?: string | null;
}

/**
 * Atualização de dados cadastrais/sessão do agendamento (TASK-05b)
 * - Ignora campos que não foram alterados (sem erro 422 por reenvio).
 * - Impede alteração de dados de contato em status 'cancelado' ou 'no_show'.
 * - 'concluido' aceita edição de contato e notas.
 * - Valida deposit_cents <= price_total_cents sobre valores mesclados se price_total_cents > 0.
 * - Bloqueia alteração de deposit_cents se sinal já pago/retido/devolvido.
 * - Registra 'note_updated' em booking_events se notes for alterado.
 */
export function updateBookingData(
  id: string,
  patch: UpdateBookingDataPatch,
): {
  booking?: Booking;
  error?: "not_found" | "invalid_transition" | "invalid_deposit" | "validation_error";
  message?: string;
} {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");

  try {
    const current = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as
      Booking | undefined;
    if (!current) {
      db.exec("ROLLBACK");
      return { error: "not_found", message: "Agendamento não encontrado." };
    }

    // Identifica campos que realmente mudaram
    const changedFields: Partial<UpdateBookingDataPatch> = {};
    if (patch.client_name !== undefined && patch.client_name !== current.client_name) {
      changedFields.client_name = patch.client_name;
    }
    if (patch.client_phone !== undefined && patch.client_phone !== current.client_phone) {
      changedFields.client_phone = patch.client_phone;
    }
    if (patch.client_email !== undefined && patch.client_email !== current.client_email) {
      changedFields.client_email = patch.client_email;
    }
    if (patch.location !== undefined && patch.location !== current.location) {
      changedFields.location = patch.location;
    }
    if (patch.session_type !== undefined && patch.session_type !== current.session_type) {
      changedFields.session_type = patch.session_type;
    }
    if (
      patch.price_total_cents !== undefined &&
      patch.price_total_cents !== current.price_total_cents
    ) {
      changedFields.price_total_cents = patch.price_total_cents;
    }
    if (patch.deposit_cents !== undefined && patch.deposit_cents !== current.deposit_cents) {
      changedFields.deposit_cents = patch.deposit_cents;
    }
    if (patch.notes !== undefined && patch.notes !== current.notes) {
      changedFields.notes = patch.notes;
    }

    // Se nenhum campo mudou, retorna o booking atual sem erro (idempotente)
    if (Object.keys(changedFields).length === 0) {
      db.exec("COMMIT");
      return { booking: current };
    }

    // INVARIANTE: 'cancelado' e 'no_show' recusam alteração de contato
    if (current.status === "cancelado" || current.status === "no_show") {
      if (
        changedFields.client_name !== undefined ||
        changedFields.client_phone !== undefined ||
        changedFields.client_email !== undefined
      ) {
        db.exec("ROLLBACK");
        return {
          error: "invalid_transition",
          message:
            "Não é permitido alterar dados de contato de agendamento cancelado ou marcado como falta.",
        };
      }
    }

    // Validação de sinal mesclado
    const nextDeposit =
      changedFields.deposit_cents !== undefined
        ? changedFields.deposit_cents
        : current.deposit_cents;
    const nextPrice =
      changedFields.price_total_cents !== undefined
        ? changedFields.price_total_cents
        : current.price_total_cents;

    if (nextPrice > 0 && nextDeposit > nextPrice) {
      db.exec("ROLLBACK");
      return {
        error: "validation_error",
        message: "O valor do sinal não pode ser superior ao valor total do agendamento.",
      };
    }

    // Se sinal já foi pago/retido/devolvido, não pode alterar o valor de deposit_cents
    if (
      changedFields.deposit_cents !== undefined &&
      (current.deposit_status === "pago" ||
        current.deposit_status === "retido" ||
        current.deposit_status === "devolvido")
    ) {
      db.exec("ROLLBACK");
      return {
        error: "invalid_deposit",
        message:
          "Valor do sinal não pode ser editado quando sinal já está pago, retido ou devolvido. Use a rota /deposit.",
      };
    }

    const now = serializeDate(new Date());

    // Constrói query dinâmica com campos alterados
    const setClauses: string[] = ["updated_at = ?"];
    const params: (string | number | null)[] = [now];

    if (changedFields.client_name !== undefined) {
      setClauses.push("client_name = ?");
      params.push(changedFields.client_name);
    }
    if (changedFields.client_phone !== undefined) {
      setClauses.push("client_phone = ?");
      params.push(changedFields.client_phone);
    }
    if (changedFields.client_email !== undefined) {
      setClauses.push("client_email = ?");
      params.push(changedFields.client_email);
    }
    if (changedFields.location !== undefined) {
      setClauses.push("location = ?");
      params.push(changedFields.location);
    }
    if (changedFields.session_type !== undefined) {
      setClauses.push("session_type = ?");
      params.push(changedFields.session_type);
    }
    if (changedFields.price_total_cents !== undefined) {
      setClauses.push("price_total_cents = ?");
      params.push(changedFields.price_total_cents);
    }
    if (changedFields.deposit_cents !== undefined) {
      setClauses.push("deposit_cents = ?");
      params.push(changedFields.deposit_cents);
    }
    if (changedFields.notes !== undefined) {
      setClauses.push("notes = ?");
      params.push(changedFields.notes);
    }

    params.push(id);

    db.prepare(`UPDATE bookings SET ${setClauses.join(", ")} WHERE id = ?`).run(...params);

    // Se notas foram alteradas, grava evento note_updated em booking_events
    if (changedFields.notes !== undefined) {
      const eventId = generateId("bke");
      db.prepare(
        `
        INSERT INTO booking_events (id, booking_id, event_type, old_value, new_value, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        eventId,
        id,
        "note_updated",
        current.notes || null,
        changedFields.notes || null,
        "Observações do agendamento atualizadas",
        now,
      );
    }

    db.exec("COMMIT");

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as unknown as Booking;
    return { booking: updated };
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // safe
    }
    throw err;
  }
}
