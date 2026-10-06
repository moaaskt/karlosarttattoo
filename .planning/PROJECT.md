# Project Name: Karlos Art Tattoo

## Context and Purpose

This project is a Single Page Application (SPA) with Server-Side Rendering (SSR) capabilities built as a premium, editorial-style landing page, lead conversion engine, and portfolio for Karlos Art Tattoo. The goal is to showcase the artist's work (tatuagem autoral e fine line), communicate brand philosophy via the Brand Manifesto, list the locations served (Palhoça, Florianópolis, and Grande Florianópolis), and provide an integrated native lead capture system and authenticated administrative dashboard.

## Active Milestone: v2.0 (In Progress)

- **Title:** Aceternity Admin Redesign, ApexCharts, Agenda System & Real GA4/GSC Integration
- **Key Objectives:**
  1. Redesenhar o painel `/admin` utilizando a linguagem visual de ponta da Aceternity UI (Bento Grid, dark glassmorphism, glowing borders e microgradientes).
  2. Migrar/integrar gráficos interativos em alta definição via ApexCharts.
  3. Criar sistema completo de agenda para o Karlos com calendário interativo, bloqueio de horários e conversão direta de leads em agendamentos.
  4. Integrar dados reais do Google Analytics 4 (Data API) e Google Search Console (Search Console API) via Service Account do Google Cloud.

## Shipped Milestones

- **Milestone v1.0 (Shipped: 2026-10-01):** Core MVP Landing Page + Brand Manifesto + Local SEO Agressivo + Native Lead Engine em SQLite + Painel `/admin` inicial.

## Architecture Highlights

- **Framework**: TanStack Start & React 19
- **Routing**: @tanstack/react-router
- **Styling & UI**: Tailwind CSS v4 + Radix UI Primitives + Aceternity UI components
- **Animations**: GSAP para interações e animações da landing page, Lenis smooth scrolling
- **Charts**: ApexCharts & Recharts
- **Backend / API**: Nitro Server Engine, rotas nativas `/api/leads`, `/api/bookings`, `/api/analytics` com validação Zod
- **Database**: Persistência relacional SQLite via `node:sqlite` em `src/lib/db.ts`
- **External Integrations**: Google Analytics 4 Data API, Google Search Console API

## Target Audience

Clients seeking custom fine line tattoos in Palhoça, Florianópolis, and São José (Santa Catarina, Brazil). The aesthetic is designed to feel high-end, premium, and exclusive.
