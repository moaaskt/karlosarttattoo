import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "./ConfirmDialog";
import { apiFetch, getErrorMessage } from "../../../lib/api-client";
import type { AvailabilityRule } from "../../../lib/db";
import {
  Clock,
  Sliders,
  Globe,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Check,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export interface AgendaSettingsProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  settings: Record<string, string>;
  rules: AvailabilityRule[];
}

const DAYS_OF_WEEK = [
  { id: 0, label: "Domingo", short: "Dom" },
  { id: 1, label: "Segunda-feira", short: "Seg" },
  { id: 2, label: "Terça-feira", short: "Ter" },
  { id: 3, label: "Quarta-feira", short: "Qua" },
  { id: 4, label: "Quinta-feira", short: "Qui" },
  { id: 5, label: "Sexta-feira", short: "Sex" },
  { id: 6, label: "Sábado", short: "Sáb" },
];

export function AgendaSettings({
  open,
  onClose,
  onSaved,
  settings: initialSettings,
  rules: initialRules,
}: AgendaSettingsProps) {
  // 1. Estados de configurações gerais
  const [bufferMinutes, setBufferMinutes] = React.useState<number>(30);
  const [presets, setPresets] = React.useState<string[]>(["09:00", "14:00", "19:00"]);
  const [newPresetTime, setNewPresetTime] = React.useState<string>("");
  const [timezone, setTimezone] = React.useState<string>("America/Sao_Paulo");

  // Estado de desbloqueio do Fuso Horário
  const [isTimezoneUnlocked, setIsTimezoneUnlocked] = React.useState<boolean>(false);
  const [showTimezoneConfirm, setShowTimezoneConfirm] = React.useState<boolean>(false);

  // 2. Estado das regras de disponibilidade
  const [localRules, setLocalRules] = React.useState<
    Array<{
      id?: string;
      day_of_week: number;
      window_start: string;
      window_end: string;
      is_active: number;
    }>
  >([]);

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [overlapErrors, setOverlapErrors] = React.useState<Record<number, string>>({});

  // Carrega valores quando o modal é aberto
  React.useEffect(() => {
    if (open) {
      const buf = initialSettings["buffer_minutes"]
        ? parseInt(initialSettings["buffer_minutes"], 10)
        : 30;
      setBufferMinutes(isNaN(buf) ? 30 : Math.min(240, Math.max(0, buf)));

      try {
        const parsedPresets = initialSettings["presets"]
          ? JSON.parse(initialSettings["presets"])
          : ["09:00", "14:00", "19:00"];
        setPresets(Array.isArray(parsedPresets) ? parsedPresets : ["09:00", "14:00", "19:00"]);
      } catch {
        setPresets(["09:00", "14:00", "19:00"]);
      }

      setTimezone(initialSettings["timezone"] || "America/Sao_Paulo");
      setIsTimezoneUnlocked(false);

      // Clona regras existentes garantindo estrutura
      const cloned = initialRules.map((r) => ({
        id: r.id,
        day_of_week: r.day_of_week,
        window_start: r.window_start,
        window_end: r.window_end,
        is_active: r.is_active,
      }));
      setLocalRules(cloned);
      setOverlapErrors({});
    }
  }, [open, initialSettings, initialRules]);

  // Validação em tempo real contra sobreposição de horários no mesmo dia
  React.useEffect(() => {
    const errors: Record<number, string> = {};

    for (let day = 0; day <= 6; day++) {
      const activeWindows = localRules
        .filter((r) => r.day_of_week === day && r.is_active === 1)
        .slice()
        .sort((a, b) => a.window_start.localeCompare(b.window_start));

      for (let i = 0; i < activeWindows.length; i++) {
        const curr = activeWindows[i];
        if (curr.window_end <= curr.window_start) {
          errors[day] = `Término (${curr.window_end}) deve ser posterior ao início (${curr.window_start}).`;
          break;
        }
        if (i < activeWindows.length - 1) {
          const next = activeWindows[i + 1];
          if (curr.window_end > next.window_start) {
            errors[day] = `Sobreposição detectada: ${curr.window_start}–${curr.window_end} colide com ${next.window_start}–${next.window_end}.`;
            break;
          }
        }
      }
    }

    setOverlapErrors(errors);
  }, [localRules]);

  // Modificadores de regras
  const handleToggleDay = (day: number) => {
    setLocalRules((prev) => {
      const dayWindows = prev.filter((r) => r.day_of_week === day);
      if (dayWindows.length === 0) {
        // Cria janela padrão 09:00 - 18:00
        return [
          ...prev,
          { day_of_week: day, window_start: "09:00", window_end: "18:00", is_active: 1 },
        ];
      }
      // Inverte ativação de todas as janelas do dia
      const anyActive = dayWindows.some((r) => r.is_active === 1);
      const newActive = anyActive ? 0 : 1;
      return prev.map((r) => (r.day_of_week === day ? { ...r, is_active: newActive } : r));
    });
  };

  const handleAddWindow = (day: number) => {
    setLocalRules((prev) => [
      ...prev,
      { day_of_week: day, window_start: "14:00", window_end: "18:00", is_active: 1 },
    ]);
  };

  const handleRemoveWindow = (index: number) => {
    setLocalRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateWindow = (
    index: number,
    field: "window_start" | "window_end",
    val: string,
  ) => {
    setLocalRules((prev) =>
      prev.map((r, idx) => (idx === index ? { ...r, [field]: val } : r)),
    );
  };

  // Modificadores de Presets
  const handleAddPreset = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newPresetTime)) {
      toast.error("Formato inválido. Use HH:mm (ex: 10:30).");
      return;
    }
    if (presets.includes(newPresetTime)) {
      toast.error("Este horário já existe na lista.");
      return;
    }
    const updated = [...presets, newPresetTime].sort();
    setPresets(updated);
    setNewPresetTime("");
  };

  const handleRemovePreset = (time: string) => {
    setPresets((prev) => prev.filter((p) => p !== time));
  };

  // Submissão Atômica
  const handleSave = async () => {
    if (Object.keys(overlapErrors).length > 0) {
      toast.error("Corrija as sobreposições de horários antes de salvar.");
      return;
    }

    if (bufferMinutes < 0 || bufferMinutes > 240) {
      toast.error("O buffer deve ser entre 0 e 240 minutos.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Atualiza configurações gerais
      const settingsPayload: Record<string, string> = {
        buffer_minutes: String(bufferMinutes),
        presets: JSON.stringify(presets),
      };
      if (isTimezoneUnlocked) {
        settingsPayload.timezone = timezone;
      }

      const settingsRes = await apiFetch<{ success?: boolean; error?: string }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: settingsPayload }),
      });

      if (!settingsRes.ok) {
        throw new Error(settingsRes.data?.error || "Falha ao salvar parâmetros.");
      }

      // 2. Atualiza regras de disponibilidade em lote
      const rulesRes = await apiFetch<{ success?: boolean; error?: string }>(
        "/api/availability-rules",
        {
          method: "PUT",
          body: JSON.stringify({ rules: localRules }),
        },
      );

      if (!rulesRes.ok) {
        throw new Error(rulesRes.data?.error || "Falha ao salvar horários de expediente.");
      }

      toast.success("Configurações da agenda atualizadas com sucesso.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-w-2xl bg-[#1c2128] border border-white/10 text-[#EEEEEE] p-0 overflow-hidden shadow-2xl rounded-none">
          <DialogHeader className="p-5 border-b border-white/10 bg-[#222831]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#76ABAE]/15 border border-[#76ABAE]/30 flex items-center justify-center text-[#76ABAE]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#EEEEEE]">
                  Configurações da Agenda
                </DialogTitle>
                <DialogDescription className="text-xs text-[#9DA5B4] mt-0.5">
                  Parâmetros operacionais, intervalos e janelas de funcionamento do ateliê
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Aviso de Não-Revalidação Retroativa */}
            <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Aviso de Não-Revalidação Retroativa:</strong> Alterações de buffer simétrico
                e horários de expediente aplicam-se exclusivamente a novos agendamentos e
                reagendamentos futuros. Agendamentos existentes no histórico permanecem inalterados.
              </span>
            </div>

            {/* SEÇÃO 1: Horários de Expediente */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#76ABAE]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                    Expediente Semanal
                  </h3>
                </div>
                <span className="text-[11px] text-[#9DA5B4]">
                  Defina os turnos de atendimento por dia
                </span>
              </div>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayWindows = localRules.filter((r) => r.day_of_week === day.id);
                  const isActive = dayWindows.some((r) => r.is_active === 1);
                  const errorMsg = overlapErrors[day.id];

                  return (
                    <div
                      key={day.id}
                      className={`p-3 border transition-colors ${
                        isActive
                          ? "bg-[#222831]/70 border-white/10"
                          : "bg-black/20 border-white/5 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => handleToggleDay(day.id)}
                            className="rounded-none border-white/20 bg-black/40 text-[#76ABAE] focus:ring-0 w-4 h-4"
                          />
                          <span className="text-xs font-bold text-[#EEEEEE] uppercase tracking-wider">
                            {day.label}
                          </span>
                        </label>

                        {isActive && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddWindow(day.id)}
                            className="h-6 px-2 text-[10px] uppercase font-bold text-[#76ABAE] hover:bg-[#76ABAE]/10 rounded-none cursor-pointer"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Adicionar Turno
                          </Button>
                        )}
                      </div>

                      {errorMsg && (
                        <div className="text-[11px] text-red-400 font-medium mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {errorMsg}
                        </div>
                      )}

                      {isActive && (
                        <div className="space-y-2 pl-6">
                          {dayWindows.map((win) => {
                            const globalIndex = localRules.indexOf(win);
                            return (
                              <div key={globalIndex} className="flex items-center gap-2">
                                <span className="text-[11px] text-[#9DA5B4] font-mono">Das</span>
                                <Input
                                  type="time"
                                  value={win.window_start}
                                  onChange={(e) =>
                                    handleUpdateWindow(globalIndex, "window_start", e.target.value)
                                  }
                                  className="w-28 h-7 text-xs bg-black/40 border-white/10 text-[#EEEEEE] font-mono rounded-none"
                                />
                                <span className="text-[11px] text-[#9DA5B4] font-mono">às</span>
                                <Input
                                  type="time"
                                  value={win.window_end}
                                  onChange={(e) =>
                                    handleUpdateWindow(globalIndex, "window_end", e.target.value)
                                  }
                                  className="w-28 h-7 text-xs bg-black/40 border-white/10 text-[#EEEEEE] font-mono rounded-none"
                                />

                                {dayWindows.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveWindow(globalIndex)}
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-none cursor-pointer"
                                    title="Remover intervalo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 2: Parâmetros Operacionais & Presets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
              {/* Buffer Simétrico */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE] flex items-center justify-between">
                  <span>Buffer Simétrico (Minutos)</span>
                  <span className="font-mono text-[#76ABAE] text-sm">{bufferMinutes} min</span>
                </Label>
                <p className="text-[11px] text-[#9DA5B4]">
                  Tempo reservado automaticamente antes e depois de cada sessão para higienização e
                  preparação.
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={240}
                    step={5}
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-8 bg-black/40 border-white/10 text-[#EEEEEE] font-mono rounded-none"
                  />
                  <div className="flex items-center gap-1">
                    {[15, 30, 45, 60].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBufferMinutes(preset)}
                        className={`h-8 px-2 text-[10px] font-mono rounded-none border-white/10 ${
                          bufferMinutes === preset
                            ? "bg-[#76ABAE] text-[#222831] font-bold"
                            : "bg-[#222831] text-[#9DA5B4]"
                        }`}
                      >
                        {preset}m
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Presets de Horário Rápido */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                  Horários Rápidos (Presets)
                </Label>
                <p className="text-[11px] text-[#9DA5B4]">
                  Botões de preenchimento ágil no modal de novo agendamento.
                </p>

                <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center p-1.5 bg-black/30 border border-white/10">
                  {presets.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#222831] border border-white/10 text-xs font-mono text-[#EEEEEE]"
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() => handleRemovePreset(time)}
                        className="text-neutral-400 hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                        title={`Remover ${time}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="time"
                    value={newPresetTime}
                    onChange={(e) => setNewPresetTime(e.target.value)}
                    className="h-7 text-xs bg-black/40 border-white/10 text-[#EEEEEE] font-mono rounded-none w-28"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPreset}
                    className="h-7 px-2.5 text-[10px] uppercase font-bold border-white/10 text-[#76ABAE] hover:bg-[#76ABAE]/10 rounded-none cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Fuso Horário do Ateliê */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#76ABAE]" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                    Fuso Horário Oficial do Ateliê
                  </Label>
                </div>

                {!isTimezoneUnlocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTimezoneConfirm(true)}
                    className="h-6 px-2 text-[10px] uppercase font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-none cursor-pointer"
                  >
                    Alterar Fuso
                  </Button>
                ) : (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Modo Edição Ativo
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#9DA5B4]">
                Todas as conversões de horário de expediente e visualizações de grade utilizam este
                fuso referencial.
              </p>

              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={timezone}
                  disabled={!isTimezoneUnlocked}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={`h-8 font-mono text-xs rounded-none ${
                    isTimezoneUnlocked
                      ? "bg-black/60 border-amber-500/50 text-amber-200"
                      : "bg-black/30 border-white/10 text-[#9DA5B4] cursor-not-allowed"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="p-4 border-t border-white/10 bg-[#222831] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs uppercase tracking-wider border-white/10 text-[#9DA5B4] hover:text-[#EEEEEE] rounded-none cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting || Object.keys(overlapErrors).length > 0}
              className="text-xs font-semibold uppercase tracking-wider bg-[#76ABAE] text-[#222831] hover:bg-[#76ABAE]/90 transition-all rounded-none cursor-pointer shadow-[0_0_12px_rgba(118,171,174,0.25)] flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#222831] border-t-transparent animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Desbloquear Fuso Horário */}
      <ConfirmDialog
        open={showTimezoneConfirm}
        title="Alterar Fuso Horário do Ateliê?"
        description="Atenção crítica: A modificação do fuso horário altera o referencial temporal de todas as janelas de expediente e relatórios analíticos futuros. Certifique-se de informar um identificador IANA oficial (ex: 'America/Sao_Paulo'). Deseja prosseguir?"
        confirmLabel="Sim, Desbloquear Fuso"
        cancelLabel="Manter Bloqueado"
        variant="destructive"
        onConfirm={() => {
          setIsTimezoneUnlocked(true);
          setShowTimezoneConfirm(false);
        }}
        onCancel={() => setShowTimezoneConfirm(false)}
      />
    </>
  );
}
