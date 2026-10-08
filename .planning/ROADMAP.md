# Roadmap: Karlos Art Tattoo

## Milestones Archived

- **[Milestone v1.0: Karlos Art Tattoo Editorial Engine](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v1.0-ROADMAP.md)** — Shipped 2026-10-01 (Phase 1: MVP Landing Page + Phase 2: Brand Manifesto, Local SEO & Native Lead Engine).

---

## Milestone v2.0: Aceternity Admin Redesign, ApexCharts, Agenda System & Real GA4/GSC Integration (In Progress)

### Phase 03: Aceternity UI Foundation & ApexCharts Migration (Completed)

- [x] Primitivos Aceternity UI adaptados para Tailwind v4 (Bento Grid, Glowing Cards, Shimmer Buttons, Background Beams).
- [x] Instalação e configuração de ApexCharts com tema dark editorial (#070707, #9be5ff, neon accents).
- [x] Redesign completo da interface do `/admin` em layout Bento Grid com gráficos interativos em ApexCharts.

### Phase 04: Agenda & Calendar Booking Engine (Completed)

- [x] Modelagem e migração da tabela `bookings`, `time_blocks`, `availability_rules`, `booking_events` e `settings` no SQLite WAL (`src/lib/db.ts`) com anti-conflito, buffers e auditoria.
- [x] Rotas de API `/api/bookings`, `/api/time-blocks`, `/api/availability-rules` e `/api/settings` com bloqueio 405, transações imediatas e contratos tipados de erro.
- [x] Componente de Calendário Interativo no `/admin` (FullCalendar v6.1.21 com `@fullcalendar/luxon3`, visualização dia/semana/mês, drag & drop, resize e badges de alerta ⚠️).
- [x] BookingDrawer com máquina de estados e histórico, BookingModal com presets e conversão direta de lead em agendamento via `LeadTable`.
- [x] Painel de Configurações (`AgendaSettings.tsx`), Gestão de Bloqueios (`TimeBlocksModal.tsx`), Backup VACUUM INTO com rotação 6h e 81 testes automatizados aprovados.

### Phase 05: Real GA4 Data API & Google Search Console Integration (Completed)

- [x] Rota de API servidora `/api/analytics` com suporte a Service Account do Google Cloud via `google-auth-library`.
- [x] Integração com GA4 Data API v1beta para buscar sessões reais, usuários ativos, páginas e cidades de Santa Catarina.
- [x] Integração com Google Search Console v3 API para palavras-chave ("karlitos tattoo", "tatuador palhoça", etc.), cliques, impressões, CTR e ranking médio.
- [x] Nova aba dedicada "Tráfego & SEO" (`AnalyticsTab.tsx`) na Sidebar do `/admin` com Glowing Cards, ApexCharts e fallback ultra-realista em modo de demonstração.
- [x] Cache em memória com TTL de 30 minutos, proteção contra concorrência (thundering herd) e suíte com 91 testes passando.

---

## Future Milestone (v2.1 / Expansion)

### Phase 06: Content Expansion & Authority

- [ ] Seção de Perguntas Frequentes (FAQ) interativa com Schema `FAQPage`.
- [ ] Guia e seção de Cuidados Pós-Tatuagem ("Aftercare Guide").
- [ ] Módulo dinâmico de artigos e publicações editoriais para fortalecimento de SEO orgânico.
