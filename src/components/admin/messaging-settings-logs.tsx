import * as React from "react";
import {
  Settings,
  Server,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Key,
  Globe,
  Lock,
  Eye,
  EyeOff,
  History,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MessagingConfig, MessageLog } from "@/lib/messaging/types";

interface MessagingSettingsLogsProps {
  authKey: string;
}

export function MessagingSettingsLogs({ authKey }: MessagingSettingsLogsProps) {
  // Configurações
  const [evolutionUrl, setEvolutionUrl] = React.useState<string>("");
  const [evolutionApiKey, setEvolutionApiKey] = React.useState<string>("");
  const [instanceName, setInstanceName] = React.useState<string>("");

  const [smtpHost, setSmtpHost] = React.useState<string>("");
  const [smtpPort, setSmtpPort] = React.useState<string>("587");
  const [smtpUser, setSmtpUser] = React.useState<string>("");
  const [smtpPass, setSmtpPass] = React.useState<string>("");
  const [smtpFrom, setSmtpFrom] = React.useState<string>("");

  // Visibilidade de senhas
  const [showEvolutionKey, setShowEvolutionKey] = React.useState<boolean>(false);
  const [showSmtpPass, setShowSmtpPass] = React.useState<boolean>(false);

  // Estados de teste e gravação
  const [isLoadingConfig, setIsLoadingConfig] = React.useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = React.useState<boolean>(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = React.useState<boolean>(false);
  const [isTestingSmtp, setIsTestingSmtp] = React.useState<boolean>(false);

  const [whatsAppTestResult, setWhatsAppTestResult] = React.useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const [smtpTestResult, setSmtpTestResult] = React.useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Logs
  const [logs, setLogs] = React.useState<MessageLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState<boolean>(false);
  const [selectedLog, setSelectedLog] = React.useState<MessageLog | null>(null);

  // Carrega configurações existentes
  const loadConfig = React.useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch("/api/messages/config", {
        headers: {
          Authorization: `Bearer ${authKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const cfg: MessagingConfig = data.config || {};
        setEvolutionUrl(cfg.evolutionUrl || "");
        setEvolutionApiKey(cfg.evolutionApiKey || "");
        setInstanceName(cfg.instanceName || "");

        setSmtpHost(cfg.smtpHost || "");
        setSmtpPort(cfg.smtpPort ? String(cfg.smtpPort) : "587");
        setSmtpUser(cfg.smtpUser || "");
        setSmtpPass(cfg.smtpPass || "");
        setSmtpFrom(cfg.smtpFrom || "");
      }
    } catch (err) {
      console.error("[MessagingSettingsLogs] Erro ao carregar config:", err);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [authKey]);

  // Carrega logs de mensagens
  const loadLogs = React.useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/messages/logs?limit=50", {
        headers: {
          Authorization: `Bearer ${authKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("[MessagingSettingsLogs] Erro ao carregar logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [authKey]);

  React.useEffect(() => {
    loadConfig();
    loadLogs();
  }, [loadConfig, loadLogs]);

  // Salvar Configurações
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const payload: Partial<MessagingConfig> = {
        evolutionUrl: evolutionUrl.trim(),
        evolutionApiKey: evolutionApiKey.trim(),
        instanceName: instanceName.trim(),
        smtpHost: smtpHost.trim(),
        smtpPort: smtpPort ? Number(smtpPort) : 587,
        smtpUser: smtpUser.trim(),
        smtpPass: smtpPass.trim(),
        smtpFrom: smtpFrom.trim(),
      };

      const res = await fetch("/api/messages/config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar configurações no servidor.");
      }

      toast.success("Configurações de mensageria salvas com sucesso!");
      loadConfig();
    } catch (err: any) {
      toast.error("Falha ao salvar configurações", { description: err.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Testar Conexão WhatsApp (Evolution API v2)
  const handleTestWhatsApp = async () => {
    setIsTestingWhatsApp(true);
    setWhatsAppTestResult(null);
    try {
      const res = await fetch("/api/messages/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          channel: "whatsapp",
          config: {
            evolutionUrl: evolutionUrl.trim(),
            evolutionApiKey: evolutionApiKey.trim(),
            instanceName: instanceName.trim(),
          },
        }),
      });

      const data = await res.json();
      setWhatsAppTestResult(data);
      if (data.success) {
        toast.success("Conexão com Evolution API v2 validada com sucesso!");
      } else {
        toast.error("Falha ao testar conexão com Evolution API", {
          description: data.error,
        });
      }
    } catch (err: any) {
      setWhatsAppTestResult({ success: false, error: err.message });
      toast.error("Erro na requisição de teste.");
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // Testar Conexão SMTP (Nodemailer)
  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/messages/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          channel: "email",
          config: {
            smtpHost: smtpHost.trim(),
            smtpPort: smtpPort ? Number(smtpPort) : 587,
            smtpUser: smtpUser.trim(),
            smtpPass: smtpPass.trim(),
            smtpFrom: smtpFrom.trim(),
          },
        }),
      });

      const data = await res.json();
      setSmtpTestResult(data);
      if (data.success) {
        toast.success("Servidor SMTP validado com sucesso!");
      } else {
        toast.error("Falha ao autenticar no servidor SMTP", {
          description: data.error,
        });
      }
    } catch (err: any) {
      setSmtpTestResult({ success: false, error: err.message });
      toast.error("Erro na requisição de teste SMTP.");
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulário de Configurações das Integrações */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#76abae]" />
              Provedores & Credenciais de Envio
            </h3>
            <p className="text-xs text-[#9da5b4] mt-0.5">
              Conectores para disparos automáticos e notificações do ateliê
            </p>
          </div>
          <Button
            type="submit"
            disabled={isSavingConfig || isLoadingConfig}
            className="bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] font-extrabold uppercase tracking-widest text-xs h-9 px-4 rounded-none cursor-pointer shadow-[0_0_12px_rgba(118,171,174,0.3)]"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSavingConfig ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Evolution API v2 (WhatsApp) */}
          <div className="bg-[#31363f] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-[#eeeeee]">
                  WhatsApp (Evolution API v2)
                </h4>
              </div>
              <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] rounded-none">
                REST API
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  URL da Instância Evolution
                </label>
                <div className="relative">
                  <Input
                    value={evolutionUrl}
                    onChange={(e) => setEvolutionUrl(e.target.value)}
                    placeholder="https://sua-evolution-api.com"
                    className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] pl-8 rounded-none font-mono"
                  />
                  <Globe className="w-3.5 h-3.5 text-[#9da5b4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Chave Global / API Key
                </label>
                <div className="relative">
                  <Input
                    type={showEvolutionKey ? "text" : "password"}
                    value={evolutionApiKey}
                    onChange={(e) => setEvolutionApiKey(e.target.value)}
                    placeholder="Sua chave apikey da Evolution"
                    className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] pl-8 pr-9 rounded-none font-mono"
                  />
                  <Key className="w-3.5 h-3.5 text-[#9da5b4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowEvolutionKey(!showEvolutionKey)}
                    className="text-[#9da5b4] hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showEvolutionKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Nome da Instância
                </label>
                <Input
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex: karlos-art-tattoo"
                  className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none font-mono"
                />
              </div>
            </div>

            {/* Resultado do Teste de Conexão WhatsApp */}
            {whatsAppTestResult && (
              <div
                className={`p-3 border text-xs leading-relaxed ${
                  whatsAppTestResult.success
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  {whatsAppTestResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  {whatsAppTestResult.success ? "Instância Conectada" : "Falha na Conexão"}
                </div>
                <p className="mt-1 text-[11px] font-mono">
                  {whatsAppTestResult.message || whatsAppTestResult.error}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTestingWhatsApp}
                onClick={handleTestWhatsApp}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTestingWhatsApp ? "animate-spin" : ""}`} />
                {isTestingWhatsApp ? "Testando..." : "Testar Conexão WhatsApp"}
              </Button>
            </div>
          </div>

          {/* Card: SMTP Nodemailer (E-mail) */}
          <div className="bg-[#31363f] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#9be5ff]" />
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-[#eeeeee]">
                  E-mail (SMTP Nodemailer)
                </h4>
              </div>
              <Badge className="bg-[#9be5ff]/15 text-[#9be5ff] border border-[#9be5ff]/30 text-[10px] rounded-none">
                SMTP
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                    Host SMTP
                  </label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.exemplo.com"
                    className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                    Porta
                  </label>
                  <Input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Usuário SMTP
                </label>
                <Input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="usuario_smtp"
                  className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Senha SMTP
                </label>
                <div className="relative">
                  <Input
                    type={showSmtpPass ? "text" : "password"}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] pl-8 pr-9 rounded-none font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#9da5b4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="text-[#9da5b4] hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showSmtpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Remetente ("From")
                </label>
                <Input
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="Karlos Art Tattoo <contato@karlosarttattoo.com.br>"
                  className="bg-[#222831] border-white/15 text-xs text-[#eeeeee] rounded-none font-mono"
                />
              </div>
            </div>

            {/* Resultado do Teste SMTP */}
            {smtpTestResult && (
              <div
                className={`p-3 border text-xs leading-relaxed ${
                  smtpTestResult.success
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  {smtpTestResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  {smtpTestResult.success ? "Servidor Autenticado" : "Erro de Autenticação"}
                </div>
                <p className="mt-1 text-[11px] font-mono">
                  {smtpTestResult.message || smtpTestResult.error}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTestingSmtp}
                onClick={handleTestSmtp}
                className="border-[#9be5ff]/30 text-[#9be5ff] hover:bg-[#9be5ff] hover:text-[#222831] text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTestingSmtp ? "animate-spin" : ""}`} />
                {isTestingSmtp ? "Testando..." : "Testar Conexão SMTP"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Tabela de Histórico de Logs & Auditoria */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <History className="w-4 h-4 text-[#76abae]" />
              Histórico de Disparos & Auditoria
            </h3>
            <p className="text-xs text-[#9da5b4] mt-0.5">
              Registro auditável dos últimos 50 disparos executados no sistema
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoadingLogs}
            className="border-white/10 bg-[#222831] text-[#9da5b4] hover:text-white rounded-none cursor-pointer text-xs h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
            Recarregar Logs
          </Button>
        </div>

        <div className="bg-[#31363f] border border-white/10 overflow-x-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9da5b4]">
              Nenhum disparo registrado até o momento.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#222831] text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Destinatário</th>
                  <th className="p-3">Lead</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-mono text-[#9da5b4] whitespace-nowrap">
                      {formatDate(log.sent_at)}
                    </td>
                    <td className="p-3 font-mono text-[#eeeeee]">{log.recipient}</td>
                    <td className="p-3 text-[#eeeeee]">
                      {log.lead_name || <span className="text-[#9da5b4] italic">Disparo Avulso</span>}
                    </td>
                    <td className="p-3">
                      {log.channel === "whatsapp" ? (
                        <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">
                          WhatsApp
                        </span>
                      ) : (
                        <span className="text-[#9be5ff] font-mono text-[10px] uppercase font-bold">
                          E-mail
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {log.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] uppercase font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Enviado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-rose-400 text-[10px] uppercase font-bold"
                          title={log.error}
                        >
                          <AlertCircle className="w-3 h-3" /> Falha
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2 text-[#76abae] hover:text-[#9be5ff] text-[10px] uppercase font-bold tracking-wider rounded-none cursor-pointer"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg bg-[#222831] border border-white/15 text-[#eeeeee] p-6 rounded-none">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="text-sm font-extrabold uppercase tracking-wider text-[#76abae] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalhes do Disparo
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9da5b4]">
              Identificador do log: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#31363f] p-3 border border-white/5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9da5b4] block">
                    Destinatário:
                  </span>
                  <span className="font-mono text-white">{selectedLog.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9da5b4] block">
                    Canal:
                  </span>
                  <span className="uppercase font-bold text-[#76abae]">
                    {selectedLog.channel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9da5b4] block">
                    Cliente / Lead:
                  </span>
                  <span>{selectedLog.lead_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9da5b4] block">
                    Status:
                  </span>
                  <span
                    className={
                      selectedLog.status === "sent" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
                    }
                  >
                    {selectedLog.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedLog.error && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300">
                  <span className="text-[10px] uppercase font-bold block mb-1">
                    Mensagem de Erro:
                  </span>
                  <p className="font-mono text-[11px]">{selectedLog.error}</p>
                </div>
              )}

              {selectedLog.payload && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#9da5b4] block">
                    Conteúdo Disparado:
                  </span>
                  <pre className="p-3 bg-[#1a1f26] border border-white/5 text-[11px] font-mono text-[#eeeeee] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {(() => {
                      try {
                        const parsed = JSON.parse(selectedLog.payload);
                        return parsed.body || selectedLog.payload;
                      } catch {
                        return selectedLog.payload;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
