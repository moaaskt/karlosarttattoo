import * as React from "react";
import {
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  MessageSquare,
  Mail,
  Sparkles,
  Eye,
  Search,
  Check,
  Tag,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AVAILABLE_VARIABLES, interpolateTemplate } from "@/lib/messaging/engine";
import type { MessageTemplate, Channel, TemplateCategory } from "@/lib/messaging/types";

interface TemplatesManagerProps {
  authKey: string;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  welcome: "Boas-Vindas",
  deposit_request: "Cobrança de Sinal",
  booking_confirm: "Confirmação de Sessão",
  reminder: "Lembrete 24h",
  post_care: "Pós-Tattoo",
  promo: "Campanha & Promoção",
};

const DUMMY_PREVIEW_DATA = {
  nome: "Mariana Silva",
  primeiro_nome: "Mariana",
  telefone: "(48) 99123-4567",
  email: "mariana@exemplo.com",
  ideia: "Rosa em fine line com traços minimalistas no antebraço",
  local: "Estúdio Privado (Palhoça)",
  estilo: "Fine Line",
  data_agendamento: "15/10/2026",
  horario_agendamento: "14:00",
  valor_total: "R$ 800,00",
  valor_sinal: "R$ 200,00",
  chave_pix: "pix@karlosarttattoo.com.br",
};

export function TemplatesManager({ authKey }: TemplatesManagerProps) {
  const [templates, setTemplates] = React.useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [selectedChannel, setSelectedChannel] = React.useState<"all" | Channel>("all");

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = React.useState<MessageTemplate | null>(null);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Campos do formulário
  const [formName, setFormName] = React.useState<string>("");
  const [formCategory, setFormCategory] = React.useState<TemplateCategory>("welcome");
  const [formChannel, setFormChannel] = React.useState<Channel>("whatsapp");
  const [formSubject, setFormSubject] = React.useState<string>("");
  const [formBody, setFormBody] = React.useState<string>("");
  const [formActive, setFormActive] = React.useState<boolean>(true);

  // Modal de exclusão
  const [deletingTemplate, setDeletingTemplate] = React.useState<MessageTemplate | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Ref para inserção de chips no cursor do textarea
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/templates", {
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast.error("Erro ao carregar templates do servidor.");
      }
    } catch (err) {
      console.error("[TemplatesManager] Erro:", err);
      toast.error("Erro de comunicação com a API.");
    } finally {
      setIsLoading(false);
    }
  }, [authKey]);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormCategory("welcome");
    setFormChannel("whatsapp");
    setFormSubject("");
    setFormBody("");
    setFormActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl);
    setFormName(tpl.name);
    setFormCategory(tpl.category);
    setFormChannel(tpl.channel);
    setFormSubject(tpl.subject || "");
    setFormBody(tpl.body);
    setFormActive(tpl.active);
    setIsModalOpen(true);
  };

  const handleInsertVariable = (variableKey: string) => {
    const tag = `{{${variableKey}}}`;
    const textarea = textareaRef.current;

    if (!textarea) {
      setFormBody((prev) => `${prev} ${tag}`);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = textarea.value;

    const nextValue = current.substring(0, start) + tag + current.substring(end);
    setFormBody(nextValue);

    // Reposiciona o cursor após a tag inserida
    setTimeout(() => {
      textarea.focus();
      const nextCursorPos = start + tag.length;
      textarea.setSelectionRange(nextCursorPos, nextCursorPos);
    }, 50);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("O nome do template é obrigatório.");
      return;
    }
    if (!formBody.trim()) {
      toast.error("O corpo da mensagem não pode estar vazio.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        channel: formChannel,
        subject: formChannel === "email" ? formSubject.trim() || undefined : undefined,
        body: formBody.trim(),
        active: formActive,
      };

      const url = editingTemplate
        ? `/api/messages/templates/${editingTemplate.id}`
        : "/api/messages/templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erro ao salvar template");
      }

      toast.success(
        editingTemplate ? "Template atualizado com sucesso!" : "Template criado com sucesso!",
      );
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error("Falha ao salvar template", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/messages/templates/${deletingTemplate.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authKey}`,
        },
      });

      if (!res.ok) {
        throw new Error("Não foi possível excluir o template.");
      }

      toast.success(`Template "${deletingTemplate.name}" excluído.`);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error("Erro na exclusão", { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTemplates = React.useMemo(() => {
    return templates.filter((tpl) => {
      const matchChannel = selectedChannel === "all" || tpl.channel === selectedChannel;
      const matchSearch =
        !searchTerm.trim() ||
        tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tpl.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tpl.subject && tpl.subject.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchChannel && matchSearch;
    });
  }, [templates, selectedChannel, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Barra Superior: Busca, Filtros e Ação */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#9da5b4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, tag ou texto..."
              className="pl-9 bg-[#222831] border-white/15 text-xs text-[#eeeeee] focus:border-[#76abae] rounded-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#222831] p-1 border border-white/10">
            <Button
              type="button"
              size="sm"
              variant={selectedChannel === "all" ? "default" : "ghost"}
              onClick={() => setSelectedChannel("all")}
              className={`text-[10px] uppercase font-bold tracking-wider h-7 px-2.5 rounded-none cursor-pointer ${
                selectedChannel === "all"
                  ? "bg-[#76abae] text-[#222831]"
                  : "text-[#9da5b4] hover:text-[#eeeeee]"
              }`}
            >
              Todos ({templates.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedChannel === "whatsapp" ? "default" : "ghost"}
              onClick={() => setSelectedChannel("whatsapp")}
              className={`text-[10px] uppercase font-bold tracking-wider h-7 px-2.5 rounded-none cursor-pointer ${
                selectedChannel === "whatsapp"
                  ? "bg-emerald-600 text-white"
                  : "text-[#9da5b4] hover:text-[#eeeeee]"
              }`}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              WhatsApp ({templates.filter((t) => t.channel === "whatsapp").length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedChannel === "email" ? "default" : "ghost"}
              onClick={() => setSelectedChannel("email")}
              className={`text-[10px] uppercase font-bold tracking-wider h-7 px-2.5 rounded-none cursor-pointer ${
                selectedChannel === "email"
                  ? "bg-[#9be5ff] text-[#222831]"
                  : "text-[#9da5b4] hover:text-[#eeeeee]"
              }`}
            >
              <Mail className="w-3 h-3 mr-1" />
              E-mail ({templates.filter((t) => t.channel === "email").length})
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            disabled={isLoading}
            className="border-white/10 bg-[#222831] text-[#9da5b4] hover:text-[#eeeeee] rounded-none cursor-pointer h-9 px-3"
            title="Recarregar templates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] font-extrabold uppercase tracking-widest text-[11px] rounded-none cursor-pointer h-9 px-4 shadow-[0_0_12px_rgba(118,171,174,0.3)] transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Grid de Templates */}
      {isLoading ? (
        <div className="p-12 text-center border border-white/10 bg-[#31363f]/60">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#76abae] border-r-2 border-r-transparent mb-3" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#9da5b4]">Carregando catálogo...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center border border-white/10 bg-[#31363f]/60 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#eeeeee]">
            Nenhum template encontrado com os filtros atuais.
          </p>
          <p className="text-xs text-[#9da5b4]">
            Clique em "Novo Template" para criar uma mensagem personalizada para o ateliê.
          </p>
          <Button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-[#76abae] text-[#222831] text-xs uppercase font-bold tracking-widest rounded-none mt-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Criar Primeiro Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-[#31363f] border border-white/10 p-5 flex flex-col justify-between transition-all hover:border-[#76abae]/40 space-y-4"
            >
              <div className="space-y-3">
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    {tpl.channel === "whatsapp" ? (
                      <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 rounded-none px-2">
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </Badge>
                    ) : (
                      <Badge className="bg-[#9be5ff]/15 text-[#9be5ff] border border-[#9be5ff]/30 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 rounded-none px-2">
                        <Mail className="w-3 h-3" />
                        E-mail
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="border-white/10 text-[#9da5b4] text-[10px] uppercase tracking-wider rounded-none px-1.5"
                    >
                      {CATEGORY_LABELS[tpl.category] || tpl.category}
                    </Badge>
                  </div>

                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      tpl.active ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-neutral-600"
                    }`}
                    title={tpl.active ? "Template Ativo" : "Template Inativo"}
                  />
                </div>

                {/* Título e Assunto */}
                <div>
                  <h3 className="text-sm font-bold text-[#eeeeee] uppercase tracking-wider">
                    {tpl.name}
                  </h3>
                  {tpl.subject && (
                    <p className="text-[11px] text-[#9be5ff] font-sans truncate mt-0.5">
                      Assunto: {tpl.subject}
                    </p>
                  )}
                </div>

                {/* Trecho do Corpo */}
                <div className="bg-[#222831] border border-white/5 p-3 text-xs text-[#9da5b4] font-sans line-clamp-4 whitespace-pre-wrap leading-relaxed">
                  {tpl.body}
                </div>

                {/* Variáveis detectadas */}
                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tpl.variables.slice(0, 5).map((v) => (
                      <span
                        key={v}
                        className="text-[9px] font-mono bg-white/5 text-[#76abae] border border-white/5 px-1.5 py-0.5 rounded-none"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {tpl.variables.length > 5 && (
                      <span className="text-[9px] text-[#9da5b4] px-1 py-0.5">
                        +{tpl.variables.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Ações do Card */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditModal(tpl)}
                  className="h-8 px-2.5 border-white/10 text-[#9da5b4] hover:text-[#76abae] hover:border-[#76abae]/40 rounded-none cursor-pointer text-xs uppercase font-bold tracking-wider"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeletingTemplate(tpl)}
                  className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-none cursor-pointer"
                  title="Excluir template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Template */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl bg-[#222831] border border-white/15 text-[#eeeeee] p-6 max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="text-base font-extrabold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#76abae]" />
              {editingTemplate ? "Editar Template de Mensagem" : "Criar Novo Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9da5b4]">
              Configure o texto padronizado e utilize os chips de variáveis dinâmicas para
              personalizar o contato com os clientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Nome do Template *
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Confirmação de Sessão VIP"
                  className="bg-[#31363f] border-white/15 text-xs text-[#eeeeee] focus:border-[#76abae] rounded-none"
                  required
                />
              </div>

              {/* Canal */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Canal de Disparo
                </label>
                <Select
                  value={formChannel}
                  onValueChange={(val) => setFormChannel(val as Channel)}
                >
                  <SelectTrigger className="bg-[#31363f] border-white/15 text-xs text-[#eeeeee] rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222831] border-white/15 text-[#eeeeee]">
                    <SelectItem value="whatsapp">WhatsApp (Evolution API v2)</SelectItem>
                    <SelectItem value="email">E-mail (SMTP Nodemailer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Categoria do Fluxo
                </label>
                <Select
                  value={formCategory}
                  onValueChange={(val) => setFormCategory(val as TemplateCategory)}
                >
                  <SelectTrigger className="bg-[#31363f] border-white/15 text-xs text-[#eeeeee] rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222831] border-white/15 text-[#eeeeee]">
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <SelectItem key={cat} value={cat}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-3 bg-[#31363f] border border-white/10 self-end">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#eeeeee] block">
                    Template Ativo
                  </span>
                  <span className="text-[10px] text-[#9da5b4]">
                    Disponível no modal de resposta rápida
                  </span>
                </div>
                <Switch
                  checked={formActive}
                  onCheckedChange={setFormActive}
                  className="data-[state=checked]:bg-[#76abae]"
                />
              </div>
            </div>

            {/* Assunto (Condicional se canal for E-mail) */}
            {formChannel === "email" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9be5ff]">
                  Assunto do E-mail *
                </label>
                <Input
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Ex: Sua Sessão na Karlos Art Tattoo foi confirmada!"
                  className="bg-[#31363f] border-[#9be5ff]/30 text-xs text-[#eeeeee] focus:border-[#9be5ff] rounded-none"
                  required={formChannel === "email"}
                />
              </div>
            )}

            {/* Chips Interativos de Variáveis */}
            <div className="space-y-2 bg-[#31363f] border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#76abae] flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Inserir Tags Dinâmicas no Cursor:
                </span>
                <span className="text-[9px] text-[#9da5b4]">Clique na tag para adicionar</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleInsertVariable(v.key)}
                    className="text-[10px] font-mono bg-[#222831] border border-white/10 hover:border-[#76abae] text-[#eeeeee] hover:text-[#76abae] px-2 py-1 transition-all cursor-pointer rounded-none active:scale-95"
                    title={`${v.label}: Exemplo "${v.example}"`}
                  >
                    + {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea do Corpo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  Corpo da Mensagem *
                </label>
                <span className="text-[10px] text-[#9da5b4] font-mono">
                  {formBody.length} caracteres
                </span>
              </div>
              <Textarea
                ref={textareaRef}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Olá {{primeiro_nome}}, tudo certo? Recebi seu projeto para {{ideia}}..."
                rows={6}
                className="bg-[#31363f] border-white/15 text-xs text-[#eeeeee] focus:border-[#76abae] rounded-none font-sans leading-relaxed resize-y"
                required
              />
            </div>

            {/* Preview em Tempo Real */}
            {formBody && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.2em] text-[#9da5b4]">
                  <Eye className="w-3.5 h-3.5 text-[#76abae]" />
                  Preview com Dados Simulados ({DUMMY_PREVIEW_DATA.nome}):
                </div>
                <div
                  className={`p-4 border text-xs leading-relaxed whitespace-pre-wrap ${
                    formChannel === "whatsapp"
                      ? "bg-[#0b141a] border-emerald-900/50 text-[#e9edef] rounded-md font-sans"
                      : "bg-[#222831] border-[#9be5ff]/20 text-[#eeeeee]"
                  }`}
                >
                  {formChannel === "email" && formSubject && (
                    <div className="font-bold text-[#9be5ff] pb-2 mb-2 border-b border-white/10">
                      Assunto: {interpolateTemplate(formSubject, DUMMY_PREVIEW_DATA)}
                    </div>
                  )}
                  {interpolateTemplate(formBody, DUMMY_PREVIEW_DATA)}
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-white/10 pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-white/10 bg-[#31363f] text-[#9da5b4] hover:text-[#eeeeee] text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#76abae] hover:bg-[#76abae]/90 text-[#222831] font-extrabold uppercase tracking-widest text-xs rounded-none cursor-pointer shadow-[0_0_12px_rgba(118,171,174,0.3)]"
              >
                {isSaving ? "Salvando..." : editingTemplate ? "Atualizar Template" : "Criar Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent className="max-w-md bg-[#222831] border border-rose-500/30 text-[#eeeeee] p-6 rounded-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Excluir Template
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9da5b4]">
              Tem certeza que deseja remover o template{" "}
              <strong className="text-white">"{deletingTemplate?.name}"</strong>? Esta ação é
              irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
              className="border-white/10 text-xs uppercase tracking-wider rounded-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteTemplate}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs uppercase font-bold tracking-wider rounded-none"
            >
              {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
