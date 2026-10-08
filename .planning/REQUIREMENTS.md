# Requirements: Milestone v2.1 — Módulo Completo de Mensageria Automatizada (WhatsApp Evolution API v2 + E-mail SMTP + Gestor de Templates e Disparos)

**Milestone:** v2.1  
**Created:** 2026-10-08  
**Status:** In Progress  

---

## 1. Functional Requirements

### 1.1 Messaging Engine & Types (`src/lib/messaging/`)

- **R-01 (Tipos & Estrutura de Dados):**
  - Módulo `src/lib/messaging/types.ts` definindo:
    - `Channel: 'whatsapp' | 'email'`
    - `TemplateCategory: 'welcome' | 'deposit_request' | 'booking_confirm' | 'reminder' | 'post_care' | 'promo'`
    - `MessageTemplate: { id, name, category, channel, subject?, body, variables: string[], active: boolean }`
    - `MessagingConfig: { evolutionUrl, evolutionApiKey, instanceName, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom }`
    - `MessageLog: { id, leadId, leadName, channel, recipient, status: 'sent' | 'failed', sentAt, error? }`
- **R-02 (Template Interpolation Engine):**
  - Módulo `src/lib/messaging/engine.ts` com a função `interpolateTemplate(template: string, data: Record<string, any>): string` para substituição dinâmica de tags (`{{nome}}`, `{{ideia}}`, `{{local}}`, `{{data_agendamento}}`, `{{valor_sinal}}`, etc.).
  - Lista de templates padrão integrados (Boas-vindas, Cobrança de Sinal, Lembrete 24h, Cuidados Pós-Tattoo e Promoção Flash Day).
- **R-03 (Multi-Channel Sender Connectors):**
  - Conector WhatsApp em `src/server/lib/messaging-service.ts` consumindo Evolution API v2:
    - Endpoint `POST {evolutionUrl}/message/sendText/{instanceName}` com cabeçalhos `{ apikey, 'Content-Type': 'application/json' }`.
    - Sanitização e validação de número de telefone (prefixo `55`, remoção de caracteres não-numéricos).
  - Conector de E-mail via SMTP com credenciais configuráveis.
  - Endpoints de API seguros `/api/messages/send`, `/api/messages/templates`, `/api/messages/config` protegidos por autorização administrativa (`isAuthorized`).

### 1.2 Quick Message Modal nos Cards de Leads

- **R-04 (QuickMessageModal Component):**
  - Componente modal centralizado `src/components/admin/quick-message-modal.tsx` utilizando `Dialog` e `Tabs` shadcn.
  - Alternância de canais: `[ WhatsApp ]` e `[ E-mail ]`.
  - Dropdown para escolha instantânea de templates cadastrados.
  - Campo de Assunto condicional para o canal E-mail.
  - Textarea de visualização e edição direta da mensagem interpolada em tempo real com dados do lead.
  - Botão principal de envio via API (`bg-[#76ABAE] text-[#222831]`) com estado de loading e feedback toast.
  - Botão secundário "Abrir Web WhatsApp" como fallback manual caso a API esteja offline.
- **R-05 (Conexão nos Componentes Existentes):**
  - Disparo a partir dos botões de contato em `LeadTable.tsx` e `BentoOverview.tsx`.

### 1.3 Aba "Mensageria & Disparos" no Painel Admin

- **R-06 (MessagingTab & Sidebar Integration):**
  - Nova aba `MessagingTab.tsx` no `/admin` integrada na Sidebar com ícone `MessageSquare` ou `Send` e rótulo `"Mensageria & Disparos"`.
- **R-07 (Sub-aba 1: Gestor de Templates):**
  - Listagem, criação, edição e exclusão de templates em tabela/cards shadcn.
  - Chips interativos de variáveis clicáveis (`+ {{nome}}`, `+ {{ideia}}`, `+ {{local}}`, `+ {{data_agendamento}}`, `+ {{valor_sinal}}`) para inserção no cursor do texto.
- **R-08 (Sub-aba 2: Disparo em Massa / Campanhas):**
  - Filtro segmentado de leads (Todos, Novos, Contatados, Agendados, Por Local).
  - Seleção de templates de promoção.
  - Envio em fila com medidor de progresso visual (`Progress` do shadcn) e contador de sucesso/falha.
- **R-09 (Sub-aba 3: Configurações de Conexão & Histórico):**
  - Formulário para credenciais da Evolution API com botão "Testar Conexão WhatsApp".
  - Formulário para credenciais SMTP com botão "Testar Envio de E-mail".
  - Tabela com histórico de mensagens disparadas (`MessageLog`) com status `sent` / `failed` e detalhes de erro.

---

## 2. Non-Functional Requirements

- **NFR-01 (Design & Consistência Visual):** Padrão dark editorial do painel (`#222831`, `#31363f`, `#76abae`, `#9be5ff`), utilizando componentes oficiais do shadcn (`Dialog`, `Tabs`, `Table`, `Input`, `Textarea`, `Button`, `Badge`, `Progress`, `Select`).
- **NFR-02 (Segurança & Permissões):** Todas as rotas de envio e configuração de mensageria protegidas por `isAuthorized(request)` com verificação timing-safe. Credenciais sensíveis salvas com segurança ou consumidas de variáveis de ambiente.
- **NFR-03 (Resiliência & Fallbacks):** Mensagens não devem falhar silenciosamente; logs detalhados de erro em caso de instabilidade da Evolution API ou SMTP; preservação do botão direto para WhatsApp Web como fallback operacional imediato.
- **NFR-04 (Qualidade de Código & Testes):** 100% de cobertura nos métodos puros de interpolação e conectores; todos os testes existentes e novos passando em `npm test`; build limpo em `npm run build`.
