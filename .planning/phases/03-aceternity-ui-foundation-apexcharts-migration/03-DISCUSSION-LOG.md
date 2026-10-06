# Phase 3 Discussion Log: Aceternity UI Foundation & ApexCharts Migration

**Date:** 2026-10-01  
**Participants:** Developer & Assistant

---

## Areas Explored & Decisions Made

### 1. Organização Visual do Painel /admin

- **Opções Analisadas:**
  - Bento Grid Único Assimétrico com todas as informações na mesma tela contínua.
  - Layout Modular com Abas dedicadas ('Visão Geral Bento' e 'Gestão de Leads').
- **Decisão:** **Layout Modular com Abas**.
  - A aba _Visão Geral Bento_ concentra todo o poder analítico, cards de KPIs e gráficos do ApexCharts sem rolagem excessiva.
  - A aba _Gestão de Leads_ oferece um ambiente limpo e focado no atendimento imediato, filtros rápidos e conversas via WhatsApp.

### 2. Intensidade dos Efeitos Visuais Aceternity UI

- **Opções Analisadas:**
  - Glow Dinâmico & Spotlight com Background Beams/Grid suave, Glowing Borders no hover e Shimmer Buttons nas ações principais.
  - Dark Minimalista Estático sem animações dinâmicas de fundo.
- **Decisão:** **Glow Dinâmico & Spotlight**.
  - Utilização de feixes de fundo discretos e bordas com iluminação responsiva ao mouse (`#9be5ff`), agregando valor estético sem comprometer a performance de 60fps.

### 3. Visualizações com ApexCharts

- **Opções Analisadas:**
  - Gráfico de Área com gradiente neon para Tráfego/Leads + Donut/Radial para taxa de conversão do funil, com seletor de períodos (7D, 30D, 90D).
  - Gráficos de Linha Pura minimalistas e estáticos.
- **Decisão:** **Gráfico de Área Neon + Radial/Donut com Filtros Interativos**.
  - O gráfico de área com gradiente ciano neon dará ao Karlos clareza visual sobre picos de demanda orgânica na Palhoça e Grande Floripa, complementado pelo breakdown de serviços e taxas de conversão.
