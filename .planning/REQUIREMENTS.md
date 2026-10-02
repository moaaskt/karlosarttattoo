# Requirements: Milestone v2.0 — Aceternity Admin Redesign, ApexCharts, Agenda System & Real GA4/GSC Integration

**Milestone:** v2.0  
**Created:** 2026-10-01  
**Status:** In Progress  

---

## 1. Functional Requirements

### 1.1 Aceternity UI Admin Redesign
- **R-01 (Bento Grid Dashboard):** O painel administrativo `/admin` deve ser reorganizado em um layout Bento Grid fluido, utilizando a estética visual de ponta da Aceternity UI (bordas luminosas, microgradientes, dark glassmorphism com base `#070707` e acentos `#9be5ff`).
- **R-02 (Aceternity UI Primitives):** Incorporar componentes visuais característicos:
  - Background Beams / Grid / Dot Pattern sutil para o painel.
  - Glowing Cards / Hover Border Effects para métricas e blocos interativos.
  - Shimmer Buttons e feedback visual dinâmico em ações críticas (salvar, confirmar agendamento, disparar WhatsApp).

### 1.2 ApexCharts Migration & Data Visualization
- **R-03 (ApexCharts Integration):** Substituir/integrar componentes de gráficos utilizando ApexCharts (`react-apexcharts` / `apexcharts`), com suporte a tema dark nativo, gradientes sofisticados e animações de renderização suaves.
- **R-04 (Interactive Performance Charts):**
  - Gráfico de área/linha interativo com múltiplos eixos (Sessões vs Novos Leads vs Agendamentos Confirmados).
  - Gráfico de barras horizontais/donut com distribuição de tipos de atendimento (Estúdio Palhoça vs VIP Floripa/São José vs Flash).
  - Filtros interativos de período (7 dias, 30 dias, 90 dias, ano corrente).

### 1.3 Agenda & Booking System (Sistema de Agenda do Karlos)
- **R-05 (Data Model for Bookings):** Criar tabela relacional `bookings` no SQLite (`src/lib/db.ts`) com suporte a:
  - `id`, `leadId` (opcional/vinculado), `clientName`, `clientPhone`, `date`, `timeSlot`, `serviceType`, `notes`, `status` ('pendente' | 'confirmado' | 'concluido' | 'cancelado'), `createdAt`.
- **R-06 (Interactive Calendar UI):** Interface interativa de calendário no `/admin` com visualização mensal e semanal dos horários agendados.
- **R-07 (Slot Management & Blocking):** Capacidade de bloquear datas/horários (ex: dias de folga, viagens, convenções) e liberar horários livres.
- **R-08 (Lead-to-Booking Conversion):** Botão de ação rápida na tabela de leads para "Converter em Agendamento", abrindo modal com data/hora e já vinculando os dados do cliente à agenda.

### 1.4 Real GA4 & Google Search Console Integration
- **R-09 (Google Cloud Service Account Connection):** Rota de API no servidor para buscar dados reais usando Google Analytics Data API v1 e Google Search Console API.
- **R-10 (GA4 Metrics):** Exibir dados reais de usuários ativos, sessões orgânicas, cidades de origem (Palhoça, Florianópolis, São José) e taxa de rejeição.
- **R-11 (Search Console Queries):** Exibir as principais palavras-chave buscadas que levaram ao site ("karlitostattoo", "tatuador em palhoça", "tatuagem autoral"), com métricas de cliques, impressões e posição média no Google.
- **R-12 (Mock/Dev Fallback):** Em caso de ausência de credenciais no ambiente de desenvolvimento, o sistema deve fornecer dados simulados realistas com aviso informativo transparente no painel.

---

## 2. Non-Functional Requirements

- **NFR-01 (Performance & 60fps):** As animações do Bento Grid e os gráficos do ApexCharts devem rodar em 60fps constantes sem causar travamento na thread principal.
- **NFR-02 (Mobile & Tablet Responsiveness):** O novo dashboard `/admin` e o calendário devem ser perfeitamente operáveis tanto em telas grandes quanto em smartphones (para que o Karlos gerencie a agenda diretamente do celular).
- **NFR-03 (Security & Permissions):** O acesso aos dados reais do GA4, GSC e da Agenda deve permanecer estritamente protegido pelo mecanismo de autenticação do `/admin`.
- **NFR-04 (Architecture Consistency):** Manter fidelidade à stack do projeto (TanStack Start, Nitro, Tailwind CSS v4, SQLite relacional nativo).
