import * as React from "react";
import { DateTime } from "luxon";
import {
  X,
  Calendar,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Sparkles,
  AlertCircle,
  Info,
  Link2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, displayToCents, getErrorMessage } from "../../../lib/api-client";
import { localToUTC, utcToLocal } from "../../../lib/agenda-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { Booking, Lead } from "../../../lib/db";

export interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "create" | "reschedule";
  bookingToReschedule?: Booking | null;
  leadData?: Lead | null;
  defaultDate?: string;
  defaultTime?: string;
  defaultEndTime?: string;
  timezone?: string;
  settings?: Record<string, string>;
}

export function BookingModal({
  open,
  onClose,
  onSuccess,
  mode,
  bookingToReschedule,
  leadData,
  defaultDate,
  defaultTime,
  defaultEndTime,
  timezone = "America/Sao_Paulo",
  settings = {},
}: BookingModalProps) {
  // 1. Estados de data e hora locais
  const [startDate, setStartDate] = React.useState<string>("");
  const [startTime, setStartTime] = React.useState<string>("10:00");
  const [endDate, setEndDate] = React.useState<string>("");
  const [endTime, setEndTime] = React.useState<string>("12:00");
  const [isNextDay, setIsNextDay] = React.useState<boolean>(false);

  // 2. Campos cadastrais e de sessão
  const [clientName, setClientName] = React.useState<string>("");
  const [clientPhone, setClientPhone] = React.useState<string>("");
  const [clientEmail, setClientEmail] = React.useState<string>("");
  const [location, setLocation] = React.useState<Booking["location"]>("estudio");
  const [sessionType, setSessionType] = React.useState<Booking["session_type"]>("tatuagem");
  const [priceDisplay, setPriceDisplay] = React.useState<string>("0,00");
  const [depositDisplay, setDepositDisplay] = React.useState<string>("0,00");
  const [depositStatus, setDepositStatus] = React.useState<Booking["deposit_status"]>("pendente");
  const [notes, setNotes] = React.useState<string>("");

  // 3. Controle de envio e confirmação fora de horário
  const [forceConfirmed, setForceConfirmed] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Inicialização e preenchimento ao abrir
  React.useEffect(() => {
    if (!open) return;

    setForceConfirmed(false);

    if (mode === "reschedule" && bookingToReschedule) {
      const localS = utcToLocal(bookingToReschedule.start_at, timezone);
      const localE = utcToLocal(bookingToReschedule.end_at, timezone);
      setStartDate(localS.date);
      setStartTime(localS.time);
      setEndDate(localE.date);
      setEndTime(localE.time);
      setClientName(bookingToReschedule.client_name);
      setClientPhone(bookingToReschedule.client_phone);
      setClientEmail(bookingToReschedule.client_email || "");
      setLocation(bookingToReschedule.location);
      setSessionType(bookingToReschedule.session_type);
      setNotes(bookingToReschedule.notes || "");
    } else {
      // Modo Create
      const today = DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");
      const initDate = defaultDate || today;
      const initTime = defaultTime || settings["preset_manha"] || "09:00";
      const initEndTime =
        defaultEndTime ||
        DateTime.fromISO(`${initDate}T${initTime}:00`, { zone: timezone })
          .plus({ hours: 2 })
          .toFormat("HH:mm");

      setStartDate(initDate);
      setStartTime(initTime);
      setEndDate(initDate);
      setEndTime(initEndTime);

      if (leadData) {
        setClientName(leadData.name);
        setClientPhone(leadData.phone);
        setClientEmail(leadData.email);
        setNotes(leadData.message ? `[Lead] ${leadData.message}` : "");
      } else {
        setClientName("");
        setClientPhone("");
        setClientEmail("");
        setNotes("");
      }

      setLocation("estudio");
      setSessionType("tatuagem");
      setPriceDisplay("0,00");
      setDepositDisplay("0,00");
      setDepositStatus("pendente");
    }
  }, [
    open,
    mode,
    bookingToReschedule,
    leadData,
    defaultDate,
    defaultTime,
    defaultEndTime,
    timezone,
    settings,
  ]);

  // Regra 9: Resetar forceConfirmed ao alterar data ou horário
  const handleDateOrTimeChange = (updater: () => void) => {
    setForceConfirmed(false);
    updater();
  };

  // Regra 3: Virada de meia-noite (fim <= início)
  React.useEffect(() => {
    if (startTime && endTime && startDate) {
      if (endTime <= startTime) {
        const nextDay = DateTime.fromISO(startDate, { zone: timezone })
          .plus({ days: 1 })
          .toFormat("yyyy-MM-dd");
        setEndDate(nextDay);
        setIsNextDay(true);
      } else {
        setEndDate(startDate);
        setIsNextDay(false);
      }
    }
  }, [startDate, startTime, endTime, timezone]);

  // Atalhos de acréscimo de duração (+2h, +4h, +6h)
  const addHoursDuration = (hours: number) => {
    if (!startDate || !startTime) return;
    handleDateOrTimeChange(() => {
      const dt = DateTime.fromISO(`${startDate}T${startTime}:00`, { zone: timezone }).plus({
        hours,
      });
      setEndTime(dt.toFormat("HH:mm"));
      setEndDate(dt.toFormat("yyyy-MM-dd"));
    });
  };

  // Presets de horário de settings
  const applyPresetTime = (presetKey: "preset_manha" | "preset_tarde" | "preset_noite") => {
    const timeVal = settings[presetKey];
    if (timeVal) {
      handleDateOrTimeChange(() => {
        setStartTime(timeVal);
        const dt = DateTime.fromISO(`${startDate}T${timeVal}:00`, { zone: timezone }).plus({
          hours: 2,
        });
        setEndTime(dt.toFormat("HH:mm"));
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let start_at: string;
    let end_at: string;

    try {
      start_at = localToUTC(startDate, startTime, timezone);
      end_at = localToUTC(endDate, endTime, timezone);
    } catch (err: any) {
      toast.error(err.message || "Erro na conversão de horário.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "reschedule" && bookingToReschedule) {
        // RESCHEDULE
        const res = await apiFetch<{
          success?: boolean;
          error?: string;
          requires_force?: boolean;
          warnings?: Array<{ code: string; message: string }>;
          message?: string;
          conflicts?: Array<{ client_name: string }>;
        }>(`/api/bookings/${bookingToReschedule.id}/reschedule`, {
          method: "PATCH",
          body: JSON.stringify({
            start_at,
            end_at,
            force: forceConfirmed,
          }),
        });

        if (!res.ok) {
          if (
            res.data?.requires_force &&
            res.data?.warnings &&
            res.data.warnings.length > 0 &&
            !forceConfirmed
          ) {
            const warningMsgs = res.data.warnings
              .map((w) => w.message || getErrorMessage(w.code))
              .join(" • ");
            toast.warning(`${warningMsgs}. Clique em 'Remarcar mesmo assim' para confirmar.`);
            setForceConfirmed(true);
            return;
          }
          const conflicts = res.data?.conflicts;
          if (conflicts && conflicts.length > 0) {
            toast.error(
              `${getErrorMessage(res.data?.error)} (Conflito com: ${conflicts.map((c) => c.client_name).join(", ")})`,
            );
          } else {
            toast.error(res.data?.message || getErrorMessage(res.data?.error));
          }
          return;
        }

        toast.success("Agendamento remarcado com sucesso!");
        onSuccess();
        onClose();
      } else {
        // CREATE
        let priceCents = 0;
        let depositCents = 0;

        try {
          priceCents = displayToCents(priceDisplay || "0");
          depositCents = displayToCents(depositDisplay || "0");
        } catch (err: any) {
          toast.error(err.message || "Formato de valor inválido.");
          setIsSubmitting(false);
          return;
        }

        const res = await apiFetch<{
          success?: boolean;
          error?: string;
          requires_force?: boolean;
          warnings?: Array<{ code: string; message: string }>;
          message?: string;
          conflicts?: Array<{ client_name: string }>;
        }>("/api/bookings", {
          method: "POST",
          body: JSON.stringify({
            lead_id: leadData?.id || null,
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            client_email: clientEmail.trim() || null,
            location,
            session_type: sessionType,
            start_at,
            end_at,
            price_total_cents: priceCents,
            deposit_cents: depositCents,
            deposit_status: depositStatus,
            notes: notes.trim() || null,
            force: forceConfirmed,
          }),
        });

        if (!res.ok) {
          if (
            res.data?.requires_force &&
            res.data?.warnings &&
            res.data.warnings.length > 0 &&
            !forceConfirmed
          ) {
            const warningMsgs = res.data.warnings
              .map((w) => w.message || getErrorMessage(w.code))
              .join(" • ");
            toast.warning(`${warningMsgs}. Clique em 'Criar mesmo assim' para confirmar.`);
            setForceConfirmed(true);
            return;
          }
          const conflicts = res.data?.conflicts;
          if (conflicts && conflicts.length > 0) {
            toast.error(
              `${getErrorMessage(res.data?.error)} (Conflito com: ${conflicts.map((c) => c.client_name).join(", ")})`,
            );
          } else {
            toast.error(res.data?.message || getErrorMessage(res.data?.error));
          }
          return;
        }

        toast.success("Agendamento criado com sucesso!");
        onSuccess();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl mx-auto p-4 sm:p-6 my-auto bg-[#31363f] border border-white/10 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#222831] border border-white/10 flex items-center justify-center text-[#76abae] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#eeeeee]">
                {mode === "reschedule" ? "Remarcar Sessão" : "Novo Agendamento"}
              </h2>
              <span className="text-xs text-[#9da5b4] font-mono">Horário local: {timezone}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-[#9da5b4] hover:text-[#eeeeee] hover:bg-[#222831] rounded-md transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Lead Vinculado (se houver) */}
        {leadData && (
          <div className="bg-[#222831]/80 border border-white/10 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
              <div className="w-7 h-7 rounded-full bg-[#31363f] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#76abae]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-[#eeeeee] block truncate">
                  {leadData.name}
                </span>
                <span className="text-xs text-[#9da5b4] block truncate">{leadData.phone}</span>
              </div>
            </div>
            <span className="bg-[#31363f] text-[#eeeeee] border border-white/10 text-xs px-2.5 py-0.5 rounded-full shrink-0 font-medium self-start sm:self-auto">
              {leadData.service === "studio"
                ? "Palhoça (Estúdio)"
                : leadData.service === "home"
                  ? "VIP (Domicílio)"
                  : leadData.service === "flash"
                    ? "Outra Cidade / Eventos"
                    : leadData.service || "Palhoça (Estúdio)"}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Seção 1: Horário da Sessão */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-xs font-semibold text-[#9da5b4] uppercase tracking-wider">
                Horário da Sessão
              </h4>
              {/* Presets de início - Segmented Control */}
              <div className="flex flex-wrap sm:flex-nowrap gap-1.5 bg-[#222831] p-1 border border-white/10 rounded-md w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPresetTime("preset_manha")}
                  className="flex-1 sm:flex-initial text-xs text-[#9da5b4] hover:bg-[#31363f] hover:text-[#eeeeee] h-7 px-2.5 rounded-sm"
                >
                  Manhã ({settings["preset_manha"] || "09:00"})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPresetTime("preset_tarde")}
                  className="flex-1 sm:flex-initial text-xs text-[#9da5b4] hover:bg-[#31363f] hover:text-[#eeeeee] h-7 px-2.5 rounded-sm"
                >
                  Tarde ({settings["preset_tarde"] || "14:00"})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPresetTime("preset_noite")}
                  className="flex-1 sm:flex-initial text-xs text-[#9da5b4] hover:bg-[#31363f] hover:text-[#eeeeee] h-7 px-2.5 rounded-sm"
                >
                  Noite ({settings["preset_noite"] || "18:30"})
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label
                  htmlFor="booking-start-date"
                  className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
                >
                  Início da sessão
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="booking-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateOrTimeChange(() => setStartDate(e.target.value))}
                    className="flex-1 min-w-0 bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md"
                    required
                  />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleDateOrTimeChange(() => setStartTime(e.target.value))}
                    className="w-24 sm:w-28 bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label
                    htmlFor="booking-end-time"
                    className="text-xs font-medium text-[#9da5b4] block"
                  >
                    Término da sessão
                  </Label>
                  {isNextDay && (
                    <Badge
                      variant="default"
                      className="bg-amber-600 text-white text-[10px] font-semibold px-1.5 py-0.5 border-none"
                    >
                      Dia seguinte ({endDate})
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    id="booking-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => handleDateOrTimeChange(() => setEndTime(e.target.value))}
                    className="flex-1 bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md font-mono"
                    required
                  />
                  {/* Atalhos de Duração - Segmented Control */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-1.5 bg-[#222831] p-1 border border-white/10 rounded-md">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addHoursDuration(2)}
                      className="flex-1 sm:flex-initial text-xs text-[#9da5b4] hover:bg-[#31363f] hover:text-[#eeeeee] h-7 px-2 font-mono rounded-sm"
                    >
                      +2h
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addHoursDuration(4)}
                      className="flex-1 sm:flex-initial text-xs text-[#9da5b4] hover:bg-[#31363f] hover:text-[#eeeeee] h-7 px-2 font-mono rounded-sm"
                    >
                      +4h
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addHoursDuration(6)}
                      className="flex-1 sm:flex-initial text-xs text-[#9da5b4] hover:bg-[#31363f] hover:text-[#eeeeee] h-7 px-2 font-mono rounded-sm"
                    >
                      +6h
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Grid Responsiva */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label
                htmlFor="client-name"
                className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
              >
                Nome do cliente
              </Label>
              <Input
                id="client-name"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
                className="bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="client-phone"
                className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
              >
                WhatsApp / Telefone
              </Label>
              <Input
                id="client-phone"
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(48) 99999-9999"
                className="bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md font-mono"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="client-email"
                className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
              >
                E-mail
              </Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-[#9da5b4] mb-1.5 block">Local</Label>
              <Select
                value={location}
                onValueChange={(val) => setLocation(val as Booking["location"])}
              >
                <SelectTrigger className="bg-[#222831] border-white/10 text-[#eeeeee] focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent className="bg-[#31363f] border-white/10 text-[#eeeeee]">
                  <SelectItem value="estudio">Estúdio</SelectItem>
                  <SelectItem value="domicilio">Domicílio</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs font-medium text-[#9da5b4] mb-1.5 block">
                Tipo de sessão
              </Label>
              <Select
                value={sessionType}
                onValueChange={(val) => setSessionType(val as Booking["session_type"])}
              >
                <SelectTrigger className="bg-[#222831] border-white/10 text-[#eeeeee] focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md">
                  <SelectValue placeholder="Tipo de sessão" />
                </SelectTrigger>
                <SelectContent className="bg-[#31363f] border-white/10 text-[#eeeeee]">
                  <SelectItem value="tatuagem">Tatuagem</SelectItem>
                  <SelectItem value="flash">Flash</SelectItem>
                  <SelectItem value="retoque">Retoque</SelectItem>
                  <SelectItem value="projeto">Projeto</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valores Financeiros (se modo Create) */}
            {mode === "create" && (
              <>
                <div>
                  <Label
                    htmlFor="booking-price"
                    className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
                  >
                    Valor total (R$)
                  </Label>
                  <Input
                    id="booking-price"
                    type="text"
                    value={priceDisplay}
                    onChange={(e) => setPriceDisplay(e.target.value)}
                    className="bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md font-mono"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="booking-deposit"
                    className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
                  >
                    Sinal (R$)
                  </Label>
                  <Input
                    id="booking-deposit"
                    type="text"
                    value={depositDisplay}
                    onChange={(e) => setDepositDisplay(e.target.value)}
                    className="bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md font-mono"
                    placeholder="0,00"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs font-medium text-[#9da5b4] mb-1.5 block">
                    Status do sinal
                  </Label>
                  <Select
                    value={depositStatus}
                    onValueChange={(val) => setDepositStatus(val as Booking["deposit_status"])}
                  >
                    <SelectTrigger className="bg-[#222831] border-white/10 text-[#eeeeee] focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md">
                      <SelectValue placeholder="Status do sinal" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#31363f] border-white/10 text-[#eeeeee]">
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="dispensado">Dispensado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Observações / Ideia ocupando 2 colunas */}
            <div className="col-span-1 sm:col-span-2">
              <Label
                htmlFor="booking-notes"
                className="text-xs font-medium text-[#9da5b4] mb-1.5 block"
              >
                Observações / Ideia
              </Label>
              <Textarea
                id="booking-notes"
                value={notes}
                rows={2}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#222831] border-white/10 text-[#eeeeee] placeholder:text-[#9da5b4]/50 focus:border-[#76abae] focus:ring-1 focus:ring-[#76abae] rounded-md resize-none min-h-[64px]"
                placeholder="Detalhes da arte, local do corpo, referências..."
              />
            </div>
          </div>

          {forceConfirmed && (
            <Alert
              variant="default"
              className="mt-4 border-amber-500/50 bg-amber-950/20 text-neutral-200"
            >
              <Info className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-300 font-semibold uppercase tracking-wider text-xs">
                Aviso de Horário
              </AlertTitle>
              <AlertDescription className="text-neutral-300 text-xs">
                Foram identificados avisos ou conflitos para este horário. Clique em "
                {mode === "reschedule" ? "Remarcar mesmo assim" : "Criar mesmo assim"}" para
                confirmar o agendamento forçado.
              </AlertDescription>
            </Alert>
          )}

          {/* Rodapé do Modal */}
          <div className="border-t border-white/10 pt-4 mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="w-full sm:w-auto text-[#9da5b4] hover:text-[#eeeeee] hover:bg-[#222831]"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] font-bold px-5 ${
                forceConfirmed
                  ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  : ""
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                "Processando..."
              ) : forceConfirmed ? (
                mode === "reschedule" ? (
                  "Remarcar mesmo assim"
                ) : (
                  "Criar mesmo assim"
                )
              ) : (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {mode === "reschedule" ? "Confirmar remarcação" : "Criar agendamento"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
