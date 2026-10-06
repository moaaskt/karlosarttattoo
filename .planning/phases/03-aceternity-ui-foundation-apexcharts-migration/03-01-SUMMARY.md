# Phase 3 Plan 01 Summary: Aceternity UI Primitives & ApexCharts Setup

**Status:** Completed  
**Completed Date:** 2026-10-01  
**Wave:** 1

## Overview

Instalação das dependências de visualização analítica, criação do wrapper SSR-safe para ApexCharts e desenvolvimento da suíte de componentes primitivos da Aceternity UI adaptados ao Tailwind CSS v4 e à estética dark editorial do projeto (#070707 e #9be5ff).

## Key Deliverables

- **Dependências Instaladas:** `apexcharts` e `react-apexcharts`.
- **ApexChartClient SSR-Safe (`src/components/admin/apex-chart-client.tsx`):**
  - Carregamento dinâmico assíncrono para evitar erros de `window is not defined` no SSR do TanStack Start e Nitro.
  - Fallback visual com spinner neon #9be5ff durante o carregamento inicial.
  - Customização de classes e tooltips escuros do ApexCharts.
- **Primitivos Aceternity UI (`src/components/ui/aceternity/`):**
  - `bento-grid.tsx`: containers `BentoGrid` e `BentoGridItem` responsivos com suporte a spans flexíveis e visual dark.
  - `glowing-card.tsx`: card interativo com spotlight acompanhando o cursor do mouse e borda luminosa reativa.
  - `shimmer-button.tsx`: botão com efeito de brilho angular dinâmico para CTAs de alta conversão.
  - `background-beams.tsx`: plano de fundo sofisticado com malha e feixes de luz lineares para a atmosfera do painel.
  - Keyframe `@keyframes shimmer` adicionado ao `src/styles.css`.

## Verification

- `npx vite build` executado e aprovado com sucesso em 1.8s sem nenhum erro de tipagem ou empacotamento Nitro/Vercel.
