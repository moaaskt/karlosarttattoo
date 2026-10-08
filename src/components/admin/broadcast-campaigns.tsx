import * as React from "react";
import {
  Send,
  Users,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
  Filter,
  CheckSquare,
  Square as SquareEmpty,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { interpolateTemplate } from "@/lib/messaging/engine";
import type { Lead } from "@/lib/db";
import type { MessageTemplate, Channel } from "@/lib/messaging/types";

interface BroadcastCampaignsProps {
  leads: Lead[];
  authKey: string;
  onBroadcastComplete?: () => void;
}

export function BroadcastCampaigns({
  leads,
  authKey,
  onBroadcastComplete,
}: BroadcastCampaignsProps) {
  const [channel, setChannel] = React.useState<Channel>("whatsapp");
  const [templates, setTemplates] = React.useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("custom");
  const [subject, setSubject] = React.useState<string>("Novidades & Vagas na Agenda — Karlos Art Tattoo");
  const [messageBody, setMessageBody] = React.useState<string>(
    "Olá {{primeiro_nome}}, tudo certo? Karlos por aqui! 🎨⚡\n\nPassando para avisar que abri novas datas na agenda deste mês para projetos autorais em fine line.\n\nSe você quiser aproveitar para tirar sua ideia do papel, me responda aqui para vermos os melhores horários!",
  );

  // Filtros de leads
  const [statusFilter, setStatusFilter] = React.useState<string>("todos");
  const [selectedLeadIds, setSelectedLeadIds] = React.useState<Set<string>>(new Set());

  // Estado da execução do broadcast
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = React.useState<boolean>(false);
  const [shouldAbort, setShouldAbort] = React.useState<boolean>(false);
  const [broadcastProgress, setBroadcastProgress] = React.useState({
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
  });

  // Carrega templates disponíveis
  React.useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/messages/templates", {
          headers: {
            Authorization: `Bearer ${authKey}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error("[BroadcastCampaigns] Erro ao carregar templates:", err);
      }
    }
    loadTemplates();
  }, [authKey]);

  // Filtra leads de acordo com o status
  const filteredLeads = React.useMemo(() => {
    if (statusFilter === "todos") return leads;
    return leads.filter((l) => l.status === statusFilter);
  }, [leads, statusFilter]);

  // Inicializa seleção padrão com os filtrados
  React.useEffect(() => {
    setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
  }, [filteredLeads]);

  // Ao selecionar um template da lista
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "custom") return;

    const matched = templates.find((t) => t.id === templateId);
    if (matched) {
      setChannel(matched.channel);
      setMessageBody(matched.body);
      if (matched.subject) {
        setSubject(matched.subject);
      }
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const leadsToSend = React.useMemo(() => {
    return filteredLeads.filter((l) => selectedLeadIds.has(l.id));
  }, [filteredLeads, selectedLeadIds]);

  const handleStartBroadcast = async () => {
    setIsConfirmModalOpen(false);
    if (leadsToSend.length === 0) {
      toast.error("Nenhum cliente selecionado para envio.");
      return;
    }

    setIsBroadcasting(true);
    setShouldAbort(false);
    setBroadcastProgress({
      total: leadsToSend.length,
      current: 0,
      success: 0,
      failed: 0,
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < leadsToSend.length; i++) {
      if (shouldAbort) {
        toast.info("Disparo em massa interrompido pelo usuário.");
        break;
      }

      const targetLead = leadsToSend[i];
      const recipient = channel === "whatsapp" ? targetLead.phone : targetLead.email;

      if (!recipient) {
        failCount++;
        setBroadcastProgress({
          total: leadsToSend.length,
          current: i + 1,
          success: successCount,
          failed: failCount,
        });
        continue;
      }

      const leadData = {
        nome: targetLead.name,
        primeiro_nome: targetLead.name.split(" ")[0],
        telefone: targetLead.phone,
        email: targetLead.email,
        local: targetLead.service,
        ideia: targetLead.message || "tatuagem autoral",
      };

      const interpolatedText = interpolateTemplate(messageBody, leadData);
      const interpolatedSubject = channel === "email" ? interpolateTemplate(subject, leadData) : undefined;

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
            body: interpolatedText,
            subject: interpolatedSubject,
            lead_id: targetLead.id,
            lead_name: targetLead.name,
            variables_data: leadData,
          }),
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setBroadcastProgress({
        total: leadsToSend.length,
        current: i + 1,
        success: successCount,
        failed: failCount,
      });

      // Intervalo de segurança anti-spam e estabilidade de conexão (500ms)
      if (i < leadsToSend.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsBroadcasting(false);

    toast.success("Campanha finalizada!", {
      description: `${successCount} mensagens enviadas com sucesso, ${failCount} falhas.`,
    });

    if (onBroadcastComplete) {
      onBroadcastComplete();
    }
  };

  const progressPercent =
    broadcastProgress.total > 0
      ? Math.round((broadcastProgress.current / broadcastProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Bloco de Progresso Ativo durante Disparo */}
      {isBroadcasting && (
        <div className="bg-[#222831] border border-[#76abae] p-5 shadow-[0_0_24px_rgba(118,171,174,0.2)] space-y-4 animate-pulse-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#eeeeee]">
                Disparando Campanha em Massa ({progressPercent}%)
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShouldAbort(true)}
              className="border-rose-500/40 text-rose-400 hover:bg-rose-950/40 text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 mr-1" />
              Parar Envio
            </Button>
          </div>

          <Progress value={progressPercent} className="h-2.5 bg-[#31363f]" />

          <div className="flex flex-wrap items-center justify-between text-xs text-[#9da5b4]">
            <span>
              Processando: <strong className="text-white">{broadcastProgress.current}</strong> de{" "}
              {broadcastProgress.total} clientes
            </span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-400 font-mono">
                Sucessos: {broadcastProgress.success}
              </span>
              <span className="text-rose-400 font-mono">
                Falhas: {broadcastProgress.failed}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grade de Configuração da Campanha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Filtro e Seleção do Público (5 Colunas) */}
        <div className="lg:col-span-5 space-y-4 bg-[#31363f] border border-white/10 p-5">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs uppercase font-extrabold tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#76abae]" />
              1. Selecionar Destinatários
            </h3>
            <p className="text-[11px] text-[#9da5b4] mt-0.5">
              Escolha os clientes que receberão a mensagem da campanha
            </p>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "todos", label: "TODOS" },
              { id: "novo", label: "NOVOS" },
              { id: "contatado", label: "CONTATADOS" },
              { id: "agendado", label: "AGENDADOS" },
            ].map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={statusFilter === f.id ? "default" : "outline"}
                onClick={() => setStatusFilter(f.id)}
                className={`text-[10px] uppercase font-bold tracking-wider h-7 px-2.5 rounded-none cursor-pointer border ${
                  statusFilter === f.id
                    ? "bg-[#76abae] text-[#222831] border-[#76abae]"
                    : "bg-[#222831] text-[#9da5b4] border-white/10 hover:text-white"
                }`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Contador e Selecionar Todos */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <Button
              type="button"
              variant="link"
              onClick={toggleSelectAll}
              className="p-0 h-auto text-[11px] uppercase tracking-wider text-[#76abae] hover:underline cursor-pointer flex items-center gap-1"
            >
              {selectedLeadIds.size === filteredLeads.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Desmarcar Todos
                </>
              ) : (
                <>
                  <SquareEmpty className="w-3.5 h-3.5" /> Selecionar Todos
                </>
              )}
            </Button>
            <span className="text-[11px] font-mono text-[#9be5ff]">
              {selectedLeadIds.size} de {filteredLeads.length} selecionados
            </span>
          </div>

          {/* Lista com Checkboxes */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-white/5 bg-[#222831] p-2">
            {filteredLeads.length === 0 ? (
              <div className="text-center p-6 text-xs text-[#9da5b4]">
                Nenhum lead com o status selecionado.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLeadIds.has(lead.id);
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggleLeadSelection(lead.id)}
                    className={`flex items-center justify-between p-2 text-xs border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#31363f] border-[#76abae]/50 text-[#eeeeee]"
                        : "bg-transparent border-white/5 text-[#9da5b4] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded-none accent-[#76abae] cursor-pointer"
                      />
                      <div>
                        <div className="font-bold uppercase tracking-wider text-[11px] text-[#eeeeee]">
                          {lead.name}
                        </div>
                        <div className="text-[10px] text-[#9da5b4] font-mono">
                          {channel === "whatsapp" ? lead.phone : lead.email}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Conteúdo da Mensagem e Disparo (7 Colunas) */}
        <div className="lg:col-span-7 space-y-4 bg-[#31363f] border border-white/10 p-5">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs uppercase font-extrabold tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9be5ff]" />
              2. Configurar Mensagem da Campanha
            </h3>
            <p className="text-[11px] text-[#9da5b4] mt-0.5">
              Escolha um modelo existente ou redija uma mensagem personalizada
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Canal */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                Canal de Envio
              </label>
              <Select
                value={channel}
                onValueChange={(val) => setChannel(val as Channel)}
              >
                <SelectTrigger className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#222831] border-white/15 text-[#eeeeee]">
                  <SelectItem value="whatsapp">WhatsApp (Evolution API v2)</SelectItem>
                  <SelectItem value="email">E-mail (SMTP Nodemailer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template Modelo */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                Modelo Base
              </label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#222831] border-white/15 text-[#eeeeee]">
                  <SelectItem value="custom">Mensagem Personalizada</SelectItem>
                  {templates
                    .filter((t) => t.channel === channel)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assunto se canal for E-mail */}
          {channel === "email" && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9be5ff]">
                Assunto do E-mail
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto da campanha..."
                className="bg-[#222831] border-[#9be5ff]/30 text-xs text-[#eeeeee] rounded-none"
              />
            </div>
          )}

          {/* Texto da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                Texto da Campanha
              </label>
              <span className="text-[10px] text-[#9da5b4] font-mono">
                {messageBody.length} caracteres
              </span>
            </div>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={7}
              placeholder="Digite a mensagem da campanha..."
              className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] focus:border-[#76abae] rounded-none font-sans leading-relaxed resize-y"
            />
          </div>

          <div className="p-3 bg-[#222831] border border-white/5 text-[11px] text-[#9da5b4] space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#76abae]">
              Interpolação de Tags Dinâmicas:
            </div>
            <p>
              As tags <code className="text-[#eeeeee]">{`{{primeiro_nome}}`}</code>,{" "}
              <code className="text-[#eeeeee]">{`{{ideia}}`}</code> e{" "}
              <code className="text-[#eeeeee]">{`{{local}}`}</code> serão preenchidas com os
              dados de cada cliente durante a fila de disparo.
            </p>
          </div>

          {/* Botão de Disparo */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-[#9da5b4]">
              Destinatários prontos:{" "}
              <strong className="text-[#9be5ff] font-mono">{leadsToSend.length}</strong>
            </span>
            <Button
              type="button"
              disabled={leadsToSend.length === 0 || !messageBody.trim() || isBroadcasting}
              onClick={() => setIsConfirmModalOpen(true)}
              className="bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] font-extrabold uppercase tracking-widest text-xs h-10 px-6 rounded-none cursor-pointer shadow-[0_0_12px_rgba(118,171,174,0.3)] transition-all"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Disparo em Massa
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Disparo */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md bg-[#222831] border border-[#76abae]/50 text-[#eeeeee] p-6 rounded-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold uppercase tracking-wider text-[#76abae] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Confirmar Campanha em Massa
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9da5b4] space-y-2">
              <span>
                Você está prestes a disparar esta mensagem para{" "}
                <strong className="text-white font-mono">{leadsToSend.length}</strong> clientes via{" "}
                <strong className="text-white uppercase">{channel}</strong>.
              </span>
              <p className="text-[11px] text-amber-300/90 pt-1">
                Certifique-se de que a instância da Evolution API ou servidor SMTP estejam ativos
                para evitar bloqueios ou atrasos.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
              className="border-white/10 text-xs uppercase tracking-wider rounded-none cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleStartBroadcast}
              className="bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] text-xs uppercase font-extrabold tracking-wider rounded-none cursor-pointer"
            >
              Confirmar e Iniciar Fila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
