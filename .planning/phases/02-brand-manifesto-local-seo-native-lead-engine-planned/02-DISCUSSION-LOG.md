# Phase 2: Brand Manifesto, Local SEO & Native Lead Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-01  
**Phase:** 02-brand-manifesto-local-seo-native-lead-engine-planned  
**Areas discussed:** Brand Manifesto & Local SEO Authority, Native Lead Engine & Admin Dashboard

---

## Brand Manifesto & Local SEO Authority

| Opção                                     | Descrição                                                                                          | Selecionado |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------- |
| Sanity CMS & Testes Unitários             | Escopo genérico preliminar do Roadmap                                                              |             |
| Manifesto Editorial + SEO Local Agressivo | Seção `Manifesto.tsx` com 3 pilares e Schema JSON-LD `TattooParlor` com termos locais estratégicos | ✓           |

**Decisão do Usuário:** Implementar seção de Manifesto com headline central e os 3 pilares do método, acompanhada de SEO agressivo para "karlitostattoo" e "tatuador em palhoça".  
**Notas:** Posicionamento imediatamente após o Hero e antes de "Onde Me Encontrar".

---

## Native Lead Engine & Admin Dashboard

| Opção                                            | Descrição                                                                                               | Selecionado |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------- |
| Formspree externo contínuo                       | Manter submissão direta do formulário pelo cliente                                                      |             |
| Lead Engine Nativo no Nitro + Dashboard `/admin` | API própria `/api/leads`, persistência em banco relacional, notificações automáticas e painel de gestão | ✓           |

**Decisão do Usuário:** Substituir o Formspree por uma infraestrutura própria de captação e gerenciamento com painel autenticado, links diretos de WhatsApp e métricas do GA4.  
**Notas:** Elimina limites de envio de serviços externos e viabiliza acompanhamento comercial direto pelo artista.

---

## Claude's Discretion

- Seleção de ORM e banco relacional compatível com Nitro/Vercel (ex: Drizzle ORM).
- Validação Zod estrita na rota `/api/leads`.
- Mecanismo de autenticação para `/admin`.

## Deferred Ideas

- Migração de portfólio para CMS headless externo (Sanity) ou API Graph do Instagram.
- Testes automatizados Vitest/Playwright.
