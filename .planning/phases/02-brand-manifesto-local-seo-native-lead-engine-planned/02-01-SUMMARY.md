# Phase 2 Plan 01 Summary: Brand Manifesto & Local SEO Authority

**Status:** Completed  
**Completed Date:** 2026-10-01  
**Wave:** 1

## Overview

Implementação da seção Manifesto Editorial focada na filosofia e posicionamento exclusivo de Karlos Art Tattoo, além do estabelecimento de SEO Local agressivo e autoridade orgânica (termos "karlitostattoo", "tatuador em palhoça", Schema JSON-LD TattooParlor e H1 semântico).

## Key Deliverables

- **Manifesto Editorial (`src/components/Manifesto.tsx`):**
  - Posicionado entre o Hero e a seção `#locais`.
  - Estética dark editorial (`#070707`, bordas `border-white/10`, detalhes `#9be5ff`).
  - Headline central: _"Sua tatuagem é mais do que um desenho. É a expressão tangível do que existe dentro de você."_
  - 3 pilares do método autoral: Conexão & Essência, Futurismo & Anatomia, Ateliê & Privacidade.
- **Integração e Animações GSAP:**
  - Montagem no `src/routes/index.tsx` com animações suaves de entrada dos pilares via GSAP.
- **Local SEO & Schema JSON-LD:**
  - Atualização de meta tags e títulos em `src/routes/__root.tsx` e `src/routes/index.tsx`.
  - Inclusão do Schema estruturado `TattooParlor` com localização (Palhoça / Grande Floripa), coordenadas geo, link do Google Maps e Instagram oficial.
  - Inclusão de H1 semântico invisível (`sr-only`) para rankeamento orgânico sem poluir o visual.

## Verification

- `npx vite build` executado e validado com sucesso sem erros.
