import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  Lock,
  ArrowLeft,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
  Users,
  Calendar as CalendarIcon,
  ExternalLink,
  AlertCircle,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { LeadTable } from "@/components/admin/lead-table";
import { BentoOverview } from "@/components/admin/bento-overview";
import { AgendaTab } from "@/components/admin/agenda-tab";
import { Toaster } from "@/components/ui/sonner";
import { BackgroundBeams } from "@/components/ui/aceternity/background-beams";
import { ShimmerButton } from "@/components/ui/aceternity/shimmer-button";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/aceternity/sidebar";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoBadge } from "@/components/ui/status-badge";
import type { Lead, Booking } from "@/lib/db";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo | Karlos Art Tattoo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [authKey, setAuthKey] = React.useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"bento" | "leads" | "agenda">("bento");
  const [leadToSchedule, setLeadToSchedule] = React.useState<Lead | null>(null);

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [stats, setStats] = React.useState({
    total: 0,
    novos: 0,
    contatados: 0,
    agendados: 0,
    arquivados: 0,
    conversionRate: "0.0%",
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [panelAlert, setPanelAlert] = React.useState<{
    variant: "default" | "destructive";
    title?: string;
    message: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false);

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
      const [leadsRes, bookingsRes] = await Promise.all([
        fetch("/api/leads", {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
            Accept: "application/json",
          },
        }),
        fetch("/api/bookings", {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
            Accept: "application/json",
          },
        }),
      ]);

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
        if (data.stats) setStats(data.stats);
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth_token", tokenToUse);
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem("admin_auth_token");
        setLoginError("Chave de acesso inválida ou sessão expirada.");
      }

      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookings(bData.bookings || []);
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

  const handleLogout = React.useCallback(() => {
    sessionStorage.removeItem("admin_auth_token");
    setIsAuthenticated(false);
    setAuthKey("");
    setLeads([]);
  }, []);

  React.useEffect(() => {
    const onLogout = () => handleLogout();
    window.addEventListener("admin:logout", onLogout);
    return () => window.removeEventListener("admin:logout", onLogout);
  }, [handleLogout]);

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
          prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead)),
        );
        verifyAndFetch(authKey);
        setPanelAlert({ variant: "default", message: "Status atualizado!" });
        setTimeout(() => setPanelAlert(null), 3000);
      } else {
        setPanelAlert({
          variant: "destructive",
          title: "Erro no lead",
          message: "Erro ao atualizar o status do lead.",
        });
        setTimeout(() => setPanelAlert(null), 5000);
      }
    } catch {
      setPanelAlert({
        variant: "destructive",
        title: "Falha de conexão",
        message: "Falha de conexão ao atualizar status.",
      });
      setTimeout(() => setPanelAlert(null), 5000);
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
              <Alert variant="destructive" className="rounded-none">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de autenticação</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
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

  const sidebarNavLinks: SidebarLinkItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      active: activeTab === "bento",
      onClick: () => setActiveTab("bento"),
    },
    {
      label: "Gestão de Leads",
      icon: <Users className="w-4 h-4 shrink-0" />,
      active: activeTab === "leads",
      badge: leads.length,
      onClick: () => setActiveTab("leads"),
    },
    {
      label: "Agenda & Sessões",
      icon: <CalendarIcon className="w-4 h-4 shrink-0" />,
      active: activeTab === "agenda",
      onClick: () => setActiveTab("agenda"),
    },
  ];

  const sidebarActionLinks: SidebarLinkItem[] = [
    {
      label: "Atualizar Dados",
      icon: (
        <RefreshCw
          className={`w-4 h-4 shrink-0 ${isLoading ? "animate-spin text-[#9be5ff]" : ""}`}
        />
      ),
      onClick: () => verifyAndFetch(authKey),
    },
    {
      label: "Ver Site Principal",
      icon: <ExternalLink className="w-4 h-4 shrink-0" />,
      href: "/",
    },
  ];

  // 2. Painel Administrativo Autenticado com Sidebar Aceternity
  return (
    <div className="relative h-screen w-full bg-[#070707] text-white selection:bg-[#9be5ff] selection:text-black flex flex-col md:flex-row overflow-hidden">
      <BackgroundBeams className="opacity-30 pointer-events-none" />

      {/* Sidebar Lateral Aceternity */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
        <SidebarBody className="justify-between gap-6 bg-[#0a0a0d] border-r border-white/10 z-40">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Header / Logo da Sidebar */}
            <div className="pb-4 pt-1 border-b border-white/10">
              <Link
                to="/"
                className="font-normal flex items-center gap-3 text-sm text-white relative z-20 group"
              >
                <div className="h-8 w-8 bg-black/80 border border-[#9be5ff]/60 rounded flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(155,229,255,0.25)]">
                  <span className="text-xs font-black text-[#9be5ff] font-mono tracking-tighter">
                    KA
                  </span>
                </div>
                <motion.div
                  animate={{
                    display: sidebarOpen ? "flex" : "none",
                    opacity: sidebarOpen ? 1 : 0,
                  }}
                  className="flex-col whitespace-pre overflow-hidden"
                >
                  <span className="font-extrabold uppercase tracking-[0.22em] text-white text-xs leading-none">
                    Karlos Art
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#9be5ff] mt-1 font-bold">
                    PAINEL ADMINSTRATIVO
                  </span>
                </motion.div>
              </Link>
            </div>

            {/* Links Principais de Navegação */}
            <div className="mt-5 flex flex-col gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-500 font-semibold px-2 mb-1 hidden md:block">
                {sidebarOpen ? "Módulos do Painel" : "···"}
              </span>
              {sidebarNavLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>

            {/* Divisor & Ações do Sistema */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-500 font-semibold px-2 mb-1 hidden md:block">
                {sidebarOpen ? "Ações Rápidas" : "···"}
              </span>
              {sidebarActionLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>

          {/* Footer do Usuário / Administrador com Logout */}
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-[#9be5ff]/20 to-black border border-[#9be5ff]/40 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#9be5ff]">
                  KA
                </div>
                <motion.div
                  animate={{
                    display: sidebarOpen ? "block" : "none",
                    opacity: sidebarOpen ? 1 : 0,
                  }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <p className="text-xs font-bold text-white truncate uppercase tracking-wider">
                    Karlos Art
                  </p>
                  <p className="text-[9px] text-[#9be5ff] uppercase tracking-wider flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9be5ff] inline-block animate-pulse" />
                    Master Admin
                  </p>
                </motion.div>
              </div>

              <motion.button
                animate={{
                  display: sidebarOpen ? "inline-flex" : "none",
                  opacity: sidebarOpen ? 1 : 0,
                }}
                onClick={handleLogout}
                type="button"
                className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-800/40 transition-colors cursor-pointer"
                title="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Área de Conteúdo Principal (Direita) */}
      <div className="flex flex-col flex-1 h-screen overflow-y-auto z-10">
        {/* Barra de Navegação Superior / Header de Contexto */}
        <header className="border-b border-white/10 bg-[#09090c]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9be5ff] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#9be5ff]" /> PAINEL ADMINISTRATIVO ·
                  ACETERNITY SIDEBAR
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-[0.18em] text-white mt-0.5">
                {activeTab === "bento" && "Visão Analítica & Métricas"}
                {activeTab === "leads" && "Triagem & Gestão de Leads (Orçamentos)"}
                {activeTab === "agenda" && "Agenda & Gestão de Sessões do Ateliê"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyAndFetch(authKey)}
                disabled={isLoading}
                className="bg-black/60 hover:bg-black border-white/15 text-neutral-300 hover:text-white text-xs uppercase tracking-[0.15em] transition-all cursor-pointer rounded-none h-8 gap-1.5"
                title="Atualizar dados"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#9be5ff]" : ""}`}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="bg-red-950/20 hover:bg-red-950/40 border border-red-800/30 text-red-400 hover:text-red-300 text-xs uppercase tracking-[0.15em] transition-all cursor-pointer rounded-none h-8 gap-1.5"
                title="Sair do Painel"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal Renderizado Conforme Aba Ativa */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {panelAlert && (
            <Alert
              variant={panelAlert.variant}
              className={`mb-6 rounded-none ${
                panelAlert.variant === "default"
                  ? "border-[#9be5ff]/40 bg-[#9be5ff]/5 text-neutral-200"
                  : ""
              }`}
            >
              {panelAlert.variant === "destructive" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4 text-[#9be5ff]" />
              )}
              <AlertTitle>
                {panelAlert.title ||
                  (panelAlert.variant === "destructive" ? "Aviso de Erro" : "Notificação")}
              </AlertTitle>
              <AlertDescription>{panelAlert.message}</AlertDescription>
            </Alert>
          )}

          {activeTab === "bento" ? (
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#9be5ff]" /> Visão Analítica do Estúdio &
                  Métricas
                </h2>
                <InfoBadge type="location">Palhoça & Florianópolis</InfoBadge>
              </div>

              <BentoOverview
                stats={stats}
                leads={leads}
                bookings={bookings}
                onNavigateToLeads={() => setActiveTab("leads")}
              />
            </section>
          ) : activeTab === "leads" ? (
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
                onScheduleLead={(lead) => {
                  setLeadToSchedule(lead);
                  setActiveTab("agenda");
                }}
                isLoading={isLoading}
              />
            </section>
          ) : (
            <section className="space-y-6">
              <AgendaTab
                leadToSchedule={leadToSchedule}
                onLeadScheduled={() => setLeadToSchedule(null)}
              />
            </section>
          )}
        </main>
      </div>

      {/* Toaster do Sonner montado para notificações de feedback */}
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}
