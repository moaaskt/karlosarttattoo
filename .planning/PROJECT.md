# Project Name: Karlos Art Tattoo

## Context and Purpose

This project is a Single Page Application (SPA) with Server-Side Rendering (SSR) capabilities built as a premium, editorial-style landing page, lead conversion engine, and portfolio for Karlos Art Tattoo. The goal is to showcase the artist's work (tatuagem autoral e fine line), communicate brand philosophy via the Brand Manifesto, list the locations served (Palhoça, Florianópolis, and Grande Florianópolis), and provide an integrated native lead capture system, interactive agenda engine, and authenticated administrative dashboard with real-time analytics.

## Active Milestone: v2.1 (Módulo Completo de Mensageria Automatizada)

- **Title:** Módulo Completo de Mensageria Automatizada (WhatsApp via Evolution API v2 + E-mail via SMTP + Gestor de Templates e Disparos)
- **Key Objectives:**
  1. Criar estrutura de tipos, dados e motor de interpolação de variáveis em `src/lib/messaging/`.
  2. Implementar conectores de envio para WhatsApp (Evolution API v2) e E-mail (SMTP) em `src/server/lib/messaging-service.ts`.
  3. Desenvolver o modal centralizado de disparo rápido `QuickMessageModal.tsx` integrado nos cards de leads da `LeadTable` e `BentoOverview`.
  4. Desenvolver a nova aba dedicada "Mensageria & Disparos" (`MessagingTab.tsx`) com Gestor de Templates, Disparo em Massa para Campanhas e Configurações de Conexão com Logs de histórico.
  5. Assegurar conformidade visual com os componentes oficiais do shadcn e o tema dark editorial do painel (`#222831`, `#31363f`, `#76abae`, `#9be5ff`).

## Shipped Milestones

- **Milestone v1.0 (Shipped: 2026-10-01):** Core MVP Landing Page + Brand Manifesto + Local SEO Agressivo + Native Lead Engine em SQLite + Painel `/admin` inicial. ([v1.0-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v1.0-ROADMAP.md))
- **Milestone v2.0 (Shipped: 2026-10-08):** Aceternity Admin Redesign (Bento Grid, Glowing Cards, Sidebar) + ApexCharts Migration SSR-safe + Agenda & Booking Engine (SQLite WAL, FullCalendar, buffers, anti-sobreposição) + Real GA4 Data API & Google Search Console REST Integration. ([v2.0-ROADMAP.md](file:///home/moa-dev/projetos/ink-sharp-editorial/.planning/milestones/v2.0-ROADMAP.md))

## Architecture Highlights

- **Framework**: TanStack Start & React 19
- **Routing**: @tanstack/react-router
- **Styling & UI**: Tailwind CSS v4 + Radix UI Primitives + Aceternity UI components + shadcn/ui components
- **Animations**: GSAP para interações da landing page, Lenis smooth scrolling
- **Charts**: ApexCharts com wrapper `ApexChartClient` SSR-safe
- **Calendar**: FullCalendar v6.1.21 com `@fullcalendar/luxon3` (fuso America/Sao_Paulo)
- **Backend / API**: Nitro Server Engine, rotas nativas `/api/leads`, `/api/bookings`, `/api/time-blocks`, `/api/availability-rules`, `/api/settings`, `/api/analytics`, `/api/messages/*` com validação Zod
- **Database**: Persistência relacional SQLite via `node:sqlite` em `src/lib/db.ts` com backup atômico VACUUM INTO
- **External Integrations**: Google Analytics 4 Data API, Google Search Console API, Evolution API v2 (WhatsApp), SMTP (E-mail)

## Target Audience

Clients seeking custom fine line tattoos in Palhoça, Florianópolis, and São José (Santa Catarina, Brazil). The aesthetic is designed to feel high-end, premium, and exclusive.
