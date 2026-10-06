# Phase 4: Agenda & Calendar Booking Engine - Context

**Gathered:** 2026-10-01 (revisado 2026-10-02)
**Status:** Aprovado / Pronto para Planejamento

<domain>
## Phase Boundary

Implementar o sistema de agenda e calendário profissional completo para uso exclusivo de Karlos Art Tattoo (single-user), com persistência relacional no SQLite (WAL + busy_timeout + FKs reais), validação rígida de anti-conflito com fórmula de buffer explícita (transação `BEGIN IMMEDIATE`), máquina de estados com controle de sinal (`deposit_status`), regras de sinal para estados pós-cancelamento, bloqueios manuais de datas (folgas, viagens/guests), histórico de eventos por agendamento (`booking_events`), interface híbrida via **FullCalendar** (Mês + Grade Diária + Semana), drag & drop nativo para remarcação e tela de configurações globais da agenda.

**Fora de escopo da Fase 04:** lembretes e notificações push/email (backlog para fase futura).

</domain>

<decisions>
## Implementation Decisions

---

### 1. Modelo de Dados Relacional (SQLite em `src/lib/db.ts`)

#### D-01 — Tabela `bookings`

```sql
CREATE TABLE bookings (
  id              TEXT    PRIMARY KEY,               -- "booking_${timestamp}_${rand}"
  lead_id         TEXT    NULL REFERENCES leads(id), -- FK real, PRAGMA foreign_keys=ON
  client_name     TEXT    NOT NULL,
  client_phone    TEXT    NOT NULL,
  client_email    TEXT,

  -- Tipo e localidade (separados)
  location        TEXT    NOT NULL
    CHECK(location IN ('estudio', 'domicilio', 'evento')),
  session_type    TEXT    NOT NULL
    CHECK(session_type IN ('tatuagem', 'flash', 'retoque', 'projeto', 'outro')),

  -- Horários (UTC ISO 8601 com ms e Z, ex: "2026-10-15T13:00:00.000Z")
  start_at        TEXT    NOT NULL,
  end_at          TEXT    NOT NULL,
  CHECK(end_at > start_at),

  -- Status do agendamento (sem 'sinal_pago')
  status          TEXT    NOT NULL DEFAULT 'pendente'
    CHECK(status IN ('pendente', 'confirmado', 'concluido', 'cancelado', 'no_show')),

  -- Sinal (depósito) — valores em centavos (INTEGER)
  deposit_cents   INTEGER NOT NULL DEFAULT 0,
  deposit_status  TEXT    NOT NULL DEFAULT 'pendente'
    CHECK(deposit_status IN ('pendente', 'pago', 'dispensado', 'retido', 'devolvido')),

  -- Valor total em centavos (INTEGER)
  price_total_cents INTEGER NOT NULL DEFAULT 0,

  -- Projeto multi-sessão
  project_id      TEXT    NULL,
  session_number  INTEGER NULL,

  notes           TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
```

> **Datas:** toda data é armazenada como `date.toISOString()` — sempre UTC, com milissegundos e sufixo `Z` (ex: `"2026-10-15T13:00:00.000Z"`). A API valida o formato com regex antes de qualquer operação; a comparação no SQLite é textual e funciona corretamente com este padrão.

> **Deleção física proibida:** bookings jamais são deletados. Cancelar é o único encerramento possível. Isso preserva o histórico e o `booking_events` completo.

---

#### D-02 — Tabela `time_blocks` (Bloqueios de Tempo / Folgas)

```sql
CREATE TABLE time_blocks (
  id          TEXT    PRIMARY KEY,
  start_at    TEXT    NOT NULL,                      -- UTC ISO 8601 com ms e Z
  end_at      TEXT    NOT NULL,                      -- UTC ISO 8601 com ms e Z
  all_day     INTEGER NOT NULL DEFAULT 0
    CHECK(all_day IN (0, 1)),
  reason_tag  TEXT    NOT NULL
    CHECK(reason_tag IN ('viagem_guest', 'folga_criacao', 'evento', 'pessoal', 'outro')),
  note        TEXT,
  created_at  TEXT    NOT NULL,
  CHECK(end_at > start_at)
);
```

> **all_day = 1 (intervalo semiaberto):** o backend converte para UTC usando o timezone de `settings`. Para cada dia abrangido: `start_at` = meia-noite local do 1º dia → UTC; `end_at` = meia-noite local do dia **seguinte ao último** → UTC. Ex: bloquear 15/10 em `America/Sao_Paulo` = `start_at: "2026-10-15T03:00:00.000Z"`, `end_at: "2026-10-16T03:00:00.000Z"`. Jamais usa `23:59:59`.

---

#### D-03 — Tabela `availability_rules` (Múltiplas Janelas por Dia)

Permite múltiplas janelas por dia (horário quebrado com pausa para almoço).

```sql
CREATE TABLE availability_rules (
  id           TEXT    PRIMARY KEY,
  day_of_week  INTEGER NOT NULL
    CHECK(day_of_week BETWEEN 0 AND 6),
  window_start TEXT    NOT NULL,                     -- 'HH:mm' (horário local)
  window_end   TEXT    NOT NULL,                     -- 'HH:mm' (horário local)
  is_active    INTEGER NOT NULL DEFAULT 1
    CHECK(is_active IN (0, 1)),
  CHECK(window_end > window_start)
);
```

> **Exemplo:** Segunda com pausa = 2 rows (`day_of_week = 1`): `09:00–12:30` e `14:00–20:00`.

---

#### D-04 — Tabela `settings` (Configurações Globais)

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Valores padrão ao migrar
INSERT OR IGNORE INTO settings VALUES
  ('timezone',       'America/Sao_Paulo'),
  ('buffer_minutes', '30'),
  ('preset_manha',   '09:00'),
  ('preset_tarde',   '14:00'),
  ('preset_noite',   '18:30');
```

---

#### D-05 — Tabela `booking_events` (Histórico de Auditoria)

```sql
CREATE TABLE booking_events (
  id          TEXT    PRIMARY KEY,
  booking_id  TEXT    NOT NULL REFERENCES bookings(id),  -- FK real
  event_type  TEXT    NOT NULL
    CHECK(event_type IN (
      'created', 'confirmed', 'rescheduled',
      'cancelled', 'no_show', 'completed',
      'deposit_paid', 'deposit_waived',
      'deposit_retained', 'deposit_refunded',
      'note_updated'
    )),
  old_value   TEXT,                                  -- JSON do estado anterior
  new_value   TEXT,                                  -- JSON do novo estado
  note        TEXT,
  created_at  TEXT    NOT NULL
);
```

> Toda mutação de `bookings` grava uma linha em `booking_events` **na mesma transação**.

---

### 2. Configuração do SQLite

#### D-06 — Pragmas obrigatórios (executar ao abrir a conexão)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;   -- 5 s de retry antes de lançar SQLITE_BUSY
```

- **Backup periódico:** cópia do arquivo `.db` via `cp` ou `sqlite3 .backup` agendado (cron do sistema ou tarefa Node.js), para diretório de backup fora do projeto.

---

### 3. Regras de Negócio e Validações no Backend

#### D-07 — Serialização de Datas (função única)

```ts
/** Serializa qualquer Date para UTC ISO com ms e Z. */
function serializeDate(d: Date): string {
  return d.toISOString(); // ex: "2026-10-15T13:00:00.000Z"
}

/** Regex de validação aceita pela API antes de qualquer operação. */
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
```

Toda entrada de `start_at` / `end_at` pela API é validada contra `ISO_UTC_RE` antes de qualquer lógica.

---

#### D-08 — Fórmula de Anti-conflito com Buffer Explícito

Buffer se aplica **apenas entre bookings**, nunca a `time_blocks`.

**Cálculo em JS (antes da query):** como datas são strings ISO e a comparação no SQLite é textual, o buffer é somado em JavaScript usando `Date` aritmética, e os valores já expandidos são passados como parâmetros para a query.

```ts
// Backend: calcular janela expandida com buffer antes de entrar na transação
const bufMs = bufferMinutes * 60 * 1000;
const windowStart = serializeDate(new Date(new Date(new_start_at).getTime() - bufMs));
const windowEnd = serializeDate(new Date(new Date(new_end_at).getTime() + bufMs));
// windowStart e windowEnd são passados como :window_start e :window_end na query
```

**Fórmula lógica (simétrica):**

```
-- Conflito com booking A existente (usando janela expandida):
:window_start < A.end_at AND A.start_at < :window_end

-- Conflito com time_block (sem buffer, valores originais):
:new_start_at < tb.end_at AND tb.start_at < :new_end_at
```

---

#### D-09 — Anti-conflito em `BEGIN IMMEDIATE`

```ts
// Pré-query (JS): calcular parâmetros
const bufMs = bufferMinutes * 60 * 1000;
const windowStart = serializeDate(new Date(+new Date(new_start_at) - bufMs)); // new_start - buffer
const windowEnd = serializeDate(new Date(+new Date(new_end_at) + bufMs)); // new_end   + buffer
```

```sql
-- Executado dentro de BEGIN IMMEDIATE:

-- 1. Verificar expediente (availability_rules) — aviso, não 409
--    → fora do expediente: retorna { warning: 'outside_hours' }
--    → frontend exige confirmação (force: true) para prosseguir

-- 2. Verificar time_blocks (bloqueio duro — sem force, sem buffer)
SELECT id, reason_tag, start_at, end_at FROM time_blocks
WHERE :new_start_at < end_at AND start_at < :new_end_at;
--    → se encontrar: ROLLBACK + HTTP 409 { error: 'time_block_conflict', conflicts: [...] }

-- 3. Verificar bookings com buffer expandido (excluindo próprio id na remarcação)
SELECT id, client_name, start_at, end_at FROM bookings
WHERE id != :self_id                         -- '' em nova criação
  AND status NOT IN ('cancelado', 'no_show')
  AND :window_start < end_at
  AND start_at      < :window_end;
--    → se encontrar: ROLLBACK + HTTP 409 { error: 'booking_conflict', conflicts: [...] }

-- 4. Sem conflitos → INSERT/UPDATE em bookings + INSERT em booking_events
```

---

#### D-10 — Máquina de Estados Rígida

```
pendente → confirmado  (exige deposit_status IN ('pago','dispensado'))
         → cancelado   (se deposit_status = 'pago': exige escolher 'retido' ou 'devolvido')

confirmado → concluido (pode ser marcado antes do horário de término; é ação manual do tatuador)
           → no_show   (se deposit_status = 'pago': exige escolher 'retido' ou 'devolvido')
           → cancelado  (mesma regra de depósito)
```

- `cancelado` e `no_show` liberam o slot e ficam no histórico (sem deleção física).
- `retido` e `devolvido` são estados válidos **apenas** após `cancelado` ou `no_show`.
- `concluido` pode ser marcado manualmente antes do `end_at` — é ação intencional do tatuador, sem bloqueio automático por horário.
- Cada transição grava em `booking_events`.

---

#### D-11 — Remarcação é Ação, Não Status

- Endpoint dedicado: `PATCH /api/bookings/:id/reschedule`.
- Atualiza `start_at`, `end_at` e `updated_at` **mantendo o `status` atual** (ex: `confirmado` continua `confirmado`).
- Grava `booking_events` com `event_type = 'rescheduled'`, `old_value = { start_at, end_at }`, `new_value = { start_at, end_at }`.
- Passa pelo mesmo anti-conflito `BEGIN IMMEDIATE` (com `:self_id` preenchido).

---

#### D-12 — Todos os Endpoints Protegidos pela Autenticação do `/admin`

- Todas as rotas `/api/bookings/*`, `/api/time-blocks/*`, `/api/settings/*` e `/api/availability-rules/*` exigem sessão autenticada (middleware existente do painel `/admin`).

---

#### D-13 — Bloqueio sobre Agendamentos Existentes

- Ao criar `time_block` que sobreponha bookings **ativos**, retorna HTTP 409 com `{ conflicts: [...] }`.
- Frontend exibe a lista e exige confirmação com flag `force: true`.
- Nunca cancela agendamentos silenciosamente.

---

### 4. Interface Visual do Calendário

#### D-14 — Biblioteca de Calendário: FullCalendar ✅

**Análise de opções:**

| Critério                              | FullCalendar (`@fullcalendar/react`)     | Custom com `@dnd-kit`           |
| ------------------------------------- | ---------------------------------------- | ------------------------------- |
| Views prontas (Mês, Semana, Dia)      | ✅ Daygrid + Timegrid inclusos           | ❌ Tudo do zero                 |
| Drag & Drop nativo                    | ✅ Plugin `@fullcalendar/interaction`    | ✅ mas requer integração manual |
| Touch / mobile                        | ✅ Suportado nativamente                 | ⚠️ Necessita config adicional   |
| Eventos sobrepostos                   | ✅ Renderiza automaticamente             | ❌ Lógica de layout manual      |
| Integração com React (TanStack Start) | ✅ Adapter oficial `@fullcalendar/react` | ✅ agnóstico                    |
| Licença                               | MIT                                      | MIT                             |
| Esforço estimado                      | ~1 semana (config + estilo)              | ~3–4 semanas                    |
| Customização visual (Tailwind v4)     | ⚠️ Requer override de CSS vars           | ✅ total                        |

**Decisão: FullCalendar.** O custo de implementar time-grid com sobreposição de eventos e touch support do zero equivale a 3–4x o esforço do FullCalendar. O override visual com CSS custom properties do FullCalendar é viável e bem documentado. Usaremos:

- `@fullcalendar/react`
- `@fullcalendar/daygrid`
- `@fullcalendar/timegrid`
- `@fullcalendar/interaction` (drag & drop + click em slot vazio)

---

#### D-15 — Aba "Agenda" no `/admin`

- Nova aba: **"AGENDA DO ATELIÊ"** no painel administrativo.
- Layout padrão: **Mês compacto** + **Grade do dia selecionado** ao lado.
- Alternância rápida: Mês | Semana (Time Grid) | Dia.

---

#### D-16 — Drag & Drop para Remarcação

- Arrastar evento no FullCalendar dispara `eventDrop` callback → chama `PATCH /api/bookings/:id/reschedule`.
- Se o backend rejeitar (409), cancela o drop via `revert()` e exibe toast de erro.
- Se houver aviso de fora do expediente, exibe modal de confirmação antes de efetivar.

---

#### D-17 — Drawer Lateral de Detalhes

- Dados do cliente + botão WhatsApp direto.
- Controle de `deposit_status` (radio: pendente / pago / dispensado / retido / devolvido).
- Valor total editável (centavos → R$ na UI, armazenado como INTEGER centavos).
- Botões de transição de status com diálogo de confirmação.
- Histórico de `booking_events` em linha do tempo.

---

#### D-18 — Criação Rápida & Conversão de Leads

- Clicar em horário vazio (FullCalendar `dateClick` / `select`) abre modal com:
  - Presets de turno (Manhã, Tarde, Noite, Personalizado) — apenas atalhos de UI, não entidade de negócio.
  - Sugestões de duração (Pequena 2h, Média 4h, Grande 6h+).
- Na aba "Leads", botão "Agendar Sessão" pré-preenche o modal com dados do lead e vincula `lead_id`.

---

#### D-19 — Tela de Configurações da Agenda

- Acessível via botão ⚙ na aba "Agenda".
- Permite editar: `timezone`, `buffer_minutes`, presets de horário (Manhã, Tarde, Noite), janelas de disponibilidade por dia da semana (adicionar/remover janelas).

---

### 5. Fora de Escopo — Fase 04

- **Lembretes e notificações** (push, email, WhatsApp automático): backlog para fase futura.
- **Multi-profissional / multi-ateliê**: sistema é single-user por design.

</decisions>

<canonical_refs>

## Canonical References

- `.planning/REQUIREMENTS.md` — Requisitos R-05, R-06, R-07, R-08.
- `.planning/ROADMAP.md` — Escopo da Fase 04 do Milestone v2.0.
- `src/lib/db.ts` — Banco SQLite relacional nativo com migrações automáticas.
- `src/routes/admin.tsx` — Painel administrativo onde a aba "AGENDA DO ATELIÊ" será montada.
- `src/components/admin/lead-table.tsx` — Tabela de leads de onde partirá o fluxo de conversão.

</canonical_refs>
