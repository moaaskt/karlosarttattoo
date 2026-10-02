# Roadmap: Karlos Art Tattoo

## Milestones Archived
- **[Milestone v1.0: Karlos Art Tattoo Editorial Engine](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v1.0-ROADMAP.md)** — Shipped 2026-10-01 (Phase 1: MVP Landing Page + Phase 2: Brand Manifesto, Local SEO & Native Lead Engine).

---

## Milestone v2.0: Aceternity Admin Redesign, ApexCharts, Agenda System & Real GA4/GSC Integration (In Progress)

### Phase 03: Aceternity UI Foundation & ApexCharts Migration (Completed)
- [x] Primitivos Aceternity UI adaptados para Tailwind v4 (Bento Grid, Glowing Cards, Shimmer Buttons, Background Beams).
- [x] Instalação e configuração de ApexCharts com tema dark editorial (#070707, #9be5ff, neon accents).
- [x] Redesign completo da interface do `/admin` em layout Bento Grid com gráficos interativos em ApexCharts.

### Phase 04: Agenda & Calendar Booking Engine (Planned)
- [ ] Modelagem e migração da tabela `bookings` no SQLite (`src/lib/db.ts`) com status, slots de horários e vinculação de leads.
- [ ] Rotas de API `/api/bookings` (GET, POST, PATCH, DELETE) para controle de agendamentos e bloqueio de horários.
- [ ] Componente de Calendário Interativo no `/admin` (visualização semanal/mensal, filtro por local/ateliê).
- [ ] Fluxo de conversão direta de lead em agendamento com confirmação e notificação.

### Phase 05: Real GA4 Data API & Google Search Console Integration (Planned)
- [ ] Rota de API servidora `/api/analytics` com suporte a Service Account do Google Cloud.
- [ ] Integração com GA4 Data API v1 para buscar sessões reais, usuários ativos e cidades de Santa Catarina.
- [ ] Integração com Search Console API para palavras-chave ("karlitostattoo", "tatuador em palhoça", etc.), cliques e impressões.
- [ ] Cards dedicados de SEO orgânico e tráfego real no dashboard com fallback de desenvolvimento.

---

## Future Milestone (v2.1 / Expansion)

### Phase 06: Content Expansion & Authority
- [ ] Seção de Perguntas Frequentes (FAQ) interativa com Schema `FAQPage`.
- [ ] Guia e seção de Cuidados Pós-Tatuagem ("Aftercare Guide").
- [ ] Módulo dinâmico de artigos e publicações editoriais para fortalecimento de SEO orgânico.
