# Contexto da Fase 08: Messaging Administration Hub & Quality Assurance

**Milestone:** v2.1 — Módulo Completo de Mensageria Automatizada  
**Fase:** 08 — Messaging Administration Hub & Quality Assurance  
**Data:** 08/10/2026  
**Status:** Planejamento Concluído  

---

## 1. Visão Geral e Propósito

A Fase 08 consolida o centro de comando administrativo de mensagens no Painel do Karlos Art Tattoo (`/admin`). Ela fornece ao tatuador uma interface unificada e profissional com 3 pilares essenciais:
1. **Gestor Visual de Templates**: Criar, customizar e organizar mensagens com chips inteligentes de tags dinâmicas (`{{primeiro_nome}}`, `{{ideia}}`, `{{local}}`, etc.) e preview realista.
2. **Campanhas de Disparo em Massa**: Filtrar leads por interesse/status (ex: novos leads para boas-vindas, agendados para confirmação, contatados para flash day) e disparar em sequência com barra de progresso visual shadcn.
3. **Configurações de Conexão & Auditoria de Logs**: Gerenciar as credenciais da Evolution API v2 e do SMTP Nodemailer com botões de teste instantâneo de conectividade e histórico completo de envios (`sent` / `failed`).

---

## 2. Decisões Arquiteturais e de Design

- **Identidade Visual**: Dark editorial e neon sutil (`#222831`, `#31363f`, `#76abae`, `#9be5ff`), em total consonância com as outras abas do painel (`BentoOverview`, `AgendaTab`, `AnalyticsTab`).
- **Componentes Oficiais shadcn/ui**:
  - `Tabs` e `TabsList`: alternância elegante entre as 3 sub-áreas ("Templates", "Disparo em Massa", "Conexão & Histórico").
  - `Card`, `CardHeader`, `CardContent`: agrupamento dos blocos de credenciais e formulários.
  - `Progress`: indicador animado de progresso durante os disparos em massa.
  - `Badge` e `StatusBadge`: identificação visual de canais (WhatsApp verde / E-mail ciano) e status de envio (Enviado / Falha).
  - `Dialog`: modal de criação/edição de templates e modal de confirmação de campanhas.
  - `Input`, `Textarea`, `Button`, `Switch`, `Select`: controle de formulários robustos e acessíveis.
- **Segurança**:
  - Todas as chamadas para a API usam a chave administrativa (`Authorization: Bearer <authKey>`).
  - As senhas e API Keys são exibidas mascaradas e salvas com segurança no banco SQLite (`messaging_settings`).
- **Resiliência**:
  - Os testes de conexão informam o status real do servidor (Evolution API v2 e SMTP).
  - Disparos em massa iteram com intervalo seguro e atualizam o log em tempo real sem travar a interface do navegador.

---

## 3. Estrutura de Arquivos da Fase

- `src/components/admin/messaging-tab.tsx`: Componente principal da aba com o menu em tabs.
- `src/components/admin/templates-manager.tsx`: Sub-componente do Gestor de Templates com inserção de chips e preview.
- `src/components/admin/broadcast-campaigns.tsx`: Sub-componente de seleção de público e barra de progresso de envio em lote.
- `src/components/admin/messaging-settings-logs.tsx`: Sub-componente de credenciais, testes de ping e tabela de histórico.
- `src/routes/admin.tsx`: Integração da nova aba na Sidebar do Aceternity e no switch de abas da página administrativa.
- `src/test/messaging-admin.test.ts`: Testes automatizados das operações de configuração, batch broadcast e logs.
