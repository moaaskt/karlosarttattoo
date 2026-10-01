import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

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

let dbInstance: DatabaseSync | null = null;

function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  try {
    // Diretório local para persistência de dados
    const dbDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
        // Fallback para tmp se não tiver permissão no cwd (ambientes serverless)
      }
    }

    const dbPath = fs.existsSync(dbDir)
      ? path.join(dbDir, "leads.db")
      : ":memory:";

    dbInstance = new DatabaseSync(dbPath);

    // Inicializa a tabela leads
    dbInstance.exec(`
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

    // Inserir lead seed demonstrativo caso a tabela esteja totalmente vazia
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
        new Date(Date.now() - 3600000 * 2).toISOString()
      );
      seedStmt.run(
        "lead_seed_02",
        "Lucas Mendonça",
        "48988765432",
        "lucas.mendonca@exemplo.com",
        "Atendimento a Domicílio (Florianópolis / São José / Região)",
        "Tatuagem autoral nas costas, estilo microrrealismo e projeção anatômica.",
        "contatado",
        new Date(Date.now() - 3600000 * 24).toISOString()
      );
      seedStmt.run(
        "lead_seed_03",
        "Camila Duarte",
        "48996541230",
        "camila.duarte@exemplo.com",
        "Estúdio Privado (Palhoça)",
        "Lettering delicado na costela e símbolo minimalista.",
        "agendado",
        new Date(Date.now() - 3600000 * 48).toISOString()
      );
    }

    return dbInstance;
  } catch (error) {
    console.error("[Database] Erro ao inicializar SQLite:", error);
    // Em caso de falha de I/O em lambda, usar in-memory
    dbInstance = new DatabaseSync(":memory:");
    dbInstance.exec(`
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
    `);
    return dbInstance;
  }
}

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
