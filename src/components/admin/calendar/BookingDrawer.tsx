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
  AlertTriangle,
  Check,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  checkBookingTimeBlockOverlap,
  REASON_TAG_LABEL,
} from "../../../lib/agenda-utils";
import type { Booking, BookingEvent, TimeBlock } from "../../../lib/db";

export interface BookingDrawerProps {
  bookingId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onReschedule: (booking: Booking) => void;
  timezone?: string;
  timeBlocks?: TimeBlock[];
}

export function BookingDrawer({
  bookingId,
  onClose,
  onRefresh,
  onReschedule,
  timezone = "America/Sao_Paulo",
  timeBlocks = [],
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

  const whatsappPhone = formatWhatsAppPhone(booking.client_phone);
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    `Olá ${booking.client_name}, aqui é o Karlos do ateliê Karlos Art Tattoo sobre sua sessão no dia ${localStart.date}!`,
  )}`;

  // Labels e status formatados
  const LOCATION_LABELS: Record<Booking["location"], string> = {
    estudio: "Estúdio",
    domicilio: "Domicílio",
    evento: "Evento",
  };

  const STATUS_LABELS: Record<Booking["status"], { label: string; className: string }> = {
    pendente: {
      label: "Pendente",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    confirmado: {
      label: "Confirmado",
      className: "bg-[#76ABAE]/20 text-[#76ABAE] border-[#76ABAE]/30",
    },
    concluido: {
      label: "Concluído",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    cancelado: {
      label: "Cancelado",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
    no_show: {
      label: "Falta (No-Show)",
      className: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    },
  };

  const currentStatusInfo = STATUS_LABELS[booking.status] ?? {
    label: booking.status,
    className: "bg-[#222831] text-[#9DA5B4] border-[#31363F]",
  };

  const DEPOSIT_STATUS_LABELS: Record<Booking["deposit_status"], { label: string; className: string }> = {
    pendente: {
      label: "Sinal: Pendente",
      className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    pago: {
      label: "Sinal: Pago",
      className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    dispensado: {
      label: "Sinal: Dispensado",
      className: "bg-[#76ABAE]/15 text-[#76ABAE] border-[#76ABAE]/30",
    },
    retido: {
      label: "Sinal: Retido",
      className: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    },
    devolvido: {
      label: "Sinal: Devolvido",
      className: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
    },
  };

  const currentDepositInfo = DEPOSIT_STATUS_LABELS[booking.deposit_status] ?? {
    label: `Sinal: ${booking.deposit_status}`,
    className: "bg-[#222831] text-[#9DA5B4] border-[#31363F]",
  };

  return (
    <>
      <Dialog open={Boolean(bookingId)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="w-full max-w-2xl mx-auto p-6 bg-[#31363F] text-[#EEEEEE] border border-[#31363F] shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Cabeçalho do Modal */}
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl font-bold text-[#EEEEEE] tracking-wide">
                {booking.client_name}
              </DialogTitle>
              <span className="bg-[#222831] text-[#9DA5B4] border border-[#31363F] text-xs px-2.5 py-0.5 rounded-full font-mono">
                #{booking.id.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Badges de Status e Contexto */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className="bg-[#222831] text-[#EEEEEE] border-[#31363F] text-xs font-normal"
              >
                {LOCATION_LABELS[booking.location] || booking.location}
              </Badge>
              <Badge
                variant="outline"
                className="bg-[#222831] text-[#EEEEEE] border-[#31363F] text-xs font-normal"
              >
                {SESSION_TYPE_LABEL[booking.session_type] || booking.session_type}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${currentStatusInfo.className}`}
              >
                {currentStatusInfo.label}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${currentDepositInfo.className}`}
              >
                {currentDepositInfo.label}
              </Badge>
            </div>
          </DialogHeader>

          {/* Card Informativo de Contato e Horário (Acesso Rápido) */}
          <div className="bg-[#222831] border border-[#31363F] rounded-lg p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 my-4">
            <div className="space-y-1 text-xs text-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#76ABAE]" />
                <span className="font-semibold">{localStart.date}</span>
                <span className="text-[#9DA5B4]">•</span>
                <Clock className="w-4 h-4 text-[#76ABAE]" />
                <span className="font-mono">
                  {localStart.time} – {localEnd.time}
                </span>
                <span className="text-[10px] text-[#9DA5B4] font-mono">
                  ({timezone.split("/")[1] ?? timezone})
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#9DA5B4] text-[11px] font-mono">
                <Phone className="w-3.5 h-3.5 text-[#76ABAE]" />
                <span>{booking.client_phone}</span>
                {booking.client_email && (
                  <>
                    <span>•</span>
                    <Mail className="w-3.5 h-3.5 text-[#76ABAE]" />
                    <span className="font-sans">{booking.client_email}</span>
                  </>
                )}
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs gap-1.5 h-8 bg-transparent"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Conversar no WhatsApp
              </Button>
            </a>
          </div>

          {/* Transição de Status (Ações Rápidas da Sessão) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#9DA5B4] block">
              Ações da Sessão
            </Label>
            {isTerminal ? (
              <p className="text-xs text-[#9DA5B4] italic bg-[#222831]/60 border border-[#31363F] p-2.5 rounded-md">
                Status terminal alcançado ({booking.status}). Nenhuma outra transição de status é permitida.
              </p>
            ) : allowedTransitions.length === 0 ? (
              <p className="text-xs text-[#9DA5B4]">Sem transições disponíveis para este status.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {allowedTransitions.includes("confirmado") && (
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("confirmado")}
                    className="bg-[#76ABAE] hover:bg-[#76ABAE]/90 text-[#222831] font-semibold text-xs h-8"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Confirmar Sessão
                  </Button>
                )}
                {allowedTransitions.includes("concluido") && (
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("concluido")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Concluir Sessão
                  </Button>
                )}
                {allowedTransitions.includes("cancelado") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("cancelado")}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8 bg-transparent"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancelar
                  </Button>
                )}
                {allowedTransitions.includes("no_show") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange("no_show")}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-8 bg-transparent"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Falta (No-Show)
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Formulário de Edição dos Dados (Grid Responsivo) */}
          <form id="booking-detail-form" onSubmit={handleSaveData} className="space-y-4 pt-4 border-t border-[#31363F]">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#EEEEEE] uppercase tracking-wider">
                Dados do Agendamento
              </Label>
              <span className="text-xs font-mono text-[#76ABAE]">
                Sinal: {centsToDisplay(booking.deposit_cents)} / Total: {centsToDisplay(booking.price_total_cents)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nome */}
              <div className="space-y-1">
                <Label htmlFor="booking-edit-name" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Nome do Cliente
                </Label>
                <Input
                  id="booking-edit-name"
                  type="text"
                  value={editName}
                  disabled={isTerminal && booking.status !== "concluido"}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-[#222831] border-[#31363F] text-[#EEEEEE] placeholder:text-[#9DA5B4] focus:border-[#76ABAE] rounded-md text-xs h-9"
                  required
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <Label htmlFor="booking-edit-phone" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="booking-edit-phone"
                  type="text"
                  value={editPhone}
                  disabled={isTerminal && booking.status !== "concluido"}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-[#222831] border-[#31363F] text-[#EEEEEE] placeholder:text-[#9DA5B4] focus:border-[#76ABAE] rounded-md text-xs font-mono h-9"
                  required
                />
              </div>

              {/* E-mail (2 colunas) */}
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <Label htmlFor="booking-edit-email" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  E-mail
                </Label>
                <Input
                  id="booking-edit-email"
                  type="email"
                  value={editEmail}
                  disabled={isTerminal && booking.status !== "concluido"}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-[#222831] border-[#31363F] text-[#EEEEEE] placeholder:text-[#9DA5B4] focus:border-[#76ABAE] rounded-md text-xs h-9"
                  placeholder="cliente@email.com"
                />
              </div>

              {/* Local */}
              <div className="space-y-1">
                <Label htmlFor="booking-edit-location" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Local / Modalidade
                </Label>
                <Select
                  value={editLocation}
                  onValueChange={(val) => setEditLocation(val as Booking["location"])}
                >
                  <SelectTrigger
                    id="booking-edit-location"
                    className="w-full bg-[#222831] border-[#31363F] text-[#EEEEEE] focus:border-[#76ABAE] rounded-md text-xs h-9"
                  >
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222831] border-[#31363F] text-[#EEEEEE]">
                    <SelectItem value="estudio">Estúdio</SelectItem>
                    <SelectItem value="domicilio">Domicílio</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Sessão */}
              <div className="space-y-1">
                <Label htmlFor="booking-edit-session-type" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Tipo de Sessão
                </Label>
                <Select
                  value={editSessionType}
                  onValueChange={(val) => setEditSessionType(val as Booking["session_type"])}
                >
                  <SelectTrigger
                    id="booking-edit-session-type"
                    className="w-full bg-[#222831] border-[#31363F] text-[#EEEEEE] focus:border-[#76ABAE] rounded-md text-xs h-9"
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222831] border-[#31363F] text-[#EEEEEE]">
                    <SelectItem value="tatuagem">Tatuagem</SelectItem>
                    <SelectItem value="flash">Flash</SelectItem>
                    <SelectItem value="retoque">Retoque</SelectItem>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preço Total */}
              <div className="space-y-1">
                <Label htmlFor="booking-edit-price" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Preço Total (R$)
                </Label>
                <Input
                  id="booking-edit-price"
                  type="text"
                  value={editPriceDisplay}
                  onChange={(e) => setEditPriceDisplay(e.target.value)}
                  className="bg-[#222831] border-[#31363F] text-[#EEEEEE] placeholder:text-[#9DA5B4] focus:border-[#76ABAE] rounded-md text-xs font-mono h-9"
                  placeholder="0,00"
                />
              </div>

              {/* Valor do Sinal */}
              <div className="space-y-1">
                <Label htmlFor="booking-edit-deposit" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Valor do Sinal (R$)
                </Label>
                <Input
                  id="booking-edit-deposit"
                  type="text"
                  value={editDepositDisplay}
                  disabled={
                    booking.deposit_status === "pago" ||
                    booking.deposit_status === "retido" ||
                    booking.deposit_status === "devolvido"
                  }
                  onChange={(e) => setEditDepositDisplay(e.target.value)}
                  className="bg-[#222831] border-[#31363F] text-[#EEEEEE] placeholder:text-[#9DA5B4] focus:border-[#76ABAE] rounded-md text-xs font-mono h-9 disabled:opacity-50"
                  placeholder="0,00"
                />
              </div>

              {/* Status do Sinal (Select) */}
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <Label htmlFor="booking-edit-deposit-status" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Status do Sinal
                </Label>
                <Select
                  value={booking.deposit_status}
                  disabled={isSubmitting}
                  onValueChange={(val) =>
                    handleDepositStatusChange(val as Booking["deposit_status"])
                  }
                >
                  <SelectTrigger
                    id="booking-edit-deposit-status"
                    className="w-full bg-[#222831] border-[#31363F] text-[#EEEEEE] focus:border-[#76ABAE] rounded-md text-xs h-9"
                  >
                    <SelectValue placeholder="Status do Sinal" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222831] border-[#31363F] text-[#EEEEEE]">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="dispensado">Dispensado</SelectItem>
                    <SelectItem
                      value="retido"
                      disabled={booking.status !== "cancelado" && booking.status !== "no_show"}
                    >
                      Retido {booking.status !== "cancelado" && booking.status !== "no_show" ? "(só após cancelamento)" : ""}
                    </SelectItem>
                    <SelectItem
                      value="devolvido"
                      disabled={booking.status !== "cancelado" && booking.status !== "no_show"}
                    >
                      Devolvido {booking.status !== "cancelado" && booking.status !== "no_show" ? "(só após cancelamento)" : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações / Ideia (2 colunas) */}
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <Label htmlFor="booking-edit-notes" className="text-xs font-medium text-[#9DA5B4] mb-1 block">
                  Notas / Ideia
                </Label>
                <Textarea
                  id="booking-edit-notes"
                  value={editNotes}
                  rows={3}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-[#222831] border-[#31363F] text-[#EEEEEE] placeholder:text-[#9DA5B4] focus:border-[#76ABAE] rounded-md text-xs resize-none"
                  placeholder="Observações da sessão..."
                />
              </div>
            </div>
          </form>

          {/* Histórico & Auditoria */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#EEEEEE]">
              <History className="w-3.5 h-3.5 text-[#76ABAE]" />
              Histórico & Auditoria
            </div>
            <div className="bg-[#222831]/60 border border-[#31363F] rounded-md p-3 text-xs text-[#9DA5B4] max-h-40 overflow-y-auto space-y-2">
              {(booking.events || []).length === 0 ? (
                <p className="italic text-[#9DA5B4]">Nenhum evento registrado.</p>
              ) : (
                booking.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="border-b border-[#31363F]/50 pb-1.5 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#76ABAE] uppercase tracking-wider text-[11px]">
                        {ev.event_type}
                      </span>
                      <span className="font-mono text-[10px] text-[#9DA5B4]">
                        {utcToLocal(ev.created_at, timezone).date}{" "}
                        {utcToLocal(ev.created_at, timezone).time}
                      </span>
                    </div>
                    {ev.note && <p className="text-[#EEEEEE] mt-0.5 text-xs">{ev.note}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#31363F] mt-6">
            <Button
              type="button"
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
              className="text-xs border-[#31363F] text-[#9DA5B4] hover:text-[#EEEEEE] hover:bg-[#222831] h-8 bg-transparent"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Remarcar Horário
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-xs text-[#9DA5B4] hover:text-[#EEEEEE] hover:bg-[#222831] h-8"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                form="booking-detail-form"
                disabled={isSubmitting}
                className="bg-[#76ABAE] hover:bg-[#76ABAE]/90 text-[#222831] font-semibold text-xs h-8"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
