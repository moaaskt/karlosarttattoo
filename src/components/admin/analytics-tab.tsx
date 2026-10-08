import * as React from "react";
import {
  TrendingUp,
  Activity,
  Users,
  Search,
  MapPin,
  Compass,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { GlowingCard } from "@/components/ui/aceternity/glowing-card";
import { ApexChartClient } from "@/components/admin/apex-chart-client";
import { Button } from "@/components/ui/button";
import type { AnalyticsDataPayload } from "@/server/lib/analytics-mock";

interface AnalyticsTabProps {
  authKey: string;
}

export function AnalyticsTab({ authKey }: AnalyticsTabProps) {
  const [period, setPeriod] = React.useState<"7d" | "30d" | "90d">("7d");
  const [data, setData] = React.useState<AnalyticsDataPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(
    async (selectedPeriod: "7d" | "30d" | "90d", force: boolean = false) => {
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const url = `/api/analytics?period=${selectedPeriod}${force ? "&force=true" : ""}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${authKey}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Falha ao obter dados analíticos (${response.status})`);
        }

        const json: AnalyticsDataPayload = await response.json();
        setData(json);
      } catch (err: any) {
        console.error("[AnalyticsTab] Erro ao carregar métricas:", err);
        setError(err.message || "Erro de conexão ao buscar métricas");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authKey],
  );

  React.useEffect(() => {
    fetchAnalytics(period, false);
  }, [fetchAnalytics, period]);

  // Formatação das séries do ApexCharts
  const chartSeries = React.useMemo(() => {
    if (!data?.timeline) return [];
    return [
      {
        name: "Sessões no Site (GA4)",
        data: data.timeline.map((item) => item.sessions),
      },
      {
        name: "Cliques de Pesquisa (GSC)",
        data: data.timeline.map((item) => item.clicks),
      },
    ];
  }, [data]);

  const chartCategories = React.useMemo(() => {
    if (!data?.timeline) return [];
    return data.timeline.map((item) => {
      const parts = item.date.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return item.date;
    });
  }, [data]);

  const chartOptions = React.useMemo(() => {
    return {
      chart: {
        type: "area" as const,
        height: 320,
        toolbar: { show: false },
        background: "transparent",
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 600,
        },
      },
      colors: ["#76abae", "#f59e0b"],
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth" as const,
        width: [3, 2],
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 95, 100],
        },
      },
      xaxis: {
        categories: chartCategories,
        labels: {
          style: {
            colors: "#9da5b4",
            fontSize: "11px",
            fontFamily: "inherit",
          },
        },
        axisBorder: { show: false },
        axisTicks: { color: "rgba(255,255,255,0.1)" },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#9da5b4",
            fontSize: "11px",
            fontFamily: "inherit",
          },
        },
      },
      grid: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        strokeDashArray: 4,
      },
      tooltip: {
        theme: "dark",
        x: { show: true },
        y: {
          formatter: (val: number) => `${val}`,
        },
      },
      legend: {
        position: "top" as const,
        horizontalAlign: "right" as const,
        labels: {
          colors: "#eeeeee",
        },
        markers: {
          radius: 2,
        },
      },
    };
  }, [chartCategories]);

  return (
    <div className="space-y-6">
      {/* 1. Barra de Controle Superior: Status da Conexão, Atualização e Período */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#31363f]/60 border border-white/10 p-4 sm:p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#76abae]" />
              Tráfego Web & Desempenho Orgânico Google
            </h2>

            {data && (
              <>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                    data.is_mock
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {data.is_mock ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Modo Demonstração (Sem credenciais no .env)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Conectado ao GA4 & Search Console
                    </>
                  )}
                </span>

                {!data.is_mock && data.summary.realtime_active_users !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Tempo Real: {data.summary.realtime_active_users} {data.summary.realtime_active_users === 1 ? "ativo agora" : "ativos agora"}
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-[#9da5b4]">
            Monitoramento de visitas locais e buscas no Google (Palhoça & Grande Florianópolis).
            {data?.cached_at && (
              <span className="ml-2 font-mono text-[11px] text-[#76abae]/80">
                Cache atualizado: {new Date(data.cached_at).toLocaleTimeString("pt-BR")}
              </span>
            )}
          </p>
        </div>

        {/* Controles de Período e Botão Atualizar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center border border-white/15 bg-[#222831] p-0.5">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  period === p
                    ? "bg-[#76abae] text-[#222831]"
                    : "text-[#9da5b4] hover:text-[#eeeeee]"
                }`}
              >
                {p === "7d" ? "7 Dias" : p === "30d" ? "30 Dias" : "90 Dias"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(period, true)}
            disabled={isRefreshing || isLoading}
            className="border-white/15 bg-[#222831] hover:bg-[#31363f] text-[#eeeeee] hover:text-[#76abae] text-xs uppercase tracking-wider h-8 rounded-none gap-1.5 cursor-pointer"
            title="Forçar atualização e invalidar cache"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#76abae]" : ""}`} />
            <span>{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Quatro Glowing Cards com Resumo Analítico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sessões */}
        <GlowingCard glowColor="#76abae" glowOpacity={0.18} className="p-5 border-white/10">
          <div className="flex items-center justify-between text-[#9da5b4] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#9da5b4]">
              Sessões do Site
            </span>
            <Activity className="w-4 h-4 text-[#76abae]" />
          </div>
          <div className="text-2xl font-black text-[#eeeeee] font-mono tracking-tight">
            {isLoading ? "---" : (data?.summary.total_sessions.toLocaleString("pt-BR") ?? "0")}
          </div>
          <div className="text-[11px] text-[#9da5b4] mt-1.5 flex items-center justify-between">
            <span>Visualizações:</span>
            <span className="font-mono text-[#eeeeee]">
              {isLoading ? "---" : (data?.summary.page_views.toLocaleString("pt-BR") ?? "0")}
            </span>
          </div>
        </GlowingCard>

        {/* Card 2: Usuários Ativos */}
        <GlowingCard glowColor="#9be5ff" glowOpacity={0.18} className="p-5 border-white/10">
          <div className="flex items-center justify-between text-[#9da5b4] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#9da5b4]">
              Usuários Únicos
            </span>
            <Users className="w-4 h-4 text-[#9be5ff]" />
          </div>
          <div className="text-2xl font-black text-[#eeeeee] font-mono tracking-tight flex items-baseline justify-between">
            <span>{isLoading ? "---" : (data?.summary.active_users.toLocaleString("pt-BR") ?? "0")}</span>
            {!isLoading && data?.summary.realtime_active_users !== undefined && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {data.summary.realtime_active_users} online
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#9da5b4] mt-1.5 flex items-center justify-between">
            <span>Engajamento:</span>
            <span className="font-mono text-[#9be5ff]">
              {isLoading ? "---" : (data?.summary.engagement_rate ?? "0.0%")}
            </span>
          </div>
        </GlowingCard>

        {/* Card 3: Cliques no Google Search Console */}
        <GlowingCard glowColor="#f59e0b" glowOpacity={0.18} className="p-5 border-white/10">
          <div className="flex items-center justify-between text-[#9da5b4] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#9da5b4]">
              Cliques no Google
            </span>
            <Search className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-black text-[#eeeeee] font-mono tracking-tight">
            {isLoading ? "---" : (data?.summary.gsc_clicks.toLocaleString("pt-BR") ?? "0")}
          </div>
          <div className="text-[11px] text-[#9da5b4] mt-1.5 flex items-center justify-between">
            <span>Impressões na Busca:</span>
            <span className="font-mono text-[#f59e0b]">
              {isLoading ? "---" : (data?.summary.gsc_impressions.toLocaleString("pt-BR") ?? "0")}
            </span>
          </div>
        </GlowingCard>

        {/* Card 4: Ranking & CTR Médio */}
        <GlowingCard glowColor="#10b981" glowOpacity={0.18} className="p-5 border-white/10">
          <div className="flex items-center justify-between text-[#9da5b4] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#9da5b4]">
              Posição Média no Google
            </span>
            <Flame className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-2xl font-black text-[#eeeeee] font-mono tracking-tight">
            {isLoading ? "---" : `${data?.summary.gsc_avg_position ?? "0.0"}º`}
          </div>
          <div className="text-[11px] text-[#9da5b4] mt-1.5 flex items-center justify-between">
            <span>CTR Médio (Cliques/Imp.):</span>
            <span className="font-mono text-[#10b981]">
              {isLoading ? "---" : (data?.summary.gsc_ctr ?? "0.0%")}
            </span>
          </div>
        </GlowingCard>
      </div>

      {/* 3. Gráfico de Tendência Temporal Interativo (ApexCharts) */}
      <div className="bg-[#31363f] border border-white/10 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#76abae]" />
              Evolução Temporal: Visitas ao Site vs Cliques no Google
            </h3>
            <p className="text-[11px] text-[#9da5b4] mt-0.5">
              Comparativo diário de sessões e buscas orgânicas convertidas em visitas
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[320px] flex items-center justify-center bg-[#222831]/50 border border-white/5 animate-pulse">
            <span className="text-xs font-mono text-[#9da5b4]">Carregando linha do tempo...</span>
          </div>
        ) : (
          <ApexChartClient
            type="area"
            series={chartSeries}
            options={chartOptions}
            height={320}
          />
        )}
      </div>

      {/* 4. Duas Colunas: Cidades de SC e Canais de Tráfego */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Cidades de Origem (SC) */}
        <div className="bg-[#31363f] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#76abae]" />
              Origem Geográfica dos Visitantes (SC)
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#76abae] bg-[#76abae]/10 px-2 py-0.5 border border-[#76abae]/30">
              Foco Local
            </span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-[#9da5b4] animate-pulse">
                Carregando dados regionais...
              </div>
            ) : data?.geo_cities && data.geo_cities.length > 0 ? (
              data.geo_cities.map((city) => {
                const numericPct = parseFloat(city.percentage.replace("%", "")) || 0;
                return (
                  <div key={city.city} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#eeeeee]">{city.city}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#9da5b4] text-[11px]">{city.users} visitantes</span>
                        <span className="text-[#76abae] font-bold">{city.percentage}</span>
                      </div>
                    </div>
                    {/* Barra de progresso proporcional */}
                    <div className="w-full h-1.5 bg-[#222831] overflow-hidden">
                      <div
                        className="h-full bg-[#76abae] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(4, numericPct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#9da5b4]">Nenhum dado de localização disponível.</p>
            )}
          </div>
        </div>

        {/* Coluna 2: Canais de Aquisição */}
        <div className="bg-[#31363f] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#9be5ff]" />
              Canais de Aquisição de Tráfego
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9be5ff] bg-[#9be5ff]/10 px-2 py-0.5 border border-[#9be5ff]/30">
              Fontes
            </span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-[#9da5b4] animate-pulse">
                Carregando canais...
              </div>
            ) : data?.traffic_sources && data.traffic_sources.length > 0 ? (
              data.traffic_sources.map((ch) => {
                const numericPct = parseFloat(ch.percentage.replace("%", "")) || 0;
                return (
                  <div key={ch.channel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#eeeeee]">{ch.channel}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#9da5b4] text-[11px]">{ch.sessions} sessões</span>
                        <span className="text-[#9be5ff] font-bold">{ch.percentage}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#222831] overflow-hidden">
                      <div
                        className="h-full bg-[#9be5ff] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(4, numericPct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#9da5b4]">Nenhum dado de aquisição disponível.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Tabela de Consultas e Palavras-Chave do Search Console */}
      <div className="bg-[#31363f] border border-white/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#f59e0b]" />
              Principais Termos de Pesquisa Orgânica no Google (Search Console)
            </h3>
            <p className="text-[11px] text-[#9da5b4] mt-0.5">
              Palavras-chave que exibem o estúdio nos resultados de busca do Google
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-1 border border-[#f59e0b]/30">
            SEO & Ranking
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#9da5b4] bg-[#222831]/60">
                <th className="py-2.5 px-3">Termo / Consulta de Busca</th>
                <th className="py-2.5 px-3 text-right">Cliques</th>
                <th className="py-2.5 px-3 text-right">Impressões</th>
                <th className="py-2.5 px-3 text-right">CTR</th>
                <th className="py-2.5 px-3 text-right">Posição Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#9da5b4] animate-pulse">
                    Consultando termos de pesquisa...
                  </td>
                </tr>
              ) : data?.search_queries && data.search_queries.length > 0 ? (
                data.search_queries.map((q) => {
                  const isTop3 = q.position <= 3.0;
                  return (
                    <tr key={q.query} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-medium text-[#eeeeee] flex items-center gap-2">
                        {q.query}
                        {isTop3 && (
                          <span className="text-[9px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-none">
                            Top 3
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#eeeeee]">
                        {q.clicks}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#9da5b4]">
                        {q.impressions.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#10b981]">
                        {q.ctr}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold ${
                            isTop3
                              ? "bg-[#76abae]/20 text-[#76abae] border border-[#76abae]/30"
                              : "text-[#9da5b4]"
                          }`}
                        >
                          {q.position.toFixed(1)}º
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-[#9da5b4]">
                    Nenhuma consulta registrada no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Top Páginas Acessadas */}
      <div className="bg-[#31363f] border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#eeeeee] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#76abae]" />
            Páginas Mais Acessadas do Site
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#9da5b4]">
            Visualizações de Página
          </span>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-[#9da5b4] animate-pulse">
              Carregando páginas...
            </div>
          ) : data?.top_pages && data.top_pages.length > 0 ? (
            data.top_pages.map((page) => {
              const numericPct = parseFloat(page.percentage.replace("%", "")) || 0;
              return (
                <div key={page.path} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#eeeeee] flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#76abae]" />
                      {page.path}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#9da5b4] text-[11px]">{page.page_views} views</span>
                      <span className="text-[#76abae] font-bold">{page.percentage}</span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-[#222831] overflow-hidden">
                    <div
                      className="h-full bg-[#76abae] transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(3, numericPct))}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[#9da5b4]">Nenhuma página registrada no período.</p>
          )}
        </div>
      </div>
    </div>
  );
}
