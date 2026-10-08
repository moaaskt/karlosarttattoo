# Project Name: Karlos Art Tattoo

## Context and Purpose

This project is a Single Page Application (SPA) with Server-Side Rendering (SSR) capabilities built as a premium, editorial-style landing page, lead conversion engine, and portfolio for Karlos Art Tattoo. The goal is to showcase the artist's work (tatuagem autoral e fine line), communicate brand philosophy via the Brand Manifesto, list the locations served (Palhoça, Florianópolis, and Grande Florianópolis), and provide an integrated native lead capture system, interactive agenda engine, and authenticated administrative dashboard with real-time analytics.

## Shipped Milestones

- **Milestone v1.0 (Shipped: 2026-10-01):** Core MVP Landing Page + Brand Manifesto + Local SEO Agressivo + Native Lead Engine em SQLite + Painel `/admin` inicial. ([v1.0-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v1.0-ROADMAP.md))
- **Milestone v2.0 (Shipped: 2026-10-08):** Aceternity Admin Redesign (Bento Grid, Glowing Cards, Sidebar) + ApexCharts Migration SSR-safe + Agenda & Booking Engine (SQLite WAL, FullCalendar, buffers, anti-sobreposição) + Real GA4 Data API & Google Search Console REST Integration. ([v2.0-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v2.0-ROADMAP.md))

## Next Milestone: v2.1 (Content Expansion & Authority)

- **Target Scope:**
  1. Seção interativa de Perguntas Frequentes (FAQ) com Schema JSON-LD `FAQPage`.
  2. Guia de Cuidados Pós-Tatuagem ("Aftercare Guide") detalhado para clientes.
  3. Módulo editorial de publicações para autoridade orgânica e expansão de busca.

## Architecture Highlights

- **Framework**: TanStack Start & React 19
- **Routing**: @tanstack/react-router
- **Styling & UI**: Tailwind CSS v4 + Radix UI Primitives + Aceternity UI components
- **Animations**: GSAP para interações da landing page, Lenis smooth scrolling
- **Charts**: ApexCharts com wrapper `ApexChartClient` SSR-safe
- **Calendar**: FullCalendar v6.1.21 com `@fullcalendar/luxon3` (fuso America/Sao_Paulo)
- **Backend / API**: Nitro Server Engine, rotas nativas `/api/leads`, `/api/bookings`, `/api/time-blocks`, `/api/availability-rules`, `/api/settings`, `/api/analytics` com validação Zod
- **Database**: Persistência relacional SQLite via `node:sqlite` em `src/lib/db.ts` com backup atômico VACUUM INTO
- **External Integrations**: Google Analytics 4 Data API v1beta, Google Search Console API v3 via Service Account JWT

## Target Audience

Clients seeking custom fine line tattoos in Palhoça, Florianópolis, and São José (Santa Catarina, Brazil). The aesthetic is designed to feel high-end, premium, and exclusive.
