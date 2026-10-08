# Project Name: Karlos Art Tattoo

## Context and Purpose

This project is a Single Page Application (SPA) with Server-Side Rendering (SSR) capabilities built as a premium, editorial-style landing page, lead conversion engine, and portfolio for Karlos Art Tattoo. The goal is to showcase the artist's work (tatuagem autoral e fine line), communicate brand philosophy via the Brand Manifesto, list the locations served (Palhoça, Florianópolis, and Grande Florianópolis), and provide an integrated native lead capture system, interactive agenda engine, authenticated administrative dashboard with real-time analytics, and automated multi-channel messaging system (WhatsApp via Evolution API v2 + E-mail via SMTP).

## Current State

- **Current Version:** v2.1 (Shipped)
- **Status:** All Milestones v1.0, v2.0 and v2.1 successfully completed and archived. Ready for next milestone.
- **Suíte de Testes:** 119/119 testes passando (100% PASS) em `npm test`.

## Shipped Milestones

- **Milestone v1.0 (Shipped: 2026-10-01):** Core MVP Landing Page + Brand Manifesto + Local SEO Agressivo + Native Lead Engine em SQLite + Painel `/admin` inicial. ([v1.0-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v1.0-ROADMAP.md))
- **Milestone v2.0 (Shipped: 2026-10-08):** Aceternity Admin Redesign (Bento Grid, Glowing Cards, Sidebar) + ApexCharts Migration SSR-safe + Agenda & Booking Engine (SQLite WAL, FullCalendar, buffers, anti-sobreposição) + Real GA4 Data API & Google Search Console REST Integration. ([v2.0-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v2.0-ROADMAP.md))
- **Milestone v2.1 (Shipped: 2026-10-08):** Módulo Completo de Mensageria Automatizada (WhatsApp via Evolution API v2 + E-mail via SMTP) + Motor de Interpolação dinâmico com tags de leads + QuickMessageModal integrado nos cards + Central de Mensageria & Disparos no `/admin` (Gestor de Templates com chips clicáveis, Campanhas em Massa com barra de progresso shadcn `Progress`, e Configurações de Conexão com ping e histórico de logs). ([v2.1-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v2.1-ROADMAP.md))

## Architecture Highlights

- **Framework**: TanStack Start & React 19
- **Routing**: @tanstack/react-router
- **Styling & UI**: Tailwind CSS v4 + Radix UI Primitives + Aceternity UI components + shadcn/ui components
- **Animations**: GSAP para interações da landing page, Lenis smooth scrolling
- **Charts**: ApexCharts com wrapper `ApexChartClient` SSR-safe
- **Calendar**: FullCalendar v6.1.21 com `@fullcalendar/luxon3` (fuso America/Sao_Paulo)
- **Backend / API**: Nitro Server Engine, rotas nativas `/api/leads`, `/api/bookings`, `/api/time-blocks`, `/api/availability-rules`, `/api/settings`, `/api/analytics`, `/api/messages/*` com validação Zod
- **Database**: Persistência relacional SQLite via `node:sqlite` em `src/lib/db.ts` com backup atômico VACUUM INTO
- **External Integrations**: Google Analytics 4 Data API, Google Search Console API, Evolution API v2 (WhatsApp), SMTP Nodemailer (E-mail)

## Target Audience

Clients seeking custom fine line tattoos in Palhoça, Florianópolis, and São José (Santa Catarina, Brazil). The aesthetic is designed to feel high-end, premium, and exclusive.
