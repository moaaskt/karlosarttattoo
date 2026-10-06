# Phase 4 Discussion Log: Agenda & Calendar Booking Engine

**Date:** 2026-10-01  
**Participants:** Developer & Assistant

---

## Key Context & Specifications Defined

1. **Contexto:**
   - Single-user (exclusivo para o Karlos). Foco em robustez, confiabilidade e prevenção de erros operacionais.
   - Armazenamento temporal estrito em **UTC ISO 8601** (`start_at`, `end_at`), com conversão para timezone local no frontend.

2. **Schema Relacional SQLite:**
   - Tabela `bookings` com campos de cliente, datas de início/fim livres, máquina de estados com controle de sinal (`deposit_amount`, `deposit_status`), valor total e notas.
   - Tabela `time_blocks` para bloqueios manuais com tags (`Viagem/Guest`, `Folga/Criação`, `Evento`, `Pessoal`, `Outro`) e suporte a múltiplos dias (`all_day`).
   - Tabela `availability_rules` para horários semanais de expediente e buffer de biossegurança entre sessões.

3. **Validação Anti-Conflito no Backend:**
   - Validação transacional no SQLite: `novo.start_at < existente.end_at AND novo.end_at > existente.start_at`.
   - Consideração do buffer entre atendimentos.
   - Proteção ao criar bloqueios: detecção e aviso obrigatório caso sobreponha agendamentos existentes.

4. **Interface e Usabilidade:**
   - 3 visões (Mês compacto com densidade, Semana time grid e Dia em slots) com layout híbrido padrão (Mês + Dia ao lado).
   - Drawer lateral para visualização de detalhes, alteração de status e WhatsApp direto.
   - Presets configuráveis de turnos (Manhã 09h, Tarde 14h, Noite 18h30) como atalhos de preenchimento na interface.
