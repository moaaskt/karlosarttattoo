# Phase 3 Plan 02 Summary: Bento Grid Dashboard Redesign & ApexCharts Migration

**Status:** Completed  
**Completed Date:** 2026-10-01  
**Wave:** 2

## Overview

Redesign completo da interface administrativa `/admin` implementando a linguagem visual avançada da Aceternity UI com layout Bento Grid, abas modulares de navegação, atmosfera dark com BackgroundBeams e migração definitiva dos gráficos analíticos para ApexCharts.

## Key Deliverables

- **BentoOverview (`src/components/admin/bento-overview.tsx`):**
  - Layout Bento Grid responsivo (1 a 3 colunas) com cards analíticos e de performance.
  - Gráfico Principal de Área Neon com ApexCharts (`ApexChartClient`), curvas suaves e seletor dinâmico de período (7D, 30D, 90D) para correlação entre sessões GA4 e leads recebidos.
  - Gráfico Donut de Funil de Conversão com distribuição proporcional de leads novos, contatados e agendados.
  - Indicadores de demanda por modalidade (Estúdio Palhoça vs Atendimento VIP Floripa/São José) e lista rápida de últimos orçamentos.
  - 4 Cards superiores no padrão `GlowingCard` com spotlight sensível ao cursor do mouse.
- **Abas Modulares e Atmosfera no `/admin` (`src/routes/admin.tsx`):**
  - Barra de navegação por abas: **"VISÃO GERAL BENTO"** (painel analítico) e **"GESTÃO DE LEADS"** (painel operacional com contador em tempo real).
  - BackgroundBeams com feixes de luz lineares e malha de grade sutil para reforçar a estética dark de luxo.
  - ShimmerButtons integrados tanto no login de acesso quanto nas ações de disparo para WhatsApp em `lead-table.tsx`.

## Verification

- `npx vite build` executado e aprovado em 942ms (client) e 568ms (Nitro/SSR) sem erros.
- ApexCharts renderiza perfeitamente no client com SSR-safe wrapper.
- Navegação entre abas, alteração de status e botões de ação operacionais.
