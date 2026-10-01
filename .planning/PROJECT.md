# Project Name: Karlos Art Tattoo

## Context and Purpose
This project is a Single Page Application (SPA) with Server-Side Rendering (SSR) capabilities built as a premium, editorial-style landing page, lead conversion engine, and portfolio for Karlos Art Tattoo. The goal is to showcase the artist's work (tatuagem autoral e fine line), communicate brand philosophy via the Brand Manifesto, list the locations served (Palhoça, Florianópolis, and Grande Florianópolis), and provide an integrated native lead capture system and authenticated administrative dashboard.

## Current State (Milestone v1.0 Shipped)
- **Version:** v1.0 (Shipped: 2026-10-01)
- **Delivered Capabilities:**
  - Hero with background video, custom calls-to-action, and Lenis smooth scrolling.
  - Brand Manifesto section (`Manifesto.tsx`) communicating the 3 pillars of custom tattooing.
  - Aggressive Local SEO (Palhoça, Florianópolis, "karlitostattoo", JSON-LD `TattooParlor`, semantic H1).
  - Native Lead Engine with Nitro API (`/api/leads`), relational SQLite persistence (`src/lib/db.ts`), and automatic notifications.
  - Authenticated Admin Dashboard (`/admin`) with real-time lead status updates, direct WhatsApp outreach links, and GA4 metrics cards via `recharts`.

## Architecture Highlights
- **Framework**: TanStack Start & React 19
- **Routing**: @tanstack/react-router
- **Styling**: Tailwind CSS v4 + Radix UI Primitives (shadcn/ui style)
- **Animations**: Heavy use of GSAP for custom editorial animations and scroll interactions (via Lenis smooth scrolling).
- **Backend / API**: Nitro Server Engine, native `/api/leads` route with Zod validation.
- **Database**: Relational SQLite persistence via `node:sqlite` in `src/lib/db.ts`.
- **Analytics & Admin**: Recharts data visualization, Google Analytics 4 integration.

## Next Milestone Goals (v1.1)
- Interactive FAQ section with Schema FAQPage for rich search results.
- Dedicated Aftercare section and tattoo care instructions.
- Editorial articles / blog module for continuous organic content marketing.

## Target Audience
Clients seeking custom fine line tattoos in Palhoça, Florianópolis, and São José (Santa Catarina, Brazil). The aesthetic is designed to feel high-end, premium, and exclusive.
