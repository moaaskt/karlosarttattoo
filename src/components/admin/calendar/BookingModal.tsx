import * as React from "react";
import { DateTime } from "luxon";
import { X, Calendar, Clock, DollarSign, User, Phone, Mail, MapPin, Tag, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, displayToCents, getErrorMessage } from "../../../lib/api-client";
import { localToUTC, utcToLocal } from "../../../lib/agenda-utils";
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
  }, [open, mode, bookingToReschedule, leadData, defaultDate, defaultTime, defaultEndTime, timezone, settings]);

  // Regra 9: Resetar forceConfirmed ao alterar data ou horário
  const handleDateOrTimeChange = (updater: () => void) => {
    setForceConfirmed(false);
    updater();
  };

  // Regra 3: Virada de meia-noite (fim <= início)
  React.useEffect(() => {
    if (startTime && endTime && startDate) {
      if (endTime <= startTime) {
        const nextDay = DateTime.fromISO(startDate, { zone: timezone }).plus({ days: 1 }).toFormat("yyyy-MM-dd");
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
      const dt = DateTime.fromISO(`${startDate}T${startTime}:00`, { zone: timezone }).plus({ hours });
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
        const dt = DateTime.fromISO(`${startDate}T${timeVal}:00`, { zone: timezone }).plus({ hours: 2 });
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
          if (res.data?.requires_force && res.data?.warnings && res.data.warnings.length > 0 && !forceConfirmed) {
            const warningMsgs = res.data.warnings.map((w) => w.message || getErrorMessage(w.code)).join(" • ");
            toast.warning(`${warningMsgs}. Clique em 'Remarcar mesmo assim' para confirmar.`);
            setForceConfirmed(true);
            return;
          }
          const conflicts = res.data?.conflicts;
          if (conflicts && conflicts.length > 0) {
            toast.error(`${getErrorMessage(res.data?.error)} (Conflito com: ${conflicts.map((c) => c.client_name).join(", ")})`);
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
          if (res.data?.requires_force && res.data?.warnings && res.data.warnings.length > 0 && !forceConfirmed) {
            const warningMsgs = res.data.warnings.map((w) => w.message || getErrorMessage(w.code)).join(" • ");
            toast.warning(`${warningMsgs}. Clique em 'Criar mesmo assim' para confirmar.`);
            setForceConfirmed(true);
            return;
          }
          const conflicts = res.data?.conflicts;
          if (conflicts && conflicts.length > 0) {
            toast.error(`${getErrorMessage(res.data?.error)} (Conflito com: ${conflicts.map((c) => c.client_name).join(", ")})`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0c0c0e] border border-white/10 shadow-2xl p-6 my-8 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#9be5ff]/10 border border-[#9be5ff]/30 flex items-center justify-center text-[#9be5ff]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-white">
                {mode === "reschedule" ? "Remarcar Sessão" : "Novo Agendamento"}
              </h2>
              <span className="text-[10px] text-neutral-400 font-mono">
                Horário Local: {timezone}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Vinculado (se houver) */}
        {leadData && (
          <div className="bg-[#9be5ff]/10 border border-[#9be5ff]/30 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#9be5ff]">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold uppercase tracking-wider">Lead Vinculado:</span>
              <span className="text-white font-medium">{leadData.name} ({leadData.phone})</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-black/40 px-2 py-0.5 text-neutral-400">
              {leadData.service}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de Data e Horário com Presets */}
          <div className="bg-black/40 border border-white/5 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                Horário da Sessão
              </span>
              {/* Presets de início */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-neutral-500">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPresetTime("preset_manha")}
                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 uppercase font-bold tracking-wider cursor-pointer"
                >
                  Manhã ({settings["preset_manha"] || "09:00"})
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("preset_tarde")}
                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 uppercase font-bold tracking-wider cursor-pointer"
                >
                  Tarde ({settings["preset_tarde"] || "14:00"})
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime("preset_noite")}
                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 uppercase font-bold tracking-wider cursor-pointer"
                >
                  Noite ({settings["preset_noite"] || "18:30"})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Início (Data & Hora)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateOrTimeChange(() => setStartDate(e.target.value))}
                    className="flex-1 bg-[#141416] border border-white/20 px-2.5 py-1.5 text-white outline-none focus:border-[#9be5ff]"
                    required
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleDateOrTimeChange(() => setStartTime(e.target.value))}
                    className="w-24 bg-[#141416] border border-white/20 px-2.5 py-1.5 text-white outline-none focus:border-[#9be5ff] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-neutral-400">Término (Hora)</label>
                  {isNextDay && (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.2 border border-amber-500/20">
                      Termina no dia seguinte ({endDate})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleDateOrTimeChange(() => setEndTime(e.target.value))}
                    className="flex-1 bg-[#141416] border border-white/20 px-2.5 py-1.5 text-white outline-none focus:border-[#9be5ff] font-mono"
                    required
                  />
                  {/* Atalhos de Duração */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => addHoursDuration(2)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 font-bold font-mono cursor-pointer"
                    >
                      +2h
                    </button>
                    <button
                      type="button"
                      onClick={() => addHoursDuration(4)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 font-bold font-mono cursor-pointer"
                    >
                      +4h
                    </button>
                    <button
                      type="button"
                      onClick={() => addHoursDuration(6)}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 font-bold font-mono cursor-pointer"
                    >
                      +6h
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Cadastrais (somente no create ou edição) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400">Nome do Cliente</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400">WhatsApp / Telefone</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400">E-mail</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400">Local</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as Booking["location"])}
                className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
              >
                <option value="estudio">Estúdio</option>
                <option value="domicilio">Domicílio</option>
                <option value="evento">Evento</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400">Tipo de Sessão</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as Booking["session_type"])}
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

          {/* Valores Financeiros (se modo Create) */}
          {mode === "create" && (
            <div className="grid grid-cols-3 gap-3 text-xs border-t border-white/10 pt-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Valor Total (R$)</label>
                <input
                  type="text"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] font-mono"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Sinal (R$)</label>
                <input
                  type="text"
                  value={depositDisplay}
                  onChange={(e) => setDepositDisplay(e.target.value)}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff] font-mono"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Status do Sinal</label>
                <select
                  value={depositStatus}
                  onChange={(e) => setDepositStatus(e.target.value as Booking["deposit_status"])}
                  className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="dispensado">Dispensado</option>
                </select>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1 text-xs">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Observações / Ideia</label>
            <textarea
              value={notes}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#141416] border border-white/20 px-3 py-1.5 text-white outline-none focus:border-[#9be5ff]"
              placeholder="Detalhes da arte, local do corpo, referências..."
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                forceConfirmed
                  ? "bg-amber-400 hover:bg-amber-300 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  : "bg-[#9be5ff] hover:bg-[#b0ecff] text-[#070707] border-[#9be5ff] shadow-[0_0_15px_rgba(155,229,255,0.2)]"
              } disabled:opacity-50`}
            >
              {isSubmitting
                ? "Processando..."
                : forceConfirmed
                ? mode === "reschedule"
                  ? "Remarcar mesmo assim"
                  : "Criar mesmo assim"
                : mode === "reschedule"
                ? "Confirmar Remarcação"
                : "Criar Agendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
