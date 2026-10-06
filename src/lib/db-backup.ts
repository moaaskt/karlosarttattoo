import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getDatabase } from "./db";

export interface BackupResult {
  success: boolean;
  backupPath: string;
  timestamp: string;
  retainedBackupsCount: number;
}

/**
 * Cria snapshot atômico do banco de dados SQLite utilizando VACUUM INTO.
 * Destino fora do repositório git, protegido com permissões restritas (dir 0700, arquivo 0600).
 * Mantém os 28 backups mais recentes (equivalente a 7 dias com frequência a cada 6h).
 */
export function createDatabaseBackup(customBackupDir?: string): BackupResult {
  const backupDir =
    customBackupDir ||
    process.env.SQLITE_BACKUP_DIR ||
    path.join(os.homedir(), ".backups", "ink-sharp-editorial");

  // Garante que o diretório existe e possui permissão 0700 (apenas proprietário)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  try {
    fs.chmodSync(backupDir, 0o700);
  } catch {
    // ignora em plataformas sem suporte POSIX chmod
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  
  let destPath = path.join(backupDir, `leads_backup_${ts}.db`);
  let counter = 1;
  while (fs.existsSync(destPath)) {
    destPath = path.join(backupDir, `leads_backup_${ts}_${counter++}.db`);
  }

  const db = getDatabase();
  // VACUUM INTO cria um snapshot consistente sem interromper operações de leitura/escrita
  const safePath = destPath.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${safePath}'`);

  // Aplica permissão restrita 0600 no arquivo de backup (apenas proprietário pode ler/escrever)
  try {
    fs.chmodSync(destPath, 0o600);
  } catch {
    // ignora se não suportado
  }

  // Rotação: reter os 28 snapshots mais recentes (4 backups/dia x 7 dias = 28)
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("leads_backup_") && f.endsWith(".db"))
    .sort()
    .reverse();

  const MAX_BACKUPS = 28;
  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      try {
        fs.unlinkSync(path.join(backupDir, file));
      } catch (err) {
        console.error(`[Backup] Erro ao rotacionar backup antigo ${file}:`, err);
      }
    }
  }

  const remainingCount = Math.min(files.length, MAX_BACKUPS);

  return {
    success: true,
    backupPath: destPath,
    timestamp: ts,
    retainedBackupsCount: remainingCount,
  };
}
