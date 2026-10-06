# Política de Backups, Resiliência e Restauração SQLite

Este documento estabelece o protocolo de snapshot atômico, retenção, sincronização off-site e restauração para o banco de dados SQLite (`leads.db`) do **Karlos Art Tattoo / Ink Sharp**.

---

## 1. Frequência e RPO Real

- **Frequência de Execução**: A cada 6 horas (`00:00`, `06:00`, `12:00`, `18:00` UTC) via cron ou systemd timer.
  - Como o banco de dados é compacto (alguns megabytes) e opera em modo WAL, o comando nativo `VACUUM INTO` cria um snapshot consistente e desfragmentado sem travar operações concorrentes de leitura e escrita.
- **RPO (Recovery Point Objective)**: **6 horas**.
  - O RPO é estritamente delimitado pelo intervalo entre snapshots íntegros.
  - *Nota de Engenharia*: Arquivos residuais `-wal` e `-shm` dependem do arquivo principal da base e não constituem mecanismo autônomo de recuperação em caso de falha de disco.

---

## 2. Mecanismo de Backup Local (`src/lib/db-backup.ts`)

O script de backup executa:
1. `VACUUM INTO '<destination>'` para criar um arquivo snapshot independente e íntegro.
2. Nomeação com timestamp padronizado: `leads_backup_YYYY-MM-DD_HHmmss.db`.
3. Diretório de destino: `$SQLITE_BACKUP_DIR` ou fallback `~/.backups/ink-sharp-editorial/` (obrigatoriamente fora do repositório git).
4. Permissões POSIX restritas:
   - Diretório: `0700` (`rwx------`).
   - Arquivos `.db`: `0600` (`rw-------`).
5. **Política de Retenção Local**: Mantém os **28 backups mais recentes** (equivalente a 7 dias completos com 4 backups diários), purgando automaticamente snapshots excedentes.

### Execução Manual ou Via Script
```bash
npm run backup
# ou
npx tsx scripts/backup-db.ts
```

---

## 3. Sincronização Off-Site (Object Storage / Cloud)

Para proteção contra falhas de infraestrutura no servidor, os backups locais devem ser replicados para um bucket seguro (S3, Cloudflare R2 ou Google Cloud Storage) utilizando `rclone`:

```bash
# Sincronização via rclone
rclone copy ~/.backups/ink-sharp-editorial/ remote:ink-sharp-backups/sqlite/
```

### Segurança das Credenciais
O arquivo de configuração do rclone (`~/.config/rclone/rclone.conf`) deve ter permissões mínimas e restritas:
```bash
chmod 600 ~/.config/rclone/rclone.conf
```

---

## 4. Agendamento no Sistema Operacional (Crontab ou Systemd Timer)

Adicione a seguinte entrada no crontab do usuário da aplicação (`crontab -e`):

```cron
# Backup a cada 6 horas (00:00, 06:00, 12:00, 18:00)
0 */6 * * * cd /caminho/do/projeto && npm run backup >> /var/log/ink-sharp-backup.log 2>&1
```

---

## 5. Procedimento Passo a Passo de Restauração

Em caso de corrupção, perda de integridade ou incidente:

1. **Obtenha o snapshot desejado**:
   Se necessário, faça o download do backup a partir do bucket remoto:
   ```bash
   rclone copy remote:ink-sharp-backups/sqlite/leads_backup_2026-10-15_120000.db /tmp/
   ```

2. **Verifique a integridade do arquivo antes de restaurar**:
   ```bash
   node -e 'const { DatabaseSync } = require("node:sqlite"); const db = new DatabaseSync("/tmp/leads_backup_2026-10-15_120000.db"); console.log(db.prepare("PRAGMA integrity_check;").all());'
   # Saída esperada: [ { integrity_check: 'ok' } ]
   ```

3. **Interrompa a aplicação**:
   ```bash
   systemctl stop ink-sharp
   ```

4. **Remova resquícios de WAL antigos e isole a base anterior**:
   ```bash
   mv /caminho/do/projeto/data/leads.db /caminho/do/projeto/data/leads.db.corrupted_$(date +%s)
   rm -f /caminho/do/projeto/data/leads.db-wal
   rm -f /caminho/do/projeto/data/leads.db-shm
   ```

5. **Copie o snapshot para a localização ativa e aplique permissões**:
   ```bash
   cp /tmp/leads_backup_2026-10-15_120000.db /caminho/do/projeto/data/leads.db
   chmod 600 /caminho/do/projeto/data/leads.db
   ```

6. **Inicie o serviço e verifique os logs**:
   ```bash
   systemctl start ink-sharp
   systemctl status ink-sharp
   ```

---

## 6. Requisitos de Ambiente (Node.js)

- **Versão Mínima**: `Node.js >= 22.13.0` (configurado em `package.json` em `engines`).
- O módulo nativo `node:sqlite` dispensa flags CLI no Node 22.13.0+.
- *Aviso*: O módulo emite `ExperimentalWarning` em tempo de execução, indicando que a API segue em evolução upstream pelo Node.js.
