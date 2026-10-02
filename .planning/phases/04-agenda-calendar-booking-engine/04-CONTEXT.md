# Phase 4: Agenda & Calendar Booking Engine - Context

**Gathered:** 2026-10-01  
**Status:** In Discussion / Ready for Planning  

<domain>
## Phase Boundary

Implementar o sistema de agenda e calendário profissional completo para uso exclusivo de Karlos Art Tattoo (single-user), com persistência relacional no SQLite, validação rígida de anti-conflito no backend, máquina de estados com controle de sinal, suporte a durações variáveis com buffer, bloqueios manuais de datas (folgas, viagens/guests) e interface híbrida (mês, semana time-grid e dia) com drawer de detalhes e conversão direta de leads em agendamentos.

</domain>

<decisions>
## Implementation Decisions

### 1. Modelo de Dados Relacional (SQLite em `src/lib/db.ts`)
- **D-01 (Tabela `bookings`):**
  - `id`: TEXT PRIMARY KEY (`booking_${timestamp}_${rand}`)
  - `lead_id`: TEXT NULL (Foreign Key conceitual para `leads.id`)
  - `client_name`: TEXT NOT NULL
  - `client_phone`: TEXT NOT NULL
  - `client_email`: TEXT
  - `service_type`: TEXT NOT NULL ('Estúdio Palhoça', 'VIP Domicílio', 'Flash / Outro')
  - `start_at`: TEXT NOT NULL (ISO 8601 em UTC)
  - `end_at`: TEXT NOT NULL (ISO 8601 em UTC)
  - `status`: TEXT NOT NULL DEFAULT 'pendente' ('pendente' | 'sinal_pago' | 'confirmado' | 'concluido' | 'cancelado' | 'no_show')
  - `deposit_amount`: REAL DEFAULT 0
  - `deposit_status`: TEXT NOT NULL DEFAULT 'pendente' ('pendente' | 'pago' | 'dispensado')
  - `price_total`: REAL DEFAULT 0
  - `notes`: TEXT
  - `created_at`: TEXT NOT NULL
  - `updated_at`: TEXT NOT NULL

- **D-02 (Tabela `time_blocks` - Bloqueios de Tempo / Folgas):**
  - `id`: TEXT PRIMARY KEY
  - `start_at`: TEXT NOT NULL (ISO 8601 em UTC)
  - `end_at`: TEXT NOT NULL (ISO 8601 em UTC)
  - `all_day`: INTEGER NOT NULL DEFAULT 0 (permite múltiplos dias, ex: viagem de 5 dias)
  - `reason_tag`: TEXT NOT NULL ('Viagem/Guest' | 'Folga/Criação' | 'Evento' | 'Pessoal' | 'Outro')
  - `note`: TEXT
  - `created_at`: TEXT NOT NULL

- **D-03 (Tabela `availability_rules` - Regras Semanais e Buffers):**
  - `id`: TEXT PRIMARY KEY
  - `day_of_week`: INTEGER NOT NULL (0 = Domingo a 6 = Sábado)
  - `is_working_day`: INTEGER NOT NULL DEFAULT 1
  - `work_start_time`: TEXT NOT NULL DEFAULT '09:00' (horário local HH:mm)
  - `work_end_time`: TEXT NOT NULL DEFAULT '20:00' (horário local HH:mm)
  - `buffer_minutes`: INTEGER NOT NULL DEFAULT 30 (tempo entre sessões para biossegurança)

- **D-04 (Configurações de Presets e Durações):**
  - Presets de horário de início rápido da UI (Padrão: Manhã 09:00, Tarde 14:00, Noite 18:30, Personalizado).
  - Sugestões de duração por tamanho (Pequena 2h, Média 4h, Grande 6h+), sempre com horário livre real no modelo de dados.

### 2. Regras de Negócio e Validações no Backend
- **D-05 (Anti-conflito Rígido):**
  - Todo novo agendamento ou remarcação é validado no backend dentro de transação:
    `novo.start_at < existente.end_at AND novo.end_at > existente.start_at`
  - Rejeita caso colida com bookings ativos (`pendente`, `sinal_pago`, `confirmado`) ou com `time_blocks`.
  - Buffer de 30 min (ou configurado) respeitado entre agendamentos.
- **D-06 (Máquina de Estados & Sinal):**
  - Transições estritas com validação no backend:
    - `pendente` -> `sinal_pago` -> `confirmado` -> `concluido`
    - Cancelamento ou `no_show` liberam imediatamente os slots.
- **D-07 (Proteção de Bloqueios sobre Agendamentos Existentes):**
  - Ao criar um bloqueio (`time_block`) que sobreponha agendamentos existentes, o backend retorna a lista de conflitos e exige confirmação explícita (`force: true`), sem jamais cancelar silenciosamente.

### 3. Interface Visual do Calendário no Painel `/admin`
- **D-08 (Navegação & Layout Híbrido):**
  - Nova aba no `/admin`: **"AGENDA DO ATELIÊ"**.
  - Layout padrão híbrido: Mês compacto (com indicador de densidade/ocupação por dia) + Grade do dia selecionado ao lado.
  - Alternância rápida para 3 visões: Mês, Semana (Time Grid) e Dia (Lista de slots).
- **D-09 (Drawer Lateral de Detalhes):**
  - Clicar em agendamento abre gaveta lateral (Drawer) com dados do cliente, botão direto para WhatsApp, controle de sinal pago/pendente, valor e transição de status.
- **D-10 (Criação Rápida & Conversão de Leads):**
  - Clicar em horário vazio abre modal de criação com atalhos de turnos e duração sugerida.
  - Na aba "Gestão de Leads", botão "Agendar Sessão" preenche automaticamente o modal com os dados do cliente e vincula o `lead_id`.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — Requisitos R-05, R-06, R-07, R-08.
- `.planning/ROADMAP.md` — Escopo da Fase 04 do Milestone v2.0.
- `src/lib/db.ts` — Banco SQLite relacional nativo com migrações automáticas.
- `src/routes/admin.tsx` — Painel administrativo onde a aba "AGENDA DO ATELIÊ" será montada.
- `src/components/admin/lead-table.tsx` — Tabela de leads de onde partirá o fluxo de conversão.

</canonical_refs>
