# Phase 3: Aceternity UI Foundation & ApexCharts Migration - Context

**Gathered:** 2026-10-01  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Modernizar integralmente a interface do painel administrativo (`/admin`) implementando a linguagem visual avançada da **Aceternity UI** (Bento Grid com abas modulares, Background Beams/Grid suave, Glowing Borders no hover, Shimmer Buttons) e migrar a camada analítica de dados para **ApexCharts** com gráficos interativos (área neon com gradiente para tráfego/leads, radial/donut para conversão e seletor de períodos 7D/30D/90D), mantendo o ecossistema dark editorial exclusivo (#070707 e #9be5ff).

</domain>

<decisions>
## Implementation Decisions

### 1. Organização e Layout do Painel /admin
- **D-01:** Estrutura modular por abas interativas no `/admin`:
  - **Aba "Visão Geral Bento":** Layout Bento Grid com cards de KPIs, gráficos ApexCharts de tráfego/conversão e indicadores analíticos de performance.
  - **Aba "Gestão de Leads":** Foco operacional dedicado à triagem rápida, alteração de status em tempo real e ações imediatas para WhatsApp do cliente com mensagem autoral pré-preenchida.
  - Header fixo com status de conexão, atalho para o site principal e botão de logout estilizado.

### 2. Primitivos e Efeitos Visuais Aceternity UI
- **D-02:** Background visual sofisticado com padrão sutil de feixes luminosos / grid escuro (`BackgroundBeams` / `GridPattern`), mantendo a sobriedade dark sem poluição visual.
- **D-03:** Componentes de cards com efeito de borda luminosa dinâmica no hover (`GlowingCard` / `BentoGridItem`), reagindo ao ponteiro do mouse com brilho ciano suave (`#9be5ff`).
- **D-04:** Botões de ação e filtros com acabamento `ShimmerButton` (efeito de brilho angular dinâmico) para CTAs de impacto ("Acessar WhatsApp", "Atualizar Dados", seletores de filtro).
- **D-05:** Preservação estrita da paleta de cores oficial: `#070707` (fundo principal), `#0b0b0e` (cards do bento), bordas translúcidas `border-white/10` e acentos ciano neon `#9be5ff`.

### 3. Visualização de Dados e Migração para ApexCharts
- **D-06:** Instalação e integração do `apexcharts` e `react-apexcharts`, devidamente encapsulado com SSR-safe dynamic import no TanStack Start / Vite para evitar erros de renderização no servidor (`window is not defined`).
- **D-07:** Gráfico principal de Área com gradiente de alta definição (`ApexAreaChart`):
  - Eixo X com datas dinâmicas e seletor de período (7 dias, 30 dias, 90 dias).
  - Curvas suaves (smooth curve) com preenchimento gradiente ciano neon `#9be5ff` para Leads e linha neutra luminosa para Sessões.
  - Tooltips dark customizados com números contrastantes e tipografia mono.
- **D-08:** Gráfico de Conversão do Funil (`ApexRadialBar` / `ApexDonutChart`):
  - Visualização moderna da taxa de conversão (Leads recebidos vs Agendados).
  - Breakdown de modalidades (Estúdio Palhoça vs Atendimento VIP Floripa/São José).

### 4. Responsividade e Performance
- **D-09:** O Bento Grid deve se rearranjar perfeitamente em 1 coluna no mobile e tablets, permitindo ao Karlos monitorar métricas e gerenciar leads confortavelmente pelo smartphone.
- **D-10:** Garantia de 60fps mantendo CSS transforms acelerados por hardware e evitando rerenders desnecessários dos gráficos.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — Requisitos R-01 a R-04 e NFR-01/NFR-02 do Milestone v2.0.
- `.planning/ROADMAP.md` — Definição do escopo da Phase 03.
- `src/routes/admin.tsx` — Rota do painel administrativo a ser refatorada com o novo layout Bento e abas.
- `src/components/admin/lead-table.tsx` — Componente de tabela a ser integrado na aba dedicada de gestão operacional.
- `src/lib/db.ts` — Camada relacional SQLite de onde são extraídos os dados para os gráficos e métricas.

</canonical_refs>
