import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { Lock, ArrowLeft, RefreshCw, LogOut, ShieldCheck, Sparkles, LayoutDashboard, Users } from "lucide-react";
import { LeadTable } from "@/components/admin/lead-table";
import { BentoOverview } from "@/components/admin/bento-overview";
import { BackgroundBeams } from "@/components/ui/aceternity/background-beams";
import { ShimmerButton } from "@/components/ui/aceternity/shimmer-button";
import type { Lead } from "@/lib/db";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo | Karlos Art Tattoo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

export function AdminPage() {
  const [authKey, setAuthKey] = React.useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"bento" | "leads">("bento");

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [stats, setStats] = React.useState({
    total: 0,
    novos: 0,
    contatados: 0,
    agendados: 0,
    arquivados: 0,
    conversionRate: "0.0%",
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null);

  // Recupera token do sessionStorage se disponível
  React.useEffect(() => {
    const savedToken = sessionStorage.getItem("admin_auth_token");
    if (savedToken) {
      setAuthKey(savedToken);
      verifyAndFetch(savedToken);
    }
  }, []);

  const verifyAndFetch = async (tokenToUse: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const response = await fetch("/api/leads", {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        if (data.stats) setStats(data.stats);
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth_token", tokenToUse);
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem("admin_auth_token");
        setLoginError("Chave de acesso inválida ou sessão expirada.");
      }
    } catch {
      setLoginError("Erro ao comunicar com o servidor da API.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authKey.trim()) return;
    verifyAndFetch(authKey.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth_token");
    setIsAuthenticated(false);
    setAuthKey("");
    setLeads([]);
  };

  const handleStatusChange = async (id: string, newStatus: Lead["status"]) => {
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (response.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead))
        );
        verifyAndFetch(authKey);
        setFeedbackMsg("Status atualizado!");
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        alert("Erro ao atualizar o status do lead.");
      }
    } catch {
      alert("Falha de conexão ao atualizar status.");
    }
  };

  // 1. Tela de Login Dark Editorial com BackgroundBeams e ShimmerButton
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center p-6 selection:bg-[#9be5ff] selection:text-black overflow-hidden">
        <BackgroundBeams />

        <div className="relative z-10 w-full max-w-md bg-[#0b0b0e]/90 backdrop-blur-xl border border-white/10 p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9be5ff]">
              KARLOS ART TATTOO
            </p>
            <h1 className="text-xl font-extrabold uppercase tracking-[0.2em] text-white">
              PAINEL DO ATELIÊ
            </h1>
            <p className="text-xs text-neutral-400 tracking-wider">
              Área restrita de gestão de agenda, métricas e orçamentos.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="admin-key"
                className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 block mb-2"
              >
                Chave de Acesso Administrativo
              </label>
              <div className="relative">
                <input
                  id="admin-key"
                  type="password"
                  value={authKey}
                  onChange={(e) => setAuthKey(e.target.value)}
                  placeholder="Insira sua chave de acesso"
                  disabled={isLoading}
                  autoFocus
                  className="w-full bg-black/60 border border-white/20 focus:border-[#9be5ff] text-white text-sm px-4 py-3 outline-none transition-all rounded-none placeholder:text-neutral-600"
                />
                <Lock className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {loginError && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 p-3 text-center tracking-wide">
                {loginError}
              </div>
            )}

            <ShimmerButton
              type="submit"
              disabled={isLoading || !authKey.trim()}
              shimmerColor="#9be5ff"
              background="#0b0b0e"
              className="w-full !py-3.5 border-white/20 hover:border-[#9be5ff]"
            >
              {isLoading ? "VERIFICANDO..." : "ACESSAR PAINEL"}
            </ShimmerButton>
          </form>

          <div className="text-center pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-500 hover:text-[#9be5ff] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar à página principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Painel Administrativo Autenticado com Abas Modulares e BackgroundBeams
  return (
    <div className="relative min-h-screen bg-[#070707] text-white selection:bg-[#9be5ff] selection:text-black overflow-x-hidden">
      <BackgroundBeams />

      {/* Barra de Navegação Superior */}
      <header className="relative z-30 border-b border-white/10 bg-[#0a0a0d]/80 backdrop-blur-xl px-6 py-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-neutral-400 hover:text-[#9be5ff] transition-colors p-1"
              title="Voltar ao site"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9be5ff] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#9be5ff]" /> PAINEL ADMINISTRATIVO ACETERNITY
                </span>
              </div>
              <h1 className="text-lg font-extrabold uppercase tracking-[0.18em] text-white">
                KARLOS ART TATTOO · ATELIÊ & DASHBOARD
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {feedbackMsg && (
              <span className="text-xs text-[#9be5ff] bg-[#9be5ff]/10 border border-[#9be5ff]/30 px-3 py-1 animate-pulse">
                {feedbackMsg}
              </span>
            )}

            <button
              onClick={() => verifyAndFetch(authKey)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-black/60 hover:bg-black border border-white/15 text-neutral-300 hover:text-white text-xs uppercase tracking-[0.15em] transition-all cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#9be5ff]" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-800/30 text-red-400 hover:text-red-300 text-xs uppercase tracking-[0.15em] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barra de Abas Modulares (D-01) */}
      <nav className="relative z-20 border-b border-white/10 bg-[#070707]/90 backdrop-blur-md px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setActiveTab("bento")}
            className={`flex items-center gap-2 px-4 py-2 text-xs uppercase font-extrabold tracking-[0.2em] transition-all cursor-pointer border ${
              activeTab === "bento"
                ? "bg-[#9be5ff] text-[#070707] border-[#9be5ff] shadow-[0_0_15px_rgba(155,229,255,0.3)]"
                : "bg-black/40 text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            VISÃO GERAL BENTO
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={`flex items-center gap-2 px-4 py-2 text-xs uppercase font-extrabold tracking-[0.2em] transition-all cursor-pointer border ${
              activeTab === "leads"
                ? "bg-[#9be5ff] text-[#070707] border-[#9be5ff] shadow-[0_0_15px_rgba(155,229,255,0.3)]"
                : "bg-black/40 text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            GESTÃO DE LEADS
            <span
              className={`ml-1 px-1.5 py-0.2 text-[10px] font-mono ${
                activeTab === "leads" ? "bg-black text-[#9be5ff]" : "bg-white/10 text-neutral-300"
              }`}
            >
              {leads.length}
            </span>
          </button>
        </div>
      </nav>

      {/* Conteúdo Principal Renderizado Conforme Aba Ativa */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {activeTab === "bento" ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9be5ff]" /> Visão Analítica do Estúdio & Métricas
              </h2>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                Palhoça & Florianópolis
              </span>
            </div>

            <BentoOverview
              stats={stats}
              leads={leads}
              onNavigateToLeads={() => setActiveTab("leads")}
            />
          </section>
        ) : (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-white">
                  Triagem & Contato com Clientes
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Orçamentos recebidos pelo site — inicie conversas personalizadas no WhatsApp
                </p>
              </div>
              <span className="text-xs font-mono text-[#9be5ff]">
                {leads.length} orçament{leads.length === 1 ? "o" : "os"}
              </span>
            </div>

            <LeadTable
              leads={leads}
              onStatusChange={handleStatusChange}
              isLoading={isLoading}
            />
          </section>
        )}
      </main>
    </div>
  );
}
