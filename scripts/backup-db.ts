#!/usr/bin/env tsx
import { createDatabaseBackup } from "../src/lib/db-backup";

try {
  console.log("[Backup] Iniciando snapshot atômico do banco de dados...");
  const result = createDatabaseBackup();
  console.log(`[Backup] Snapshot concluído com sucesso: ${result.backupPath}`);
  console.log(`[Backup] Backups retidos no diretório: ${result.retainedBackupsCount}`);
  process.exit(0);
} catch (err) {
  console.error("[Backup] Falha crítica ao gerar backup:", err);
  process.exit(1);
}
