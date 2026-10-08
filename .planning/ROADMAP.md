# Roadmap: Karlos Art Tattoo

## Milestones Archived

- **[Milestone v1.0: Karlos Art Tattoo Editorial Engine](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v1.0-ROADMAP.md)** — Shipped 2026-10-01 (Phase 1: MVP Landing Page + Phase 2: Brand Manifesto, Local SEO & Native Lead Engine).
- **[Milestone v2.0: Aceternity Admin Redesign, ApexCharts, Agenda System & Real GA4/GSC Integration](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v2.0-ROADMAP.md)** — Shipped 2026-10-08 (Phase 03: Aceternity UI & ApexCharts + Phase 04: Agenda Engine & FullCalendar + Phase 05: Real GA4/GSC REST Integration).

---

## Active Milestone: v2.1 — Módulo Completo de Mensageria Automatizada (In Progress)

### Phase 06: Messaging Engine, Multi-Channel Providers & Persistence (Completed)
- [x] Módulo de tipagem `src/lib/messaging/types.ts` (`Channel`, `TemplateCategory`, `MessageTemplate`, `MessagingConfig`, `MessageLog`).
- [x] Motor de interpolação e templates padrão em `src/lib/messaging/engine.ts` (`interpolateTemplate` com suporte a `{{nome}}`, `{{ideia}}`, `{{local}}`, `{{data_agendamento}}`, `{{valor_sinal}}`).
- [x] Conectores de envio em `src/server/lib/messaging-service.ts`:
  - WhatsApp: Evolution API v2 (`POST /message/sendText/{instanceName}`) com headers `{ apikey, Content-Type }` e telefone sanitizado (`55489...`).
  - E-mail: Conector SMTP configurável via `nodemailer`.
- [x] Endpoints de API REST seguros `/api/messages/*` protegidos por autorização administrativa (`isAuthorized`).
- [x] Suporte a persistência de templates, configurações e logs no SQLite (`src/lib/db.ts`).

### Phase 07: Quick Message Modal & Leads Action Integration (Completed)
- [x] Componente `src/components/admin/quick-message-modal.tsx` com `Dialog` e `Tabs` shadcn (`[ WhatsApp ]` e `[ E-mail ]`).
- [x] Dropdown de seleção de templates com interpolação dinâmica dos dados do lead selecionado no textarea.
- [x] Campo condicional de Assunto para o canal E-mail.
- [x] Ação de envio via API com loading/toasts e botão secundário "Abrir Web WhatsApp" como fallback manual.
- [x] Conexão e abertura do modal nos cards e linhas de leads em `src/components/admin/lead-table.tsx` e `src/components/admin/bento-overview.tsx`.

### Phase 08: Messaging Administration Hub & Quality Assurance (Planned)
- [ ] Componente `src/components/admin/messaging-tab.tsx` integrado à Sidebar de `src/routes/admin.tsx` com ícone `MessageSquare`.
- [ ] Sub-aba 1: Gestor de Templates com CRUD, tabela/cards e chips interativos de variáveis (`+ {{nome}}`, etc.).
- [ ] Sub-aba 2: Disparo em Massa / Campanhas com filtros de leads e barra de progresso visual (`Progress` do shadcn).
- [ ] Sub-aba 3: Configurações de Conexão com formulários de credenciais, botões de teste de conexão (WhatsApp e E-mail) e tabela de histórico de logs.
- [ ] Suíte de testes automatizados (`src/test/messaging.test.ts`), validação integral com `npm test` e compilação de produção com `npm run build`.

---

## Future Milestone (v2.2 / Content Expansion)

### Phase 09: Content Expansion & Authority
- [ ] Seção de Perguntas Frequentes (FAQ) interativa com Accordion e Schema `FAQPage`.
- [ ] Guia e seção de Cuidados Pós-Tatuagem ("Aftercare Guide").
- [ ] Módulo editorial de artigos e publicações para fortalecimento de SEO orgânico.
