import * as React from "react";
import {
  Send,
  MessageSquare,
  Mail,
  RefreshCw,
  ExternalLink,
  Sparkles,
  User,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { interpolateTemplate, sanitizeWhatsAppNumber } from "@/lib/messaging/engine";
import type { Lead } from "@/lib/db";
import type { MessageTemplate, Channel } from "@/lib/messaging/types";

interface QuickMessageModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  authKey: string;
  onMessageSent?: () => void;
}

export function QuickMessageModal({
  lead,
  isOpen,
  onClose,
  authKey,
  onMessageSent,
}: QuickMessageModalProps) {
  const [channel, setChannel] = React.useState<Channel>("whatsapp");
  const [templates, setTemplates] = React.useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [subject, setSubject] = React.useState<string>("");
  const [body, setBody] = React.useState<string>("");
  const [isSending, setIsSending] = React.useState<boolean>(false);

  // Mapeamento de dados do lead para interpolação
  const leadData = React.useMemo(() => {
    if (!lead) return {};
    return {
      nome: lead.name,
      client_name: lead.name,
      telefone: lead.phone,
      client_phone: lead.phone,
      email: lead.email,
      ideia: lead.message || "Tatuagem autoral sob medida",
      idea: lead.message || "Tatuagem autoral sob medida",
      local: lead.service || "Estúdio Privado em Palhoça",
      location: lead.service || "Estúdio Privado em Palhoça",
    };
  }, [lead]);

  // Carrega templates cadastrados
  const fetchTemplates = React.useCallback(async () => {
    if (!authKey) return;
    setIsLoadingTemplates(true);
    try {
      const response = await fetch("/api/messages/templates", {
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("[QuickMessageModal] Erro ao carregar templates:", err);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [authKey]);

  // Ao abrir o modal, busca templates
  React.useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  // Templates disponíveis para o canal atual
  const channelTemplates = React.useMemo(() => {
    return templates.filter((t) => t.channel === channel && t.active);
  }, [templates, channel]);

  // Aplica template ao corpo da mensagem
  const applyTemplate = React.useCallback(
    (template: MessageTemplate) => {
      setSelectedTemplateId(template.id);
      const interpolatedBody = interpolateTemplate(template.body, leadData);
      setBody(interpolatedBody);
      if (template.subject) {
        const interpolatedSubject = interpolateTemplate(template.subject, leadData);
        setSubject(interpolatedSubject);
      } else {
        setSubject("Karlos Art Tattoo — Ateliê Editorial");
      }
    },
    [leadData],
  );

  // Ao mudar lead ou canal, seleciona automaticamente o melhor template
  React.useEffect(() => {
    if (!isOpen || !lead) return;

    if (channelTemplates.length > 0) {
      // Prioridade: se o lead for novo -> template 'welcome'; se agendado -> 'booking_confirm'; senão primeiro
      const preferredCategory = lead.status === "agendado" ? "booking_confirm" : "welcome";
      const matched =
        channelTemplates.find((t) => t.category === preferredCategory) || channelTemplates[0];

      applyTemplate(matched);
    } else {
      setSelectedTemplateId("custom");
      if (channel === "whatsapp") {
        setBody(
          `Olá ${lead.name}! Aqui é o Karlos do ateliê Karlos Art Tattoo. Recebi sua mensagem sobre "${lead.message || "tatuagem autoral"}". Vamos alinhar seu projeto?`,
        );
      } else {
        setSubject("Karlos Art Tattoo — Proposta para seu projeto");
        setBody(
          `Olá ${lead.name},\n\nRecebi sua mensagem sobre "${lead.message || "tatuagem autoral"}". Gostaria de alinhar os detalhes da sua sessão.\n\nAtenciosamente,\nKarlos Art Tattoo`,
        );
      }
    }
  }, [isOpen, lead, channel, channelTemplates, applyTemplate]);

  // Link de fallback direto para WhatsApp Web
  const whatsAppWebLink = React.useMemo(() => {
    if (!lead?.phone) return "#";
    const sanitized = sanitizeWhatsAppNumber(lead.phone);
    return `https://wa.me/${sanitized}?text=${encodeURIComponent(body)}`;
  }, [lead?.phone, body]);

  // Disparo via API do backend
  const handleSend = async () => {
    if (!lead) return;
    if (!body.trim()) {
      toast.error("A mensagem não pode estar vazia.");
      return;
    }

    const recipient = channel === "whatsapp" ? lead.phone : lead.email;
    if (!recipient) {
      toast.error(`Destinatário sem ${channel === "whatsapp" ? "telefone" : "e-mail"} cadastrado.`);
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          channel,
          recipient,
          body,
          subject: channel === "email" ? subject : undefined,
          lead_id: lead.id,
          lead_name: lead.name,
          template_id: selectedTemplateId !== "custom" ? selectedTemplateId : undefined,
          variables_data: leadData,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar disparo no servidor");
      }

      toast.success(
        channel === "whatsapp"
          ? "Mensagem de WhatsApp enviada com sucesso via Evolution API!"
          : "E-mail enviado com sucesso via SMTP!",
        {
          description: `Destinatário: ${recipient}`,
        },
      );

      if (onMessageSent) {
        onMessageSent();
      }

      onClose();
    } catch (err: any) {
      console.error("[QuickMessageModal] Falha no disparo:", err);
      toast.error("Falha no disparo via API", {
        description: err.message || "Verifique se as instâncias e credenciais estão conectadas.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] bg-[#31363f] border border-white/10 text-[#eeeeee] p-6 shadow-2xl rounded-none">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#76abae] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#76abae]" /> MENSAGERIA RÁPIDA
            </span>
          </div>
          <DialogTitle className="text-base font-extrabold uppercase tracking-[0.18em] text-[#eeeeee] mt-1 flex items-center gap-2">
            Disparar Mensagem para o Lead
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9da5b4]">
            Envio automatizado com interpolação instantânea dos dados do cliente.
          </DialogDescription>

          {/* Dados Resumidos do Lead */}
          <div className="mt-3 bg-[#222831] border border-white/5 p-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs">
            <div className="flex items-center gap-1.5 text-[#eeeeee] font-semibold">
              <User className="w-3.5 h-3.5 text-[#76abae]" />
              <span>{lead.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#9da5b4] font-mono">
              <Phone className="w-3.5 h-3.5 text-[#76abae]" />
              <span>{lead.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#9da5b4]">
              <MapPin className="w-3.5 h-3.5 text-[#76abae]" />
              <span>{lead.service}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor de Canal (WhatsApp vs E-mail) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9da5b4]">
              Canal de Envio
            </label>
            <Tabs
              value={channel}
              onValueChange={(val) => setChannel(val as Channel)}
              className="w-full"
            >
              <TabsList className="w-full bg-[#222831] border border-white/10 rounded-none p-1 h-9">
                <TabsTrigger
                  value="whatsapp"
                  className="flex-1 text-xs uppercase font-bold tracking-wider data-[state=active]:bg-[#76abae] data-[state=active]:text-[#222831] text-[#9da5b4] rounded-none cursor-pointer gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="flex-1 text-xs uppercase font-bold tracking-wider data-[state=active]:bg-[#76abae] data-[state=active]:text-[#222831] text-[#9da5b4] rounded-none cursor-pointer gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  E-mail
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Seletor de Template */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9da5b4]">
                Selecionar Template Cadastrado
              </label>
              {isLoadingTemplates && (
                <span className="text-[10px] text-[#76abae] font-mono flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Carregando...
                </span>
              )}
            </div>

            <Select
              value={selectedTemplateId}
              onValueChange={(id) => {
                if (id === "custom") {
                  setSelectedTemplateId("custom");
                } else {
                  const found = channelTemplates.find((t) => t.id === id);
                  if (found) applyTemplate(found);
                }
              }}
            >
              <SelectTrigger className="w-full bg-[#222831] border border-white/10 text-xs text-[#eeeeee] rounded-none focus:ring-1 focus:ring-[#76abae]">
                <SelectValue placeholder="Escolha um modelo de mensagem..." />
              </SelectTrigger>
              <SelectContent className="bg-[#222831] border border-white/10 text-xs text-[#eeeeee] rounded-none">
                {channelTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id} className="cursor-pointer hover:bg-[#31363f]">
                    {tpl.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="cursor-pointer hover:bg-[#31363f]">
                  (Mensagem Personalizada / Manual)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo de Assunto (apenas E-mail) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9da5b4]">
                Assunto do E-mail
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Confirmação de Sessão — Karlos Art Tattoo"
                className="bg-[#222831] border border-white/10 text-xs text-[#eeeeee] rounded-none focus-visible:ring-1 focus-visible:ring-[#76abae]"
              />
            </div>
          )}

          {/* Textarea de Pré-visualização e Edição */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9da5b4]">
                Texto da Mensagem (Interpolado ao Vivo)
              </label>
              <span className="text-[10px] font-mono text-[#9da5b4]">
                {body.length} caracteres
              </span>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={7}
              className="bg-[#222831] border border-white/10 text-xs text-[#eeeeee] font-sans leading-relaxed rounded-none focus-visible:ring-1 focus-visible:ring-[#76abae] resize-y"
            />
          </div>

          {/* Dica de Contingência */}
          {channel === "whatsapp" && (
            <div className="flex items-center gap-2 p-2 bg-[#222831]/60 border border-white/5 text-[11px] text-[#9da5b4]">
              <AlertCircle className="w-3.5 h-3.5 text-[#76abae] shrink-0" />
              <span>
                Caso a Evolution API esteja desconectada, você pode utilizar o botão "WhatsApp Web" abaixo.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/10 pt-4">
          {/* Fallback WhatsApp Web */}
          {channel === "whatsapp" ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/10 bg-[#222831] hover:bg-[#222831]/80 text-[#eeeeee] hover:text-[#76abae] text-xs uppercase tracking-wider rounded-none gap-1.5 cursor-pointer"
            >
              <a href={whatsAppWebLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir WhatsApp Web
              </a>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSending}
              className="text-xs uppercase tracking-wider text-[#9da5b4] hover:text-[#eeeeee] hover:bg-white/5 rounded-none cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || !body.trim()}
              className="bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] font-bold text-xs uppercase tracking-wider rounded-none gap-2 cursor-pointer shadow-[0_0_12px_rgba(118,171,174,0.25)]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Enviar via API
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
