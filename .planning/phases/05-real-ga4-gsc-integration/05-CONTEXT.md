# Phase 05: Real GA4 Data API & Google Search Console Integration - Context

**Data de Coleta:** 2026-10-08  
**Status:** Aprovado / Pronto para Planejamento  
**Milestone:** v2.0  

---

## 🎯 1. Domínio & Fronteiras da Fase

A **Fase 05** entrega a integração real com as APIs do ecossistema Google para o ateliê Karlos Art Tattoo:
- **Google Analytics 4 (GA4 Data API v1)**: Métricas de tráfego, usuários ativos, sessões, canais de aquisição e distribuição geográfica de Santa Catarina (Palhoça, Florianópolis, São José, etc.).
- **Google Search Console (GSC API v1)**: Termos de pesquisa orgânica no Google ("karlitostattoo", "tatuador em palhoça", "estúdio de tatuagem palhoça"), cliques, impressões, CTR e posição média.
- **Painel Administrativo (`/admin`)**: Nova aba dedicada **"Tráfego & SEO"** (`AnalyticsTab.tsx`) na Sidebar da Aceternity UI, sem poluir ou alterar a visão operacional atual do Bento Grid.
- **Resiliência & Zero Quota Burn**: Camada de cache em memória no servidor com TTL de 30 minutos e fallback automático ultra-realista quando não houver credenciais configuradas no `.env` (desenvolvimento local seguro).

---

## 🔒 2. Decisões Arquiteturais Fechadas (Decisions D-01 a D-08)

### D-01 — Estratégia de Dependências Google
- Utilizar a biblioteca leve `google-auth-library` para autenticação baseada em JWT assinado por Service Account.
- Realizar as consultas REST diretamente via chamadas HTTP aos endpoints oficiais do Google:
  - GA4: `https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`
  - GSC: `https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`
- **Justificativa**: Evita a inclusão do pacote monólito `googleapis` (que possui dezenas de megabytes e centenas de APIs desnecessárias), mantendo o bundle e o tempo de build do Vite/Nitro extremamente rápidos.

### D-02 — Configuração de Credenciais & Variáveis de Ambiente
As credenciais serão lidas a partir de variáveis de ambiente no servidor:
- `GA4_PROPERTY_ID`: ID numérico da propriedade GA4 (ex: `456789123`).
- `GSC_SITE_URL`: Identificador do site no Search Console (ex: `sc-domain:karlosarttattoo.com.br` ou `https://karlosarttattoo.com.br/`).
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Email da Service Account (ex: `karlos-analytics@karlos-art-tattoo.iam.gserviceaccount.com`).
- `GOOGLE_PRIVATE_KEY`: Chave privada RSA PEM da Service Account (com substituição de `\\n` por quebras de linha reais).
- *Alternativa*: Suporte a leitura de arquivo `google-credentials.json` na raiz (adicionado ao `.gitignore`).

### D-03 — Política de Fallback Transparente (Modo Simulado em Dev)
- Se qualquer uma das variáveis obrigatórias estiver ausente ou inválida:
  - A API `/api/analytics` NÃO falha nem quebra a aplicação.
  - Retorna payload idêntico em estrutura tipada, contendo `is_mock: true` e dados realistas calibrados para a região da Grande Florianópolis (Palhoça, Floripa, São José).
  - A interface exibe badge informativo âmbar: `⚠️ Modo Demonstração (Sem credenciais GA4/GSC)`.

### D-04 — Política de Cache em Memória & Proteção de Quotas
- Cache em memória no processo Node.js / Nitro (`src/server/lib/analytics-cache.ts`):
  - Chave de cache baseada nos parâmetros do relatório: `{period, metrics, propertyId}`.
  - TTL padrão de **30 minutos** para relatórios históricos (`7d`, `30d`, `90d`).
  - Prevenção de requisições concorrentes idênticas (deduplicação de promises em andamento).
  - Botão na interface para forçar atualização sob demanda (`forceRefresh: true`), liberado apenas com autenticação de admin.

### D-05 — Contrato da Rota Servidora `/api/analytics`
- Endpoint: `GET /api/analytics?period=7d|30d|90d`
- Requer autorização administrativa (mesmo token `Bearer` verificado via `isAuthorized(request)`).
- Resposta padronizada:
  ```json
  {
    "success": true,
    "is_mock": false,
    "cached_at": "2026-10-08T11:00:00.000Z",
    "summary": {
      "total_sessions": 1420,
      "active_users": 1180,
      "page_views": 3890,
      "engagement_rate": "68.4%",
      "avg_engagement_time": "1m 45s",
      "gsc_clicks": 320,
      "gsc_impressions": 8450,
      "gsc_ctr": "3.79%",
      "gsc_avg_position": "8.4"
    },
    "timeline": [
      { "date": "2026-10-01", "sessions": 180, "users": 145, "clicks": 42 }
    ],
    "geo_cities": [
      { "city": "Palhoça", "users": 580, "percentage": "49.1%" },
      { "city": "Florianópolis", "users": 390, "percentage": "33.0%" },
      { "city": "São José", "users": 160, "percentage": "13.6%" }
    ],
    "traffic_sources": [
      { "channel": "Orgânico (Google)", "sessions": 890, "percentage": "62.7%" },
      { "channel": "Direto", "sessions": 310, "percentage": "21.8%" },
      { "channel": "Social (Instagram)", "sessions": 220, "percentage": "15.5%" }
    ],
    "search_queries": [
      { "query": "karlitos tattoo", "clicks": 145, "impressions": 890, "ctr": "16.29%", "position": 1.2 },
      { "query": "tatuador palhoça", "clicks": 82, "impressions": 1420, "ctr": "5.77%", "position": 3.4 },
      { "query": "estudio tatuagem palhoca", "clicks": 54, "impressions": 1150, "ctr": "4.70%", "position": 4.1 }
    ],
    "top_pages": [
      { "path": "/", "page_views": 2450 },
      { "path": "/galeria", "page_views": 890 },
      { "path": "/estilo", "page_views": 550 }
    ]
  }
  ```

### D-06 — Localização & Apresentação na Interface
- Nova aba na Sidebar do `/admin`: **"Tráfego & SEO"** com ícone `TrendingUp`.
- O layout do Bento Overview original permanece intacto e focado nos KPIs de negócio e agendamentos.
- A aba `AnalyticsTab.tsx` conterá:
  1. Cabeçalho com seletor de período (`7D`, `30D`, `90D`), indicador de status (Mock vs Conectado Real), data do último cache e botão "Atualizar Agora".
  2. 4 Cards de Métricas Principais (Sessões, Usuários Ativos, Cliques no Google, Posição Média).
  3. Gráfico de Tendência Temporal em ApexCharts (Sessões vs Cliques de Pesquisa ao longo dos dias).
  4. Distribuição Geográfica (Cidades de SC com barras de progresso proporcionais).
  5. Tabela de Consultas do Google Search Console (Palavras-chave, Cliques, Impressões, CTR e Posição).
  6. Canais de Aquisição e Top Páginas Visitadas.

### D-07 — Testabilidade Determinística & Segurança
- Mock injetável para testes unitários da autenticação do Google e das chamadas HTTP.
- Testes cobrindo:
  - Resposta em modo mock quando faltam credenciais no ambiente.
  - Formatação e parsing de respostas brutas da GA4 Data API e Search Console.
  - Mecanismo de expiração de TTL e invalidação do cache em memória.
  - Segurança de autorização da rota `/api/analytics` com `crypto.timingSafeEqual`.

---

## 🚀 3. Critérios de Sucesso da Fase 05

1. `npm install google-auth-library` adicionado com versões travadas e seguras.
2. Rota `/api/analytics` operacional com suporte a credenciais reais e fallback simulado.
3. Cache em memória com TTL de 30m funcionando sem vazamentos ou chamadas redundantes.
4. Nova aba `Tráfego & SEO` integrada na Sidebar do painel administrativo.
5. Suíte de testes automatizados (`npm test`) com 100% de aprovação.
6. Build de produção (`npm run build`) validado sem erros.
