import * as React from "react";
import { ArrowRight, Phone, Mail, Calendar, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, InfoBadge } from "@/components/ui/status-badge";
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
            {
              id: "contatado",
              label: "CONTATADOS",
              count: leads.filter((l) => l.status === "contatado").length,
            },
            {
              id: "agendado",
              label: "AGENDADOS",
              count: leads.filter((l) => l.status === "agendado").length,
            },
            {
              id: "arquivado",
              label: "ARQUIVADOS",
              count: leads.filter((l) => l.status === "arquivado").length,
            },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={filter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.id)}
              className={`text-[11px] uppercase tracking-[0.18em] transition-all cursor-pointer rounded-none h-7 px-3 border ${
                filter === tab.id
                  ? "bg-[#9be5ff] text-[#070707] font-bold border-[#9be5ff] shadow-[0_0_12px_rgba(155,229,255,0.3)] hover:bg-[#82d9f7]"
                  : "bg-black/40 text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </Button>
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
                  <StatusBadge status={lead.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    {formatDate(lead.createdAt)}
                  </span>
                  <InfoBadge type="id">{lead.id}</InfoBadge>
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
                  <div className="text-white font-medium">{lead.service}</div>
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
                  {/* Botão de Ação Direta no WhatsApp */}
                  <Button
                    asChild
                    className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    <a href={getWhatsAppLink(lead)} target="_blank" rel="noopener noreferrer">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="w-4 h-4 text-white fill-current transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Conversar no WhatsApp
                    </a>
                  </Button>

                  {onScheduleLead && (
                    <Button
                      onClick={() => onScheduleLead(lead)}
                      className="group flex items-center gap-2 bg-slate-100 text-slate-900 hover:bg-white font-medium shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      Agendar sessão
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
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
