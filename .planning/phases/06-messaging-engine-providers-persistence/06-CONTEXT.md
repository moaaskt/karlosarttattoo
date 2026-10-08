# Phase 06: Messaging Engine, Multi-Channel Providers & Persistence — Context

**Data:** 2026-10-08  
**Milestone:** v2.1  
**Fase:** 06  
**Status:** Pronto para Execução  

---

## 🎯 1. Domínio & Fronteiras da Fase

A **Fase 06** estabelece a infraestrutura técnica central de mensageria para o ateliê Karlos Art Tattoo:
- **Camada de Tipagem & Motor de Interpolação (`src/lib/messaging/`):**
  - Módulos puros `types.ts` e `engine.ts`.
  - Interpolação dinâmica de variáveis com sintaxe mustache (`{{nome}}`, `{{ideia}}`, `{{local}}`, `{{data_agendamento}}`, `{{valor_sinal}}`, etc.).
  - Catálogo de templates padrão com categorias especializadas (`welcome`, `deposit_request`, `booking_confirm`, `reminder`, `post_care`, `promo`).
- **Conectores de Envio Multi-Canal (`src/server/lib/messaging-service.ts`):**
  - **WhatsApp (Evolution API v2):** Conexão REST nativa para envio de texto (`POST {evolutionUrl}/message/sendText/{instanceName}`) com headers `{ apikey, 'Content-Type': 'application/json' }`, sanitização de telefone internacional (prefixo 55, sem formatação, remoção de caracteres inválidos).
  - **E-mail (SMTP):** Conexão via `nodemailer` com credenciais configuráveis (Host, Port, User, Pass, From) e suporte a fallback de variáveis de ambiente.
  - Testes de conexão de instâncias (verificação de status da Evolution API e verificação de transporte SMTP).
- **Persistência Relacional em SQLite WAL (`src/lib/db.ts`):**
  - Tabela `message_templates`: Armazenamento de templates personalizados e padrão.
  - Tabela `message_logs`: Registro imutável de mensagens disparadas com status (`sent` | `failed`), canal, destinatário, lead_id e mensagem de erro.
  - Tabela `messaging_settings`: Armazenamento de configurações e credenciais dinâmicas com fallback para o `.env`.
- **Rotas de API REST Seguras (`src/server/api/messages.ts` despachadas em `src/server.ts`):**
  - `GET /api/messages/templates` e `POST /api/messages/templates`
  - `PATCH /api/messages/templates/:id` e `DELETE /api/messages/templates/:id`
  - `POST /api/messages/send` (envio individual ou contextualizado por lead)
  - `POST /api/messages/test-connection` (validação de credenciais e instâncias ativas)
  - `GET /api/messages/logs` (histórico de auditoria)
  - `GET /api/messages/config` e `PATCH /api/messages/config`
  - Todas as rotas protegidas por autenticação timing-safe `isAuthorized(request)`.

---

## 🔒 2. Decisões Arquiteturais Fechadas (D-01 a D-07)

### D-01 — Estratégia de Dependências de Mensageria
- **WhatsApp**: Usar chamadas HTTP REST nativas (`fetch`) diretamente para a **Evolution API v2** sem SDKs pesados de terceiros, garantindo compatibilidade direta com a documentação oficial da Evolution API v2 (`/message/sendText/{instanceName}`).
- **E-mail**: Adicionar `nodemailer` e `@types/nodemailer` para gerenciar transporte SMTP com suporte a TLS/SSL e autenticação segura.

### D-02 — Sanitização e Formatação de Telefones
- Telefones destinados ao WhatsApp devem passar por sanitização rígida:
  - Extrair apenas dígitos.
  - Remover zero inicial do DDD (ex: `048...` $\rightarrow$ `48...`).
  - Garantir o DDI do Brasil (`55`) para números com 10 ou 11 dígitos.
  - Nunca duplicar `55` se o número já iniciar com ele.
  - Exemplo: `"(48) 99123-4567"` $\rightarrow$ `"5548991234567"`.

### D-03 — Mecanismo de Interpolação de Tags
- A função pura `interpolateTemplate(template: string, data: Record<string, any>): string` deve:
  - Substituir ocorrências no formato `{{chave}}` ou `{{ chave }}` (case-insensitive para tolerância a variações do usuário).
  - Se a variável não estiver presente em `data`, substituir por string vazia ou manter formatado sem quebrar a execução.
  - Suportar campos específicos de leads e agendamentos: `nome`, `telefone`, `email`, `ideia`, `local`, `estilo`, `data_agendamento`, `horario_agendamento`, `valor_total`, `valor_sinal`.

### D-04 — Esquema de Persistência no SQLite (`src/lib/db.ts`)
- Utilizar tabelas relacionais com índices adequados:
  ```sql
  CREATE TABLE IF NOT EXISTS message_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    variables TEXT NOT NULL, -- JSON array
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS message_logs (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    lead_name TEXT,
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sent' | 'failed'
    error TEXT,
    payload TEXT,
    sent_at TEXT NOT NULL
  );
  ```
- Seed automático: na inicialização do banco, se `message_templates` estiver vazia, inserir automaticamente os 5 templates padrão de fábrica.

### D-05 — Segurança & Chaves de Acesso
- Todas as rotas de API em `/api/messages/*` exigem verificação `isAuthorized(request)` (Bearer Token ou cookie administrativo).
- As configurações de envio (URL da Evolution, API Key, instância, host SMTP, senha SMTP) podem ser lidas de:
  1. `messaging_settings` no banco SQLite (caso o usuário configure diretamente pela interface).
  2. Variáveis de ambiente no `.env`:
     - `EVOLUTION_API_URL`
     - `EVOLUTION_API_KEY`
     - `EVOLUTION_INSTANCE_NAME`
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `SMTP_USER`
     - `SMTP_PASS`
     - `SMTP_FROM`

### D-06 — Resiliência Operacional & Tratamento de Erros
- Toda tentativa de envio (`POST /api/messages/send`) registra um registro na tabela `message_logs`, independente de sucesso ou falha.
- Se o envio para a Evolution API ou SMTP falhar, o log registra `status: 'failed'` com a mensagem exata do erro, e a API retorna status `502 Bad Gateway` com payload descritivo para que o frontend exiba feedback claro via toast.

### D-07 — Compatibilidade e Testes
- Criar suíte de testes unitários isolada (`src/test/messaging.test.ts`) cobrindo:
  - Interpolação de templates com e sem variáveis preenchidas.
  - Sanitização de números de telefone para WhatsApp.
  - Persistência e operações CRUD de templates no banco SQLite em memória (`:memory:`).
  - Registro de logs de auditoria.
  - Contratos de autorização HTTP (401 se sem token, 200/201 quando autorizado).
