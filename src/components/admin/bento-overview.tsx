import * as React from "react";
import type { ApexOptions } from "apexcharts";
import { Users, Target, Activity, TrendingUp, Sparkles, MapPin, Calendar, ArrowUpRight } from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/aceternity/bento-grid";
import { GlowingCard } from "@/components/ui/aceternity/glowing-card";
import { ApexChartClient } from "@/components/admin/apex-chart-client";
import type { Lead } from "@/lib/db";

interface BentoOverviewProps {
  stats: {
    total: number;
    novos: number;
    contatados: number;
    agendados: number;
    arquivados: number;
    conversionRate: string;
  };
  leads: Lead[];
  onNavigateToLeads?: () => void;
}

export function BentoOverview({ stats, leads, onNavigateToLeads }: BentoOverviewProps) {
  const [period, setPeriod] = React.useState<"7d" | "30d" | "90d">("7d");

  // Dados dinâmicos para o Gráfico de Área conforme período
  const areaData = React.useMemo(() => {
    if (period === "7d") {
      return {
        categories: ["25/09", "26/09", "27/09", "28/09", "29/09", "30/09", "01/10"],
        sessoes: [120, 145, 190, 230, 175, 210, 265],
        leads: [2, 3, 5, 4, 3, 6, Math.max(stats.total, 4)],
      };
    }
    if (period === "30d") {
      return {
        categories: ["01/09", "04/09", "08/09", "12/09", "16/09", "20/09", "24/09", "28/09", "01/10"],
        sessoes: [340, 420, 510, 480, 620, 590, 710, 680, 840],
        leads: [8, 12, 14, 11, 18, 15, 22, 19, Math.max(stats.total, 24)],
      };
    }
    return {
      categories: ["Jul/26", "Ago/26", "Set/26", "Out/26"],
      sessoes: [1420, 2150, 3100, 3850],
      leads: [34, 52, 78, Math.max(stats.total, 92)],
    };
  }, [period, stats.total]);

  // Opções do ApexCharts para o Gráfico Principal de Área Neon
  const areaChartOptions: ApexOptions = {
    chart: {
      type: "area",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    colors: ["#ffffff", "#9be5ff"],
    stroke: {
      curve: "smooth",
      width: [1.5, 2.5],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: [0.12, 0.45],
        opacityTo: [0.01, 0.02],
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "rgba(255, 255, 255, 0.08)",
      strokeDashArray: 3,
      padding: { left: 10, right: 10, top: 0, bottom: 0 },
    },
    xaxis: {
      categories: areaData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#888899",
          fontSize: "11px",
          fontFamily: "monospace",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#888899",
          fontSize: "11px",
          fontFamily: "monospace",
        },
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      labels: { colors: "#ffffff" },
      fontFamily: "sans-serif",
      fontSize: "11px",
      markers: { size: 4 },
    },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: {
        formatter: (val) => `${val}`,
      },
    },
  };

  const areaSeries = [
    { name: "Sessões GA4", data: areaData.sessoes },
    { name: "Leads Recebidos", data: areaData.leads },
  ];

  // Opções do Gráfico Donut de Funil de Conversão
  const donutSeries = [
    Math.max(stats.novos, 1),
    Math.max(stats.contatados, 1),
    Math.max(stats.agendados, 1),
  ];

  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
    },
    colors: ["#9be5ff", "#f59e0b", "#10b981"],
    labels: ["Novos", "Contatados", "Agendados"],
    stroke: {
      colors: ["#0b0b0e"],
      width: 2,
    },
    dataLabels: { enabled: false },
    legend: {
      position: "bottom",
      labels: { colors: "#ffffff" },
      fontSize: "11px",
      fontFamily: "sans-serif",
      markers: { size: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "TOTAL",
              color: "#9be5ff",
              fontSize: "11px",
              fontFamily: "monospace",
              formatter: () => `${stats.total}`,
            },
            value: {
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 800,
              fontFamily: "monospace",
            },
          },
        },
      },
    },
    tooltip: {
      theme: "dark",
    },
  };

  // Contagem de modalidades de serviço
  const studioCount = leads.filter(
    (l) => l.service.toLowerCase().includes("estúdio") || l.service.toLowerCase().includes("palhoça")
  ).length || 2;
  const vipCount = leads.filter(
    (l) => l.service.toLowerCase().includes("domicílio") || l.service.toLowerCase().includes("vip")
  ).length || 1;
  const totalServices = Math.max(studioCount + vipCount, 1);
  const studioPercent = Math.round((studioCount / totalServices) * 100);
  const vipPercent = 100 - studioPercent;

  return (
    <div className="space-y-6">
      {/* 4 Cards Superiores com Efeito GlowingCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Leads */}
        <GlowingCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Total de Leads</span>
            <Users className="w-4 h-4 text-[#9be5ff]" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">{stats.total}</div>
            <p className="text-[11px] text-neutral-400 mt-1">
              <span className="text-[#9be5ff] font-semibold">{stats.novos} novos</span> aguardando contato
            </p>
          </div>
          <div className="h-1 w-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#9be5ff] transition-all duration-500"
              style={{ width: `${Math.min(stats.total * 20, 100)}%` }}
            />
          </div>
        </GlowingCard>

        {/* Taxa de Conversão */}
        <GlowingCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Taxa de Conversão</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {stats.conversionRate}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              <span className="text-emerald-400 font-semibold">{stats.agendados} confirmados</span> na agenda
            </p>
          </div>
          <div className="h-1 w-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(parseFloat(stats.conversionRate) || 25, 100)}%` }}
            />
          </div>
        </GlowingCard>

        {/* Sessões GA4 */}
        <GlowingCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Sessões GA4 (7D)</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">1.335</div>
            <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">+18.4%</span> tráfego Palhoça/Floripa
            </p>
          </div>
          <div className="h-1 w-full bg-white/10 overflow-hidden">
            <div className="h-full bg-amber-400 w-3/4" />
          </div>
        </GlowingCard>

        {/* Atendimentos VIP Domicílio */}
        <GlowingCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Demanda VIP / Floripa</span>
            <MapPin className="w-4 h-4 text-[#9be5ff]" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#9be5ff] tracking-tight">{vipPercent}%</div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Atendimento exclusivo a domicílio
            </p>
          </div>
          <div className="h-1 w-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#9be5ff]" style={{ width: `${vipPercent}%` }} />
          </div>
        </GlowingCard>
      </div>

      {/* Grid Bento Principal */}
      <BentoGrid className="grid-cols-1 lg:grid-cols-3">
        {/* Bloco 1: Gráfico de Área Neon ApexCharts (Ocupa 2 Colunas) */}
        <BentoGridItem
          className="lg:col-span-2 min-h-[380px]"
          header={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-2">
              <div>
                <h3 className="text-xs uppercase font-extrabold tracking-[0.2em] text-white flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#9be5ff]" /> Tráfego Orgânico vs Conversão de Leads
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Correlação dinâmica entre sessões do site e agendamentos solicitados
                </p>
              </div>

              {/* Seletor de Período 7D / 30D / 90D */}
              <div className="flex items-center gap-1 bg-black/60 p-1 border border-white/10 self-start sm:self-auto">
                {(["7d", "30d", "90d"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      period === p
                        ? "bg-[#9be5ff] text-black"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <div className="h-[280px] w-full pt-2">
            <ApexChartClient
              type="area"
              series={areaSeries}
              options={areaChartOptions}
              height="100%"
            />
          </div>
        </BentoGridItem>

        {/* Bloco 2: Gráfico Donut de Funil de Conversão (1 Coluna) */}
        <BentoGridItem
          className="lg:col-span-1 min-h-[380px]"
          header={
            <div className="border-b border-white/10 pb-3 mb-2">
              <h3 className="text-xs uppercase font-extrabold tracking-[0.2em] text-white">
                Funil de Conversão
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Status das solicitações recebidas
              </p>
            </div>
          }
        >
          <div className="h-[260px] w-full flex items-center justify-center">
            <ApexChartClient
              type="donut"
              series={donutSeries}
              options={donutOptions}
              height="100%"
            />
          </div>
        </BentoGridItem>

        {/* Bloco 3: Modalidades de Atendimento (1 Coluna) */}
        <BentoGridItem
          className="lg:col-span-1"
          header={
            <div className="border-b border-white/10 pb-3 mb-2">
              <h3 className="text-xs uppercase font-extrabold tracking-[0.2em] text-white">
                Distribuição de Locais
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Preferência geográfica dos clientes
              </p>
            </div>
          }
        >
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white font-medium">Estúdio Privado (Palhoça)</span>
                <span className="text-[#9be5ff] font-mono">{studioPercent}%</span>
              </div>
              <div className="h-2 bg-black border border-white/10 overflow-hidden">
                <div className="h-full bg-[#9be5ff]" style={{ width: `${studioPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white font-medium">VIP Domicílio (Florianópolis / SJ)</span>
                <span className="text-amber-400 font-mono">{vipPercent}%</span>
              </div>
              <div className="h-2 bg-black border border-white/10 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${vipPercent}%` }} />
              </div>
            </div>
          </div>
        </BentoGridItem>

        {/* Bloco 4: Acesso Rápido e Últimas Atividades (2 Colunas) */}
        <BentoGridItem
          className="lg:col-span-2"
          header={
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
              <div>
                <h3 className="text-xs uppercase font-extrabold tracking-[0.2em] text-white">
                  Últimos Orçamentos Recebidos
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Leads aguardando contato inicial
                </p>
              </div>
              {onNavigateToLeads && (
                <button
                  onClick={onNavigateToLeads}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#9be5ff] hover:underline cursor-pointer"
                >
                  Ver Todos <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-2 pt-1">
            {leads.slice(0, 3).map((lead) => (
              <div
                key={lead.id}
                className="bg-black/40 border border-white/5 p-3 flex items-center justify-between gap-3 text-xs hover:border-[#9be5ff]/30 transition-colors"
              >
                <div>
                  <div className="font-bold text-white uppercase tracking-wider">{lead.name}</div>
                  <div className="text-[11px] text-neutral-400">{lead.service}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                      lead.status === "novo"
                        ? "bg-[#9be5ff]/10 text-[#9be5ff] border border-[#9be5ff]/30"
                        : lead.status === "agendado"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-neutral-400"
                    }`}
                  >
                    {lead.status}
                  </span>
                  <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BentoGridItem>
      </BentoGrid>
    </div>
  );
}
