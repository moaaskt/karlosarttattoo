# Phase 2: Brand Manifesto, Local SEO & Native Lead Engine - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Implementar a seção Manifesto Editorial focada na filosofia e posicionamento exclusivo de Karlos Art Tattoo, estabelecer SEO Local agressivo e autoridade orgânica (termos "karlitostattoo", "tatuador em palhoça", Schema JSON-LD TattooParlor) e substituir o Formspree externo por uma infraestrutura própria de leads (Nitro API `/api/leads` + persistência em banco relacional + notificações automáticas) acompanhada de um dashboard administrativo autenticado (`/admin`) com métricas do GA4 e gestão de contatos via WhatsApp.

</domain>

<decisions>
## Implementation Decisions

### 1. Seção Manifesto Editorial
- **D-01:** Localização do componente `src/components/Manifesto.tsx` posicionado diretamente abaixo do Hero e antes da seção `#locais` ("Onde Me Encontrar").
- **D-02:** Estilo dark editorial minimalista: fundo `#070707`, bordas ultrafinas (`border-white/10`), detalhes e acentos em `#9be5ff`, cantos retos (`rounded-none`).
- **D-03:** Headline central obrigatória: "Sua tatuagem é mais do que um desenho. É a expressão tangível do que existe dentro de você."
- **D-04:** Grid com os 3 pilares do método autoral:
  - `01 // CONEXÃO & ESSÊNCIA`: criação autoral do zero, respeito à individualidade e história do cliente.
  - `02 // FUTURISMO & ANATOMIA`: fine line, geometria sagrada, microrrealismo e projeção anatômica milimétrica.
  - `03 // ATELIÊ & PRIVACIDADE`: sessões privativas no ateliê na Palhoça ou atendimento VIP a domicílio (Florianópolis / São José).

### 2. SEO Local Agressivo & Autoridade de Marca
- **D-05:** Meta tags e títulos otimizados em `src/routes/__root.tsx` e `src/routes/index.tsx` para cobrir os termos exatos de busca: "karlitostattoo", "karlitos tattoo", "tatuador em palhoça" e "tatuagem autoral grande florianópolis".
- **D-06:** Schema estruturado JSON-LD do tipo `TattooParlor` inserido no `<head>`, integrando o link oficial do Google Maps, redes sociais oficiais e dados de localização da Palhoça e Grande Florianópolis.
- **D-07:** Inclusão de `h1` semântico acessível/invisível (`sr-only`) estruturado para rankeamento orgânico no Google sem impactar a estética visual.

### 3. Native Lead Engine & Persistência Relacional
- **D-08:** Rota de API nativa do Nitro (`/api/leads`) substituindo o endpoint externo do Formspree. — **Reversibility:** costly — migração da submissão do frontend e persistência de dados.
- **D-09:** Persistência em banco de dados relacional para registrar: nome, telefone/whatsapp, e-mail, modalidade de serviço, ideia/mensagem, data de envio e status do lead (novo, contatado, agendado, arquivado).
- **D-10:** Disparo de notificação automática a cada novo lead recebido (e-mail ou webhook de notificação).

### 4. Painel Administrativo (/admin) & Métricas GA4
- **D-11:** Criação da rota `/admin` no TanStack Router protegida por mecanismo seguro de autenticação (sessão/token seguro ou credenciais de administrador via env).
- **D-12:** Gestão visual de leads: listagem com filtros de status e botão de ação direta que abre o WhatsApp do cliente com mensagem pré-formatada.
- **D-13:** Cards de métricas integrados para acompanhamento de tráfego e conversão (Google Analytics 4 / leads gerados) utilizando componentes com `recharts`.

### Claude's Discretion
- Escolha da tecnologia de persistência relacional mais leve e integrada com o runtime Nitro/Vercel (ex: Drizzle ORM / SQLite em dev e banco relacional serverless em produção).
- Validação Zod estrita para o endpoint `/api/leads`.
- Mecanismo simplificado de autenticação para a área administrativa com armazenamento seguro em cookie httpOnly.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Roadmap do projeto atualizado com o escopo da Fase 2.
- `.planning/REQUIREMENTS.md` — Requisitos funcionais e visuais do Karlos Art Tattoo.
- `src/components/booking-modal.tsx` — Modal de agendamento onde a submissão será apontada para `/api/leads`.
- `src/routes/index.tsx` — Rota principal onde o componente `Manifesto.tsx` será montado.
- `src/routes/__root.tsx` — Rota raiz com as tags SEO, meta tags e injeção de scripts/schemas.
- `vite.config.ts` — Configurações do Vite, TanStack Start e Nitro preset Vercel.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/button.tsx`: botões com variantes editoriais (`editorial`, `editorialGhost`).
- `recharts`: já instalado em `package.json` para renderizar gráficos no `/admin`.
- `lucide-react`: ícones prontos para o dashboard e cards do manifesto.
- `zod`: instalado para tipagem e validação dos formulários e rotas de API.

### Established Patterns
- Paleta visual: Dark mode exclusivo (`#070707`, `#0a0a0c`, `#9be5ff`), tipografia com tracking amplo e bordas minimalistas.
- Nitro configurado com preset `vercel` em `vite.config.ts`.

### Integration Points
- `src/routes/index.tsx`: inserção da seção `<Manifesto />` entre Hero e `#locais`.
- `src/routes/__root.tsx`: injeção do JSON-LD `TattooParlor` e meta tags locais.
- `src/components/booking-modal.tsx`: migração da submissão para `POST /api/leads`.
- Nova rota de página `/admin` em `src/routes/admin.tsx`.
- Endpoint de API em `src/server` / `routes/api/leads.ts`.

</code_context>

<specifics>
## Specific Ideas

- Headline do manifesto: "Sua tatuagem é mais do que um desenho. É a expressão tangível do que existe dentro de você."
- Termos de busca prioritários: "karlitostattoo", "karlitos tattoo", "tatuador em palhoça".
- Link direto de WhatsApp no dashboard: `https://wa.me/55...` com mensagem personalizada de contato.

</specifics>

<deferred>
## Deferred Ideas

- Integração externa com CMS headless (Sanity) ou Instagram Graph API (postergada para fases posteriores).
- Implementação de suíte de testes automatizados com Vitest/Playwright (postergada para após a consolidação da infraestrutura de leads).

</deferred>
