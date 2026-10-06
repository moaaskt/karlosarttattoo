import * as React from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
  RotateCcw,
  Sparkles,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  apiFetch,
  centsToDisplay,
  displayToCents,
  formatWhatsAppPhone,
  getErrorMessage,
} from "../../../lib/api-client";
import {
  STATUS_COLOR,
  DEPOSIT_BORDER,
  SESSION_TYPE_LABEL,
  VALID_TRANSITIONS,
  utcToLocal,
} from "../../../lib/agenda-utils";
import type { Booking, BookingEvent } from "../../../lib/db";

export interface BookingDrawerProps {
  bookingId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onReschedule: (booking: Booking) => void;
  timezone?: string;
}

export function BookingDrawer({
  bookingId,
  onClose,
  onRefresh,
  onReschedule,
  timezone = "America/Sao_Paulo",
}: BookingDrawerProps) {
  const [booking, setBooking] = React.useState<(Booking & { events: BookingEvent[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Estados dos campos de edição
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editLocation, setEditLocation] = React.useState<Booking["location"]>("estudio");
  const [editSessionType, setEditSessionType] = React.useState<Booking["session_type"]>("tatuagem");
  const [editPriceDisplay, setEditPriceDisplay] = React.useState("");
  const [editDepositDisplay, setEditDepositDisplay] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");

  // Confirmação para cancelamento com sinal pago
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  // Busca agendamento completo com histórico
  const fetchBooking = React.useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{
          success?: boolean;
          booking?: Booking & { events: BookingEvent[] };
        }>(`/api/bookings/${id}`);
        if (res.ok && res.data?.booking) {
          const b = res.data.booking;
          setBooking(b);
          setEditName(b.client_name);
          setEditPhone(b.client_phone);
          setEditEmail(b.client_email || "");
          setEditLocation(b.location);
          setEditSessionType(b.session_type);
          setEditPriceDisplay(
            b.price_total_cents ? (b.price_total_cents / 100).toFixed(2).replace(".", ",") : "0,00",
          );
          setEditDepositDisplay(
            b.deposit_cents ? (b.deposit_cents / 100).toFixed(2).replace(".", ",") : "0,00",
          );
          setEditNotes(b.notes || "");
        } else {
          toast.error("Erro ao carregar dados do agendamento.");
          onClose();
        }
      } catch {
        toast.error("Falha de conexão com a API.");
      } finally {
        setIsLoading(false);
      }
    },
    [onClose],
  );

  React.useEffect(() => {
    if (bookingId) {
      fetchBooking(bookingId);
    } else {
      setBooking(null);
    }
  }, [bookingId, fetchBooking]);

  if (!bookingId || !booking) {
    return null;
  }

  // Conversão de datas para fuso local
  const localStart = utcToLocal(booking.start_at, timezone);
  const localEnd = utcToLocal(booking.end_at, timezone);

  // 1. Mudança de status do agendamento
  const handleStatusChange = async (
    newStatus: Booking["status"],
    depositAction?: "retido" | "devolvido",
  ) => {
    if (newStatus === "confirmado" && booking.deposit_status === "pendente") {
      toast.error(getErrorMessage("deposit_required"));
      return;
    }

    if (newStatus === "cancelado" && booking.deposit_status === "pago" && !depositAction) {
      setShowCancelConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ success?: boolean; error?: string; message?: string }>(
        `/api/bookings/${booking.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, depositAction }),
        },
      );

      if (res.ok) {
        toast.success(`Status alterado para ${newStatus}.`);
        await fetchBooking(booking.id);
        onRefresh();
      } else {
        toast.error(res.data?.message || getErrorMessage(res.data?.error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Mudança no status do sinal
  const handleDepositStatusChange = async (newDepositStatus: Booking["deposit_status"]) => {
    if (booking.status === "confirmado" && newDepositStatus === "pendente") {
      toast.warning(
        "Agendamento confirmado exige sinal pago ou dispensado. Altere o status primeiro.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ success?: boolean; error?: string; message?: string }>(
        `/api/bookings/${booking.id}/deposit`,
        {
          method: "PATCH",
          body: JSON.stringify({ deposit_status: newDepositStatus }),
        },
      );

      if (res.ok) {
        toast.success(`Status do sinal alterado para ${newDepositStatus}.`);
        await fetchBooking(booking.id);
        onRefresh();
      } else {
        toast.error(res.data?.message || getErrorMessage(res.data?.error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Salvar alterações de dados cadastrais (TASK-05b)
  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();

    let priceCents: number;
    let depositCents: number;

    try {
      priceCents = displayToCents(editPriceDisplay || "0");
      depositCents = displayToCents(editDepositDisplay || "0");
    } catch (err: any) {
      toast.error(err.message || "Valor financeiro inválido.");
      return;
    }

    // Identifica estritamente apenas os campos alterados (Regra 10)
    const patch: Record<string, any> = {};
    if (editName.trim() !== booking.client_name) patch.client_name = editName.trim();
    if (editPhone.trim() !== booking.client_phone) patch.client_phone = editPhone.trim();
    if ((editEmail.trim() || null) !== (booking.client_email || null))
      patch.client_email = editEmail.trim() || null;
    if (editLocation !== booking.location) patch.location = editLocation;
    if (editSessionType !== booking.session_type) patch.session_type = editSessionType;
    if (priceCents !== booking.price_total_cents) patch.price_total_cents = priceCents;
    if (depositCents !== booking.deposit_cents) patch.deposit_cents = depositCents;
    if ((editNotes.trim() || null) !== (booking.notes || null))
      patch.notes = editNotes.trim() || null;

    if (Object.keys(patch).length === 0) {
      toast.info("Nenhuma alteração detectada.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ success?: boolean; error?: string; message?: string }>(
        `/api/bookings/${booking.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        },
      );

      if (res.ok) {
        toast.success("Dados do agendamento atualizados com sucesso!");
        await fetchBooking(booking.id);
        onRefresh();
      } else {
        toast.error(res.data?.message || getErrorMessage(res.data?.error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedTransitions = VALID_TRANSITIONS[booking.status] ?? [];
  const isTerminal =
    booking.status === "cancelado" ||
    booking.status === "no_show" ||
    booking.status === "concluido";
  const whatsappUrl = `https://wa.me/${formatWhatsAppPhone(booking.client_phone)}?text=${encodeURIComponent(
    `Olá ${booking.client_name}, aqui é o Karlos do ateliê Karlos Art Tattoo sobre sua sessão no dia ${localStart.date}!`,
  )}`;

  return (
    <>
      {/* Overlay escuro em telas menores */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:bg-black/30"
      />

      {/* Drawer Lateral */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#31363f] border-l border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-white/10 bg-[#222831]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[booking.status] }}
              />
              <span className="text-xs font-bold uppercase tracking-widest text-[#76abae]">
                Agendamento #{booking.id.slice(-6)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-[#9da5b4] hover:text-[#eeeeee] transition-colors cursor-pointer rounded-none"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-[#eeeeee]">
              {booking.client_name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-white rounded">
                {SESSION_TYPE_LABEL[booking.session_type]}
              </span>
              <span
                className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded border"
                style={{
                  backgroundColor: `${STATUS_COLOR[booking.status]}20`,
                  color: STATUS_COLOR[booking.status],
                  borderColor: STATUS_COLOR[booking.status],
                }}
              >
                {booking.status}
              </span>
              <span
                className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded border"
                style={{
                  borderColor: DEPOSIT_BORDER[booking.deposit_status],
                  color: DEPOSIT_BORDER[booking.deposit_status],
                }}
              >
                Sinal: {booking.deposit_status}
              </span>
            </div>
          </div>

          {/* Dados rápidos de contato e horário */}
          <div className="grid grid-cols-1 gap-2 mt-4 text-xs text-neutral-300 bg-white/5 p-3 rounded border border-white/5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Calendar className="w-3.5 h-3.5 text-[#9be5ff]" />
                {localStart.date}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-white">
                <Clock className="w-3.5 h-3.5 text-[#9be5ff]" />
                {localStart.time} – {localEnd.time} ({timezone.split("/")[1] ?? timezone})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <span className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-[#9be5ff]" />
                {booking.client_phone}
              </span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#25D366] hover:underline"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp ↗
              </a>
            </div>
          </div>
        </div>

        {/* Corpo com Ações e Edição */}
        <div className="p-6 space-y-6 flex-1">
          {/* 1. MÁQUINA DE STATUS */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-neutral-400 block">
              Transição de Status
            </label>
            {isTerminal ? (
              <p className="text-xs text-neutral-500 italic">
                Status terminal alcançado ({booking.status}). Nenhuma outra transição de status é
                permitida.
              </p>
            ) : allowedTransitions.length === 0 ? (
              <p className="text-xs text-neutral-500">Sem transições disponíveis.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.includes("confirmado") && (
                  <Button
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("confirmado")}
                    className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-[#9be5ff] text-[#070707] hover:bg-[#b0ecff] transition-colors disabled:opacity-50 cursor-pointer rounded-none h-auto"
                  >
                    Confirmar Sessão
                  </Button>
                )}
                {allowedTransitions.includes("concluido") && (
                  <Button
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("concluido")}
                    className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer rounded-none h-auto"
                  >
                    Concluir Sessão
                  </Button>
                )}
                {allowedTransitions.includes("cancelado") && (
                  <Button
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("cancelado")}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-neutral-800 text-neutral-300 hover:bg-red-950/60 hover:text-red-400 border-white/10 transition-colors disabled:opacity-50 cursor-pointer rounded-none h-auto"
                  >
                    Cancelar
                  </Button>
                )}
                {allowedTransitions.includes("no_show") && (
                  <Button
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("no_show")}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/60 transition-colors disabled:opacity-50 cursor-pointer rounded-none h-auto"
                  >
                    Falta (No-Show)
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 2. SINAL FINANCEIRO */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-neutral-400 block">
                Status do Sinal
              </label>
              <span className="text-xs font-mono text-[#9be5ff]">
                {centsToDisplay(booking.deposit_cents)} /{" "}
                {centsToDisplay(booking.price_total_cents)}
              </span>
            </div>
            <select
              value={booking.deposit_status}
              disabled={isSubmitting}
              onChange={(e) =>
                handleDepositStatusChange(e.target.value as Booking["deposit_status"])
              }
              className="w-full bg-[#141416] border border-white/20 text-white text-xs px-3 py-2 rounded-none outline-none focus:border-[#9be5ff] cursor-pointer"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="dispensado">Dispensado</option>
              <option
                value="retido"
                disabled={booking.status !== "cancelado" && booking.status !== "no_show"}
              >
                Retido{" "}
                {booking.status !== "cancelado" && booking.status !== "no_show"
                  ? "(só após cancelamento)"
                  : ""}
              </option>
              <option
                value="devolvido"
                disabled={booking.status !== "cancelado" && booking.status !== "no_show"}
              >
                Devolvido{" "}
                {booking.status !== "cancelado" && booking.status !== "no_show"
                  ? "(só após cancelamento)"
                  : ""}
              </option>
            </select>
          </div>

          {/* 3. EDIÇÃO DE DADOS (TASK-05b) */}
          <form onSubmit={handleSaveData} className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-neutral-400">
                Editar Dados da Sessão
              </span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                PATCH /api/bookings/:id
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Nome</label>
                <input
                  type="text"
                  value={editName}
                  disabled={isTerminal && booking.status !== "concluido"}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Telefone</label>
                <input
                  type="text"
                  value={editPhone}
                  disabled={isTerminal && booking.status !== "concluido"}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] disabled:opacity-50 font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] uppercase font-bold text-neutral-400">E-mail</label>
              <input
                type="email"
                value={editEmail}
                disabled={isTerminal && booking.status !== "concluido"}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Local</label>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value as Booking["location"])}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
                >
                  <option value="estudio">Estúdio</option>
                  <option value="domicilio">Domicílio</option>
                  <option value="evento">Evento</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">
                  Tipo de Sessão
                </label>
                <select
                  value={editSessionType}
                  onChange={(e) => setEditSessionType(e.target.value as Booking["session_type"])}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
                >
                  <option value="tatuagem">Tatuagem</option>
                  <option value="flash">Flash</option>
                  <option value="retoque">Retoque</option>
                  <option value="projeto">Projeto</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">
                  Preço Total (R$)
                </label>
                <input
                  type="text"
                  value={editPriceDisplay}
                  onChange={(e) => setEditPriceDisplay(e.target.value)}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] font-mono"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">
                  Sinal (R$)
                </label>
                <input
                  type="text"
                  value={editDepositDisplay}
                  disabled={
                    booking.deposit_status === "pago" ||
                    booking.deposit_status === "retido" ||
                    booking.deposit_status === "devolvido"
                  }
                  onChange={(e) => setEditDepositDisplay(e.target.value)}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] disabled:opacity-50 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] uppercase font-bold text-neutral-400">
                Notas / Ideia
              </label>
              <textarea
                value={editNotes}
                rows={2}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-[#141416] border border-white/20 px-3 py-2 text-white outline-none focus:border-[#9be5ff]"
                placeholder="Observações da sessão..."
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer rounded-none h-auto"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? "Salvando..." : "Salvar Dados da Sessão"}
            </Button>
          </form>

          {/* 4. HISTÓRICO DE AUDITORIA */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-neutral-400">
              <History className="w-3.5 h-3.5 text-[#9be5ff]" />
              Histórico & Auditoria
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(booking.events || []).length === 0 ? (
                <p className="text-xs text-neutral-500">Nenhum evento registrado.</p>
              ) : (
                booking.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[11px] bg-black/40 border border-white/5 p-2 rounded"
                  >
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="font-bold uppercase text-[#9be5ff]">{ev.event_type}</span>
                      <span className="font-mono text-[9px]">
                        {utcToLocal(ev.created_at, timezone).date}{" "}
                        {utcToLocal(ev.created_at, timezone).time}
                      </span>
                    </div>
                    {ev.note && <p className="text-neutral-300 mt-0.5">{ev.note}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Rodapé com Remarcar e Fechar */}
        <div className="p-4 border-t border-white/10 bg-[#070707] flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onReschedule(booking);
              onClose();
            }}
            disabled={
              booking.status === "cancelado" ||
              booking.status === "concluido" ||
              booking.status === "no_show"
            }
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#9be5ff]/10 hover:bg-[#9be5ff]/20 text-[#9be5ff] border-[#9be5ff]/30 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer rounded-none h-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Remarcar Horário ↗
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border-white/10 transition-colors cursor-pointer rounded-none h-auto"
          >
            Fechar
          </Button>
        </div>
      </aside>

      {/* Diálogo de confirmação de cancelamento com sinal pago */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancelar com Sinal Pago"
        description={`O cliente ${booking.client_name} já possui sinal marcado como PAGO. Escolha se o sinal será retido pelo ateliê ou devolvido ao cliente.`}
        confirmLabel="Devolver Sinal"
        extraActionLabel="Reter Sinal"
        cancelLabel="Voltar"
        onConfirm={() => handleStatusChange("cancelado", "devolvido")}
        onExtraAction={() => handleStatusChange("cancelado", "retido")}
        onCancel={() => setShowCancelConfirm(false)}
        variant="warning"
      />
    </>
  );
}
