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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "./ConfirmDialog";
import { apiFetch, getErrorMessage } from "../../../lib/api-client";
import { localToUTC, utcToLocal, REASON_TAG_LABEL } from "../../../lib/agenda-utils";
import type { TimeBlock } from "../../../lib/db";
import {
  CalendarOff,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export interface TimeBlocksModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  timeBlocks: TimeBlock[];
  timezone?: string;
  defaultDate?: string;
}

export function TimeBlocksModal({
  open,
  onClose,
  onSaved,
  timeBlocks,
  timezone = "America/Sao_Paulo",
  defaultDate,
}: TimeBlocksModalProps) {
  const [tab, setTab] = React.useState<"create" | "list">("create");

  // Formulário de Criação
  const [reasonTag, setReasonTag] = React.useState<TimeBlock["reason_tag"]>("folga_criacao");
  const [isAllDay, setIsAllDay] = React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [startTime, setStartTime] = React.useState<string>("09:00");
  const [endTime, setEndTime] = React.useState<string>("18:00");
  const [note, setNote] = React.useState<string>("");

  // Estado de Conflito D-08
  const [conflicts, setConflicts] = React.useState<
    Array<{
      id: string;
      client_name?: string;
      reason?: string;
      start_at: string;
      end_at: string;
      type: "booking" | "time_block";
    }>
  >([]);
  const [forceConfirmed, setForceConfirmed] = React.useState<boolean>(false);

  // Exclusão com confirmação
  const [blockToDelete, setBlockToDelete] = React.useState<TimeBlock | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Inicialização ao abrir modal
  React.useEffect(() => {
    if (open) {
      const today = defaultDate || new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setStartTime("09:00");
      setEndTime("18:00");
      setNote("");
      setReasonTag("folga_criacao");
      setIsAllDay(false);
      setConflicts([]);
      setForceConfirmed(false);
      setTab("create");
    }
  }, [open, defaultDate]);

  // Submissão do bloqueio
  const handleSubmit = async (force: boolean = false) => {
    if (!startDate) {
      toast.error("Informe a data de início.");
      return;
    }

    setIsSubmitting(true);
    try {
      let startAt: string;
      let endAt: string;

      if (isAllDay) {
        // Envia datas YYYY-MM-DD para expansão segura no backend
        startAt = startDate;
        endAt = endDate || startDate;
      } else {
        if (!startTime || !endTime) {
          toast.error("Informe os horários de início e término.");
          setIsSubmitting(false);
          return;
        }
        if (endTime <= startTime) {
          toast.error("O horário de término deve ser posterior ao horário de início.");
          setIsSubmitting(false);
          return;
        }
        startAt = localToUTC(startDate, startTime, timezone);
        endAt = localToUTC(endDate || startDate, endTime, timezone);
      }

      const res = await apiFetch<{
        success?: boolean;
        error?: string;
        conflict_type?: string;
        conflicts?: Array<{
          id: string;
          client_name?: string;
          reason?: string;
          start_at: string;
          end_at: string;
          type: "booking" | "time_block";
        }>;
        message?: string;
      }>("/api/time-blocks", {
        method: "POST",
        body: JSON.stringify({
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay ? 1 : 0,
          reason_tag: reasonTag,
          note: note.trim() || undefined,
          force,
        }),
      });

      if (res.status === 409 && res.data?.conflicts) {
        // Conflito D-08 detectado
        setConflicts(res.data.conflicts);
        setForceConfirmed(false);
        toast.warning("Conflito detectado com agendamentos ou bloqueios existentes.");
        return;
      }

      if (!res.ok) {
        throw new Error(res.data?.message || res.data?.error || "Erro ao salvar bloqueio.");
      }

      toast.success("Período bloqueado com sucesso na agenda.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exclusão de bloqueio
  const handleDeleteBlock = async () => {
    if (!blockToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/time-blocks/${blockToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.data?.error || "Erro ao remover bloqueio.");
      }
      toast.success("Bloqueio removido com sucesso.");
      setBlockToDelete(null);
      onSaved();
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <CalendarOff className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#EEEEEE]">
                    Bloqueios de Agenda
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#9DA5B4] mt-0.5">
                    Reserve datas para viagens, convenções, folgas ou trabalhos autorais
                  </DialogDescription>
                </div>
              </div>

              {/* Seletor de Abas */}
              <div className="flex items-center border border-white/10 bg-black/40 text-xs font-bold">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("create")}
                  className={`h-7 px-3 text-[11px] uppercase tracking-wider rounded-none ${
                    tab === "create"
                      ? "bg-[#76ABAE] text-[#222831] font-semibold"
                      : "text-[#9DA5B4] hover:text-[#EEEEEE]"
                  }`}
                >
                  Novo Bloqueio
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("list")}
                  className={`h-7 px-3 text-[11px] uppercase tracking-wider rounded-none border-l border-white/10 ${
                    tab === "list"
                      ? "bg-[#76ABAE] text-[#222831] font-semibold"
                      : "text-[#9DA5B4] hover:text-[#EEEEEE]"
                  }`}
                >
                  Cadastrados ({timeBlocks.length})
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {tab === "create" ? (
              <div className="space-y-5">
                {/* Motivo do Bloqueio */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                    Motivo do Bloqueio
                  </Label>
                  <Select
                    value={reasonTag}
                    onValueChange={(val: any) => {
                      setReasonTag(val);
                      setConflicts([]);
                    }}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 text-[#EEEEEE] text-xs h-9 rounded-none">
                      <SelectValue placeholder="Selecione o motivo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222831] border-white/10 text-[#EEEEEE] rounded-none">
                      <SelectItem value="folga_criacao">Folga / Criação Artística</SelectItem>
                      <SelectItem value="viagem_guest">Viagem / Guest Spot</SelectItem>
                      <SelectItem value="evento">Evento / Convenção de Tattoo</SelectItem>
                      <SelectItem value="pessoal">Compromisso Pessoal</SelectItem>
                      <SelectItem value="outro">Outro Bloqueio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Opção Dia Inteiro */}
                <div className="flex items-center gap-2.5 p-3 bg-black/30 border border-white/10 select-none">
                  <input
                    type="checkbox"
                    id="tb-all-day"
                    checked={isAllDay}
                    onChange={(e) => {
                      setIsAllDay(e.target.checked);
                      setConflicts([]);
                    }}
                    className="rounded-none border-white/20 bg-black/50 text-[#76ABAE] focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <Label
                    htmlFor="tb-all-day"
                    className="text-xs font-bold text-[#EEEEEE] uppercase tracking-wider cursor-pointer"
                  >
                    Dia Inteiro (Sem horário fixo)
                  </Label>
                </div>

                {/* Intervalo de Datas e Horários */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Início */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                      Data Inicial
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                        setConflicts([]);
                      }}
                      className="bg-black/40 border-white/10 text-[#EEEEEE] font-mono text-xs h-9 rounded-none"
                    />
                    {!isAllDay && (
                      <div className="pt-1 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#9DA5B4]" />
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value);
                            setConflicts([]);
                          }}
                          className="bg-black/40 border-white/10 text-[#EEEEEE] font-mono text-xs h-8 rounded-none w-28"
                        />
                        <span className="text-[11px] text-[#9DA5B4]">Início</span>
                      </div>
                    )}
                  </div>

                  {/* Término */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                      Data Final
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setConflicts([]);
                      }}
                      className="bg-black/40 border-white/10 text-[#EEEEEE] font-mono text-xs h-9 rounded-none"
                    />
                    {!isAllDay && (
                      <div className="pt-1 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#9DA5B4]" />
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value);
                            setConflicts([]);
                          }}
                          className="bg-black/40 border-white/10 text-[#EEEEEE] font-mono text-xs h-8 rounded-none w-28"
                        />
                        <span className="text-[11px] text-[#9DA5B4]">Término</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações / Descrição */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#EEEEEE]">
                    Observação ou Descrição (Opcional)
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Ex: Guest em São Paulo; Desenvolvimento de projeto fechamento de braço..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-black/40 border-white/10 text-[#EEEEEE] text-xs resize-none rounded-none"
                  />
                </div>

                {/* Resolução de Conflitos D-08 */}
                {conflicts.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      Conflitos Detectados no Período Selecionado ({conflicts.length})
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Existem compromissos que colidem com esta faixa horária. Bloquear este período
                      não cancelará as sessões existentes, mas sobreporá a agenda:
                    </p>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {conflicts.map((c) => {
                        const localStart = utcToLocal(c.start_at, timezone);
                        const localEnd = utcToLocal(c.end_at, timezone);
                        const conflictLabel =
                          c.type === "booking"
                            ? `Cliente: ${c.client_name || "Agendamento"}`
                            : `Bloqueio: ${c.reason || "Período Bloqueado"}`;

                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 bg-black/40 border border-amber-500/20 text-xs font-mono text-[#EEEEEE]"
                          >
                            <span className="font-bold text-amber-200 truncate mr-2">
                              {conflictLabel}
                            </span>
                            <span className="text-[10px] text-[#9DA5B4] shrink-0">
                              {localStart.date} {localStart.time}–{localEnd.time}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <label className="flex items-start gap-2.5 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={forceConfirmed}
                        onChange={(e) => setForceConfirmed(e.target.checked)}
                        className="rounded-none border-amber-500/40 bg-black/50 text-amber-500 focus:ring-0 w-4 h-4 mt-0.5"
                      />
                      <span className="text-xs font-bold text-amber-200">
                        Estou ciente dos conflitos e confirmo o bloqueio forçado deste período (force:
                        true)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              /* Aba: Bloqueios Cadastrados */
              <div className="space-y-3">
                {timeBlocks.length === 0 ? (
                  <div className="py-12 text-center text-[#9DA5B4] text-xs">
                    Nenhum período de bloqueio cadastrado na agenda.
                  </div>
                ) : (
                  timeBlocks.map((tb) => {
                    const localStart = utcToLocal(tb.start_at, timezone);
                    const localEnd = utcToLocal(tb.end_at, timezone);
                    const reasonLabel = REASON_TAG_LABEL[tb.reason_tag] || tb.reason_tag;

                    return (
                      <div
                        key={tb.id}
                        className="p-3.5 bg-black/30 border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-red-950/80 text-red-200 border border-red-500/40 rounded-none">
                              {reasonLabel}
                            </span>
                            {tb.all_day === 1 && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-white/5 text-[#9DA5B4]">
                                Dia Inteiro
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-mono text-[#EEEEEE] flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-[#76ABAE]" />
                            {tb.all_day === 1 ? (
                              <span>
                                {localStart.date}
                                {localStart.date !== localEnd.date && ` até ${localEnd.date}`}
                              </span>
                            ) : (
                              <span>
                                {localStart.date} ({localStart.time} às {localEnd.time})
                              </span>
                            )}
                          </div>

                          {tb.note && (
                            <p className="text-[11px] text-[#9DA5B4] italic pl-5">
                              "{tb.note}"
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBlockToDelete(tb)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-none cursor-pointer"
                          title="Excluir bloqueio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
              Fechar
            </Button>

            {tab === "create" && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSubmit(conflicts.length > 0 && forceConfirmed)}
                disabled={isSubmitting || (conflicts.length > 0 && !forceConfirmed)}
                className={`text-xs font-semibold uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                  conflicts.length > 0
                    ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-[#76ABAE] text-[#222831] hover:bg-[#76ABAE]/90 shadow-[0_0_12px_rgba(118,171,174,0.25)]"
                }`}
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {conflicts.length > 0 ? "Confirmar Bloqueio Forçado" : "Cadastrar Bloqueio"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Remover Bloqueio de Agenda?"
        description="Este período deixará de estar bloqueado e ficará imediatamente disponível para novos agendamentos na grade horária. Deseja confirmar a exclusão?"
        confirmLabel="Sim, Excluir Bloqueio"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteBlock}
        onCancel={() => setBlockToDelete(null)}
      />
    </>
  );
}
