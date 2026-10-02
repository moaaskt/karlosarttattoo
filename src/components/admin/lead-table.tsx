import * as React from "react";
import { MessageSquare, Phone, Mail, Calendar, CheckCircle2, Clock, Archive, Sparkles, Filter } from "lucide-react";
import { ShimmerButton } from "@/components/ui/aceternity/shimmer-button";
import type { Lead } from "@/lib/db";

interface LeadTableProps {
  leads: Lead[];
  onStatusChange: (id: string, newStatus: Lead["status"]) => Promise<void>;
  onScheduleLead?: (lead: Lead) => void;
  isLoading?: boolean;
}

export function LeadTable({ leads, onStatusChange, onScheduleLead, isLoading }: LeadTableProps) {
  const [filter, setFilter] = React.useState<string>("todos");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const filteredLeads = React.useMemo(() => {
    if (filter === "todos") return leads;
    return leads.filter((l) => l.status === filter);
  }, [leads, filter]);

  const handleStatusUpdate = async (id: string, status: Lead["status"]) => {
    setUpdatingId(id);
    try {
      await onStatusChange(id, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const getWhatsAppLink = (lead: Lead) => {
    const rawNumber = lead.phone.replace(/\D/g, "");
    const cleanNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const initialMessage = `Olá ${lead.name}! Aqui é o Karlos da Karlos Art Tattoo. Recebi sua solicitação para ${lead.service}: "${lead.message || "sua ideia autoral"}". Vamos alinhar os detalhes da sua tatuagem autoral?`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(initialMessage)}`;
  };

  const getStatusBadge = (status: Lead["status"]) => {
    switch (status) {
      case "novo":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-[0.15em] bg-[#9be5ff]/10 text-[#9be5ff] border border-[#9be5ff]/30">
            <Sparkles className="w-3 h-3" /> NOVO
          </span>
        );
      case "contatado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-[0.15em] bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> CONTATADO
          </span>
        );
      case "agendado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-[0.15em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> AGENDADO
          </span>
        );
      case "arquivado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-[0.15em] bg-white/5 text-neutral-400 border border-white/10">
            <Archive className="w-3 h-3" /> ARQUIVADO
          </span>
        );
    }
  };

  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros de Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#9be5ff]" />
          <span className="text-xs uppercase font-bold tracking-[0.2em] text-neutral-400">
            Filtrar Leads:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "todos", label: "TODOS", count: leads.length },
            { id: "novo", label: "NOVOS", count: leads.filter((l) => l.status === "novo").length },
            { id: "contatado", label: "CONTATADOS", count: leads.filter((l) => l.status === "contatado").length },
            { id: "agendado", label: "AGENDADOS", count: leads.filter((l) => l.status === "agendado").length },
            { id: "arquivado", label: "ARQUIVADOS", count: leads.filter((l) => l.status === "arquivado").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-all cursor-pointer border ${
                filter === tab.id
                  ? "bg-[#9be5ff] text-[#070707] font-bold border-[#9be5ff] shadow-[0_0_12px_rgba(155,229,255,0.3)]"
                  : "bg-black/40 text-neutral-400 border-white/10 hover:border-white/30"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Tabela de Leads */}
      {isLoading ? (
        <div className="p-12 text-center border border-white/10 bg-black/40">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#9be5ff] border-r-2 border-r-transparent mb-3" />
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Carregando leads...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center border border-white/10 bg-black/40">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Nenhum lead encontrado neste status.
          </p>
          <p className="text-xs text-neutral-500 tracking-wider mt-1">
            Novos agendamentos enviados pelo site aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-[#0b0b0e] border border-white/10 p-5 transition-all hover:border-[#9be5ff]/40 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold uppercase tracking-[0.15em] text-white">
                    {lead.name}
                  </h3>
                  {getStatusBadge(lead.status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    {formatDate(lead.createdAt)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 bg-white/5 px-2 py-0.5 border border-white/5">
                    ID: {lead.id}
                  </span>
                </div>
              </div>

              {/* Informações de Contato e Atendimento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block">
                    WhatsApp / Telefone
                  </span>
                  <div className="flex items-center gap-2 text-white font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#9be5ff]" />
                    {lead.phone}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block">
                    E-mail
                  </span>
                  <div className="flex items-center gap-2 text-white">
                    <Mail className="w-3.5 h-3.5 text-[#9be5ff]" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block">
                    Local / Modalidade
                  </span>
                  <div className="text-white font-medium">
                    {lead.service}
                  </div>
                </div>
              </div>

              {/* Mensagem / Ideia Autoral */}
              {lead.message && (
                <div className="bg-black/60 border border-white/5 p-3 text-xs text-neutral-300 leading-relaxed font-sans">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#9be5ff]/80 block mb-1">
                    Ideia / Conceito:
                  </span>
                  "{lead.message}"
                </div>
              )}

              {/* Ações: Botão WhatsApp + Agendar + Seletor de Status */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Botão de Ação Direta no WhatsApp com ShimmerButton (D-04, D-12) */}
                  <a
                    href={getWhatsAppLink(lead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <ShimmerButton
                      background="#112217"
                      shimmerColor="#25D366"
                      className="!py-2.5 !px-5 text-[#25D366] border-[#25D366]/40 hover:border-[#25D366] hover:shadow-[0_0_20px_rgba(37,211,102,0.3)] !text-xs !tracking-[0.18em]"
                    >
                      <MessageSquare className="w-4 h-4 fill-[#25D366]" />
                      CONVERSAR NO WHATSAPP
                    </ShimmerButton>
                  </a>

                  {onScheduleLead && (
                    <button
                      onClick={() => onScheduleLead(lead)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase font-extrabold tracking-[0.18em] bg-[#9be5ff]/10 hover:bg-[#9be5ff]/20 text-[#9be5ff] border border-[#9be5ff]/30 transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      AGENDAR SESSÃO ↗
                    </button>
                  )}
                </div>

                {/* Alteração rápida de Status */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                    Alterar Status:
                  </span>
                  <select
                    value={lead.status}
                    disabled={updatingId === lead.id}
                    onChange={(e) => handleStatusUpdate(lead.id, e.target.value as Lead["status"])}
                    className="bg-black/80 border border-white/20 text-white text-xs px-3 py-2 outline-none focus:border-[#9be5ff] rounded-none cursor-pointer"
                  >
                    <option value="novo">Novo</option>
                    <option value="contatado">Contatado</option>
                    <option value="agendado">Agendado</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
