import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { getDatabase, closeDatabase, createBooking, createLead } from "../lib/db";
import { createDatabaseBackup } from "../lib/db-backup";

describe("Backup SQLite — VACUUM INTO, Integridade e Restauração (TASK-13a)", () => {
  let tempDir: string;

  beforeEach(() => {
    // Configura diretório temporário para os snapshots de teste
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ink-sharp-backup-test-"));
    // Usa banco em arquivo temporário para permitir que VACUUM INTO funcione perfeitamente
    process.env.DB_PATH = path.join(tempDir, "source_leads.db");
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("cria snapshot atômico com VACUUM INTO e passa no PRAGMA integrity_check", () => {
    // Popula dados no banco ativo
    const db = getDatabase();
    createLead({
      name: "Cliente Teste Backup",
      phone: "48999990000",
      email: "cliente@teste.com",
      service: "tatuagem",
      message: "Lead para validar backup",
    });

    createBooking(
      {
        client_name: "Cliente Teste Backup",
        client_phone: "48999990000",
        location: "estudio",
        session_type: "tatuagem",
        start_at: "2026-10-15T13:00:00.000Z",
        end_at: "2026-10-15T15:00:00.000Z",
      },
      true,
    );

    // Contagens originais do banco ativo
    const origLeadsCount = (db.prepare("SELECT COUNT(*) as c FROM leads").get() as any).c;
    const origBookingsCount = (db.prepare("SELECT COUNT(*) as c FROM bookings").get() as any).c;
    const origSettingsCount = (db.prepare("SELECT COUNT(*) as c FROM settings").get() as any).c;

    // Executa o backup no diretório temporário
    const backupResult = createDatabaseBackup(tempDir);
    assert.ok(backupResult.success, "Backup deve ter sucesso");
    assert.ok(fs.existsSync(backupResult.backupPath), "Arquivo de backup deve existir fisicamente");

    // Valida permissão POSIX (em sistemas unix deve ser 0600)
    if (process.platform !== "win32") {
      const stats = fs.statSync(backupResult.backupPath);
      // 0o600 = 384 em decimal
      assert.equal(stats.mode & 0o777, 0o600, "Permissão do arquivo deve ser estritamente 0600");
    }

    // Abre o banco de backup de forma independente para verificar integridade e restaurabilidade
    const backupDb = new DatabaseSync(backupResult.backupPath);
    try {
      const integrity = backupDb.prepare("PRAGMA integrity_check;").all() as Array<{
        integrity_check: string;
      }>;
      assert.equal(integrity.length, 1, "Deve retornar exatamente um resultado de integridade");
      assert.equal(integrity[0].integrity_check, "ok", "PRAGMA integrity_check deve retornar 'ok'");

      // Valida contagem idêntica de dados
      const bLeadsCount = (backupDb.prepare("SELECT COUNT(*) as c FROM leads").get() as any).c;
      const bBookingsCount = (backupDb.prepare("SELECT COUNT(*) as c FROM bookings").get() as any)
        .c;
      const bSettingsCount = (backupDb.prepare("SELECT COUNT(*) as c FROM settings").get() as any)
        .c;

      assert.equal(bLeadsCount, origLeadsCount, "Contagem de leads no backup deve ser idêntica");
      assert.equal(
        bBookingsCount,
        origBookingsCount,
        "Contagem de bookings no backup deve ser idêntica",
      );
      assert.equal(
        bSettingsCount,
        origSettingsCount,
        "Contagem de settings no backup deve ser idêntica",
      );
    } finally {
      backupDb.close();
    }
  });

  test("rotação mantém no máximo 28 backups e remove excedentes", () => {
    // Cria 30 arquivos simulados no diretório
    for (let i = 1; i <= 30; i++) {
      const fakeTs = `2026-10-01_${String(i).padStart(6, "0")}`;
      fs.writeFileSync(path.join(tempDir, `leads_backup_${fakeTs}.db`), "fake db content");
    }

    const filesBefore = fs
      .readdirSync(tempDir)
      .filter((f) => f.startsWith("leads_backup_") && f.endsWith(".db"));
    assert.equal(filesBefore.length, 30);

    // Dispara backup real
    const result = createDatabaseBackup(tempDir);
    assert.ok(result.success);

    const filesAfter = fs
      .readdirSync(tempDir)
      .filter((f) => f.startsWith("leads_backup_") && f.endsWith(".db"));
    assert.equal(filesAfter.length, 28, "Rotação deve reter exatamente 28 backups");
  });
});
