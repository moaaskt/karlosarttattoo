import * as React from "react";
import type { DatesSetArg, EventContentArg, EventClickArg, DateSelectArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { FullCalendarClient } from "./calendar/FullCalendarClient";
import { BookingDrawer } from "./calendar/BookingDrawer";
import { BookingModal } from "./calendar/BookingModal";
import { ConfirmDialog } from "./calendar/ConfirmDialog";
import { apiFetch, toUTCString, getErrorMessage } from "../../lib/api-client";
import {
  bookingToEvent,
  timeBlockToEvent,
  deriveSlotMinTime,
  deriveSlotMaxTime,
  STATUS_COLOR,
  SESSION_TYPE_LABEL,
  utcToLocal,
} from "../../lib/agenda-utils";
import type { Booking, TimeBlock, AvailabilityRule, Lead } from "../../lib/db";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

// Constantes estáticas fora do componente para preservar identidade referencial estrita
const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "",
} as const;

const CALENDAR_LOCALES = [ptBrLocale];

const SLOT_LABEL_FORMAT = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} as const;

const EVENT_ALLOW = (dropInfo: any) => !dropInfo.allDay;

function areBookingsEqual(prev: Booking[], next: Booking[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (
      prev[i].id !== next[i].id ||
      prev[i].status !== next[i].status ||
      prev[i].start_at !== next[i].start_at ||
      prev[i].end_at !== next[i].end_at ||
      prev[i].deposit_status !== next[i].deposit_status
    ) {
      return false;
    }
  }
  return true;
}

function areTimeBlocksEqual(prev: TimeBlock[], next: TimeBlock[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (
      prev[i].id !== next[i].id ||
      prev[i].start_at !== next[i].start_at ||
      prev[i].end_at !== next[i].end_at ||
      prev[i].all_day !== next[i].all_day
    ) {
      return false;
    }
  }
  return true;
}

export interface AgendaTabProps {
  leadToSchedule?: Lead | null;
  onLeadScheduled?: () => void;
}

export function AgendaTab({ leadToSchedule, onLeadScheduled }: AgendaTabProps) {
  // 1. Estados fundamentais
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [rules, setRules] = React.useState<AvailabilityRule[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [timeBlocks, setTimeBlocks] = React.useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [showCancelled, setShowCancelled] = React.useState<boolean>(false);
  const [currentView, setCurrentView] = React.useState<string>("timeGridDay");

  // Estados de Drawer, Modal e Diálogos
  const [drawerBookingId, setDrawerBookingId] = React.useState<string | null>(null);
  const [modalState, setModalState] = React.useState<{
    open: boolean;
    mode: "create" | "reschedule";
    booking?: Booking | null;
    lead?: Lead | null;
    defaultDate?: string;
    defaultTime?: string;
    defaultEndTime?: string;
  }>({ open: false, mode: "create" });

  const [rescheduleConfirmState, setRescheduleConfirmState] = React.useState<{
    id: string;
    newStart: string;
    newEnd: string;
  } | null>(null);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = React.useState<boolean>(false);

  // Refs para controle de faixa estável e prevenção absoluta de loops
  const calendarRef = React.useRef<any>(null);
  const visibleRangeRef = React.useRef<{ from: string; to: string } | null>(null);
  const currentRangeRef = React.useRef<{ from: string; to: string } | null>(null);
  const requestIdRef = React.useRef<number>(0);

  // 2. Fetch de configurações e regras de expediente iniciais
  const loadInitialConfig = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, rulesRes] = await Promise.all([
        apiFetch<{ success?: boolean; settings?: Record<string, string> }>("/api/settings"),
        apiFetch<{ success?: boolean; rules?: AvailabilityRule[] }>("/api/availability-rules"),
      ]);

      if (settingsRes.ok && settingsRes.data?.settings) {
        setSettings(settingsRes.data.settings ?? {});
      }
      if (rulesRes.ok && rulesRes.data?.rules) {
        setRules(rulesRes.data.rules ?? []);
      }
      setIsReady(true);
    } catch (err) {
      console.error("[AgendaTab] Erro ao carregar configurações iniciais:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadInitialConfig();
  }, [loadInitialConfig]);

  // 3. Fetch de agendamentos e bloqueios baseado no range visível
  const fetchEventsForRange = React.useCallback(async (from: string, to: string) => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    // Instrumentação de depuração acessível no console/DevTools
    if (typeof window !== "undefined") {
      (window as any).__agendaFetchCount = ((window as any).__agendaFetchCount || 0) + 1;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[AgendaTab] API Fetch (#${(window as any).__agendaFetchCount}): ${from} -> ${to}`);
      }
    }

    try {
      const [bookingsRes, timeBlocksRes] = await Promise.all([
        apiFetch<{ success?: boolean; bookings?: Booking[] }>(
          `/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        ),
        apiFetch<{ success?: boolean; timeBlocks?: TimeBlock[] }>(
          `/api/time-blocks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        ),
      ]);

      // Descarta se uma requisição mais recente já tiver sido disparada
      if (currentRequestId !== requestIdRef.current) return;

      if (bookingsRes.ok && bookingsRes.data?.bookings) {
        const next = bookingsRes.data.bookings;
        setBookings((prev) => (areBookingsEqual(prev, next) ? prev : next));
      }
      if (timeBlocksRes.ok && timeBlocksRes.data?.timeBlocks) {
        const next = timeBlocksRes.data.timeBlocks;
        setTimeBlocks((prev) => (areTimeBlocksEqual(prev, next) ? prev : next));
      }
    } catch (err) {
      console.error("[AgendaTab] Erro ao buscar agendamentos do intervalo:", err);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Força atualização manual mesmo no mesmo range
  const handleRefresh = React.useCallback(() => {
    if (visibleRangeRef.current) {
      fetchEventsForRange(visibleRangeRef.current.from, visibleRangeRef.current.to);
    }
  }, [fetchEventsForRange]);

  // 4. Callback datesSet do FullCalendar com blindagem anti-loop
  const handleDatesSet = React.useCallback(
    (info: DatesSetArg) => {
      const from = toUTCString(info.start);
      const to = toUTCString(info.end);

      // BLINDAGEM CRÍTICA: ignora chamadas com a mesma faixa já buscada
      if (
        currentRangeRef.current &&
        currentRangeRef.current.from === from &&
        currentRangeRef.current.to === to
      ) {
        return;
      }

      currentRangeRef.current = { from, to };
      visibleRangeRef.current = { from, to };
      setCurrentView(info.view.type);
      fetchEventsForRange(from, to);
    },
    [fetchEventsForRange]
  );

  // 5. Cálculos memorizados (useMemo)
  const businessHours = React.useMemo(() => {
    const active = rules.filter((r) => r.is_active === 1);
    return active.map((r) => ({
      daysOfWeek: [r.day_of_week],
      startTime: r.window_start,
      endTime: r.window_end,
    }));
  }, [rules]);

  const slotMinTime = React.useMemo(() => deriveSlotMinTime(rules), [rules]);
  const slotMaxTime = React.useMemo(() => deriveSlotMaxTime(rules), [rules]);
  const timezone = settings["timezone"] || "America/Sao_Paulo";

  const events = React.useMemo(() => {
    const bEvents = bookings
      .map((b) => bookingToEvent(b, showCancelled, true))
      .filter(Boolean);
    const tbEvents = timeBlocks.map((tb) => timeBlockToEvent(tb));
    return [...bEvents, ...tbEvents];
  }, [bookings, timeBlocks, showCancelled]);

  // Reagir a leadToSchedule quando pronto
  React.useEffect(() => {
    if (leadToSchedule && isReady) {
      setModalState({
        open: true,
        mode: "create",
        lead: leadToSchedule,
      });
    }
  }, [leadToSchedule, isReady]);

  // 6. Custom Event Content Renderer memorizado
  const renderEventContent = React.useCallback((arg: EventContentArg) => {
    if (arg.event.display === "background") {
      return (
        <div className="p-1.5 flex items-start">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-100 bg-red-950/90 px-2 py-0.5 border border-red-500/40 rounded shadow-md">
            🚫 {arg.event.title}
          </span>
        </div>
      );
    }

    const b = arg.event.extendedProps?.booking as Booking | undefined;
    if (!b) return <span>{arg.event.title}</span>;

    const timeText = arg.timeText;
    const sessionLabel = SESSION_TYPE_LABEL[b.session_type] ?? b.session_type;

    return (
      <div className="flex flex-col h-full w-full justify-between p-1.5 overflow-hidden leading-tight">
        <div className="flex items-center justify-between gap-1">
          <span className="font-extrabold text-[11px] truncate tracking-tight text-[#070707]">
            {b.client_name}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-black/20 text-[#070707] rounded">
            {sessionLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 text-[9px] text-[#070707]/80 mt-0.5 font-mono">
          <span>{timeText}</span>
          <span className="capitalize">{b.status}</span>
        </div>
      </div>
    );
  }, []);

  // 7. Handlers de Interação memorizados
  const handleEventClick = React.useCallback((info: EventClickArg) => {
    const b = info.event.extendedProps?.booking as Booking | undefined;
    if (b) {
      setDrawerBookingId(b.id);
    }
  }, []);

  const handleSelect = React.useCallback(
    (info: DateSelectArg) => {
      if (!isReady) return;

      if (info.view.type === "dayGridMonth") {
        setModalState({
          open: true,
          mode: "create",
          defaultDate: info.startStr.slice(0, 10),
        });
      } else {
        const localStart = utcToLocal(toUTCString(info.start), timezone);
        const localEnd = utcToLocal(toUTCString(info.end), timezone);
        setModalState({
          open: true,
          mode: "create",
          defaultDate: localStart.date,
          defaultTime: localStart.time,
          defaultEndTime: localEnd.time,
        });
      }
    },
    [isReady, timezone]
  );

  const handleRescheduleDropOrResize = React.useCallback(
    async (info: any) => {
      const id = info.event.id;
      const newStart = toUTCString(info.event.start);
      const newEnd = toUTCString(info.event.end);

      const res = await apiFetch<{
        success?: boolean;
        error?: string;
        warning?: string;
        message?: string;
        conflicts?: Array<{ client_name: string }>;
      }>(`/api/bookings/${id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ start_at: newStart, end_at: newEnd, force: false }),
      });

      if (!res.ok) {
        info.revert();
        if (res.data?.warning === "outside_hours") {
          setRescheduleConfirmState({ id, newStart, newEnd });
          setShowRescheduleConfirm(true);
          return;
        }
        const conflicts = res.data?.conflicts;
        if (conflicts && conflicts.length > 0) {
          toast.error(
            `${getErrorMessage(res.data?.error)} (Conflito com: ${conflicts.map((c) => c.client_name).join(", ")})`
          );
        } else {
          toast.error(res.data?.message || getErrorMessage(res.data?.error));
        }
        return;
      }

      toast.success("Agendamento remarcado com sucesso!");
      handleRefresh();
    },
    [handleRefresh]
  );

  const handleConfirmRescheduleForce = React.useCallback(async () => {
    if (!rescheduleConfirmState) return;
    const { id, newStart, newEnd } = rescheduleConfirmState;

    const res = await apiFetch<{
      success?: boolean;
      error?: string;
      message?: string;
    }>(`/api/bookings/${id}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ start_at: newStart, end_at: newEnd, force: true }),
    });

    setShowRescheduleConfirm(false);
    setRescheduleConfirmState(null);

    if (res.ok) {
      toast.success("Agendamento remarcado fora do expediente com confirmação.");
      handleRefresh();
    } else {
      toast.error(res.data?.message || getErrorMessage(res.data?.error));
    }
  }, [rescheduleConfirmState, handleRefresh]);

  // 8. Early return de renderização SOMENTE após todos os hooks
  if (!isReady) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-black/40 border border-white/5 min-h-[550px] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#9be5ff] border-t-transparent animate-spin" />
        <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-neutral-400">
          Carregando Parâmetros do Ateliê...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Controles e Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 p-4">
        {/* Lado Esquerdo: Identificação e Fuso */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#9be5ff]/10 border border-[#9be5ff]/30 flex items-center justify-center text-[#9be5ff]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-white flex items-center gap-2">
              Agenda do Ateliê
              <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-neutral-400">
                {timezone}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Grade horária com detecção de expediente, intervalos e proteção de sobreposição
            </p>
          </div>
        </div>

        {/* Lado Direito: Ações e Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Novo Agendamento */}
          <button
            onClick={() => setModalState({ open: true, mode: "create" })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#9be5ff] text-[#070707] hover:bg-[#b0ecff] transition-all cursor-pointer shadow-[0_0_12px_rgba(155,229,255,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Agendamento
          </button>

          {/* Seletor de visualizações rápidas */}
          <div className="flex items-center border border-white/10 bg-black/40 text-xs font-bold">
            <button
              onClick={() => {
                const api = calendarRef.current?.getApi?.() || calendarRef.current;
                api?.changeView?.("timeGridDay");
              }}
              className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${
                currentView === "timeGridDay"
                  ? "bg-[#9be5ff] text-[#070707]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => {
                const api = calendarRef.current?.getApi?.() || calendarRef.current;
                api?.changeView?.("timeGridWeek");
              }}
              className={`px-3 py-1.5 uppercase tracking-wider transition-colors border-x border-white/10 ${
                currentView === "timeGridWeek"
                  ? "bg-[#9be5ff] text-[#070707]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => {
                const api = calendarRef.current?.getApi?.() || calendarRef.current;
                api?.changeView?.("dayGridMonth");
              }}
              className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${
                currentView === "dayGridMonth"
                  ? "bg-[#9be5ff] text-[#070707]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Mês
            </button>
          </div>

          {/* Toggle de Cancelados */}
          <button
            onClick={() => setShowCancelled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
              showCancelled
                ? "bg-neutral-800 text-white border-white/30"
                : "bg-black/40 text-neutral-400 border-white/10 hover:text-white"
            }`}
            title="Exibir agendamentos cancelados e faltas"
          >
            {showCancelled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showCancelled ? "Cancelados ON" : "Cancelados OFF"}
          </button>

          {/* Botão de Atualizar */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-white/10 bg-black/40 text-neutral-300 hover:text-[#9be5ff] hover:border-[#9be5ff]/40 transition-colors disabled:opacity-50 cursor-pointer"
            title="Recarregar agendamentos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Legenda de Status e Categorias */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-black/30 border border-white/5 text-[11px] text-neutral-400">
        <span className="font-extrabold uppercase tracking-wider text-neutral-500 mr-1">Legenda:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR.pendente }} />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR.confirmado }} />
          <span>Confirmado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR.concluido }} />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR.cancelado }} />
          <span>Cancelado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR.no_show }} />
          <span>Falta (No-Show)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500/25 border border-red-500/50" />
          <span>Bloqueio / Folga</span>
        </div>
      </div>

      {/* Calendário FullCalendar — Onda B (Interativo com props estritamente estáveis) */}
      <div className="bg-[#070707] border border-white/10 p-4 min-h-[650px]">
        <FullCalendarClient
          ref={calendarRef}
          initialView="timeGridDay"
          headerToolbar={HEADER_TOOLBAR}
          locales={CALENDAR_LOCALES}
          locale="pt-br"
          timeZone={timezone}
          slotMinTime={slotMinTime}
          slotMaxTime={slotMaxTime}
          businessHours={businessHours}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={SLOT_LABEL_FORMAT}
          allDaySlot={true}
          allDayText="Dia Inteiro"
          events={events}
          eventContent={renderEventContent}
          datesSet={handleDatesSet}
          editable={true}
          selectable={true}
          eventDurationEditable={true}
          eventAllow={EVENT_ALLOW}
          eventClick={handleEventClick}
          select={handleSelect}
          eventDrop={handleRescheduleDropOrResize}
          eventResize={handleRescheduleDropOrResize}
          height="auto"
          nowIndicator={true}
        />
      </div>

      {/* Drawer lateral de detalhes do agendamento */}
      <BookingDrawer
        bookingId={drawerBookingId}
        onClose={() => setDrawerBookingId(null)}
        onRefresh={handleRefresh}
        onReschedule={(b) => setModalState({ open: true, mode: "reschedule", booking: b })}
        timezone={timezone}
      />

      {/* Modal de Criação e Remarcação */}
      <BookingModal
        open={modalState.open}
        mode={modalState.mode}
        bookingToReschedule={modalState.booking}
        leadData={modalState.lead}
        defaultDate={modalState.defaultDate}
        defaultTime={modalState.defaultTime}
        defaultEndTime={modalState.defaultEndTime}
        timezone={timezone}
        settings={settings}
        onClose={() => {
          setModalState({ open: false, mode: "create" });
          onLeadScheduled?.();
        }}
        onSuccess={handleRefresh}
      />

      {/* Confirmação de fora de expediente ao arrastar ou redimensionar */}
      <ConfirmDialog
        open={showRescheduleConfirm}
        onOpenChange={setShowRescheduleConfirm}
        title="Remarcar Fora do Expediente"
        description="O novo horário selecionado está fora do horário regular de atendimento configurado no ateliê. Deseja confirmar a remarcação mesmo assim?"
        confirmLabel="Confirmar mesmo assim"
        cancelLabel="Voltar ao horário anterior"
        onConfirm={handleConfirmRescheduleForce}
        onCancel={() => {
          setShowRescheduleConfirm(false);
          setRescheduleConfirmState(null);
        }}
        variant="warning"
      />
    </div>
  );
}
