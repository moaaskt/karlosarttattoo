# Phase 07: Quick Message Modal & Leads Action Integration — Context

**Data:** 2026-10-08  
**Milestone:** v2.1  
**Fase:** 07  
**Status:** Pronto para Planejamento  

---

## 🎯 1. Domínio & Fronteiras da Fase

A **Fase 07** conecta o motor de mensageria construído na Fase 06 diretamente ao fluxo de trabalho operacional diário do Karlos Art Tattoo no `/admin`:
- **Modal de Disparo Rápido (`QuickMessageModal.tsx`)**:
  - Diálogo modal centralizado baseado no `Dialog` oficial do shadcn/ui.
  - Alternância imediata de canal entre **WhatsApp** e **E-mail** via `Tabs` do shadcn.
  - Carregamento assíncrono dos templates pré-cadastrados via `GET /api/messages/templates`.
  - Dropdown `Select` para escolha do template desejado.
  - Interpolação ao vivo das variáveis com base nos dados do lead selecionado (`nome`, `telefone`, `email`, `ideia`, `local`).
  - Textarea (`Textarea` do shadcn) permitindo revisão ou personalização do texto antes do envio.
  - Ação primária "Enviar via API" chamando `POST /api/messages/send` com loading, feedback via toast (`sonner`) e registro automático no banco.
  - Botão secundário "Abrir WhatsApp Web" como fallback manual caso o ateliê prefira enviar diretamente pelo navegador ou caso a API esteja sem saldo/instância conectada.
- **Integração nas Interfaces Existentes**:
  - **`LeadTable.tsx`**: Substituição do botão direto simples pelo acionamento do `QuickMessageModal`.
  - **`BentoOverview.tsx`**: Ação rápida nos cartões de "Últimos Orçamentos Recebidos" para abrir o modal de disparo sem precisar navegar até a aba de Leads.

---

## 🔒 2. Decisões Arquiteturais Fechadas (D-01 a D-05)

### D-01 — Componentes Oficiais shadcn/ui
- O modal deve utilizar exclusivamente os componentes shadcn existentes em `src/components/ui/`:
  - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`.
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
  - `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`.
  - `Textarea`, `Input`, `Button`, `Badge`.
  - Notificações via `toast` do `sonner`.
- Paleta dark editorial idêntica ao painel: `#222831` (fundo), `#31363f` (superfícies), `#76abae` (destaques/botões primários), `#9be5ff` (acentos ciano) e bordas `border-white/10`.

### D-02 — Interpolação em Tempo Real no Cliente
- Quando o usuário seleciona um template no dropdown, o componente invoca `interpolateTemplate(template.body, leadData)` no cliente e preenche o `Textarea`.
- O Karlos pode editar livremente o texto antes de enviar. O texto editado é o que será enviado no corpo da requisição para `POST /api/messages/send`.

### D-03 — Duplo Canal (WhatsApp e E-mail)
- Na aba **WhatsApp**: O destinatário exibe o telefone do lead formatado. O campo de assunto fica oculto.
- Na aba **E-mail**: O destinatário exibe o e-mail do lead. O campo de assunto (`Input`) é exibido e interpolado.

### D-04 — Resiliência Operacional & Fallback
- O modal sempre fornece o botão de contingência "Abrir WhatsApp Web" gerado com `https://wa.me/{numero}?text={mensagem}`, garantindo que o tatuador nunca fique travado caso a Evolution API esteja momentaneamente desconectada.
- Em caso de falha de envio pela API (`502 Bad Gateway`), o modal exibe toast de erro detalhado e mantém o texto no textarea para que o usuário não perca a mensagem escrita.

### D-05 — Gerenciamento de Estado
- Um único estado `selectedLeadForMessage: Lead | null` no componente pai (`admin.tsx` ou compartilhado) orquestra a abertura do modal a partir de qualquer ponto (tabela de leads ou dashboard Bento).
