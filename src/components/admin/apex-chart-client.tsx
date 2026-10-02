import * as React from "react";
import type { ApexOptions } from "apexcharts";

export interface ApexChartClientProps {
  type:
    | "area"
    | "line"
    | "bar"
    | "radialBar"
    | "donut"
    | "pie"
    | "scatter"
    | "bubble"
    | "heatmap"
    | "candlestick"
    | "radar"
    | "polarArea"
    | "rangeBar"
    | "rangeArea"
    | "treemap";
  series: any[];
  options: ApexOptions;
  height?: string | number;
  width?: string | number;
}

export function ApexChartClient({
  type,
  series,
  options,
  height = 300,
  width = "100%",
}: ApexChartClientProps) {
  const [ChartComponent, setChartComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    let isCancelled = false;

    // Carregamento dinâmico estritamente no cliente para proteger contra erros de window no SSR
    import("react-apexcharts")
      .then((mod) => {
        if (!isCancelled) {
          setChartComponent(() => mod.default ?? mod);
        }
      })
      .catch((err) => {
        console.error("[ApexChartClient] Erro ao carregar react-apexcharts:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isMounted || !ChartComponent) {
    return (
      <div
        style={{ height: typeof height === "number" ? `${height}px` : height, width }}
        className="w-full flex flex-col items-center justify-center bg-black/40 border border-white/5 animate-pulse"
      >
        <div className="w-6 h-6 rounded-full border-2 border-[#9be5ff] border-t-transparent animate-spin mb-2" />
        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500">
          Renderizando Gráfico...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden [&_.apexcharts-canvas]:!bg-transparent [&_.apexcharts-tooltip]:!bg-[#070707] [&_.apexcharts-tooltip]:!border [&_.apexcharts-tooltip]:!border-white/15 [&_.apexcharts-tooltip]:!rounded-none [&_.apexcharts-tooltip]:!shadow-2xl [&_.apexcharts-tooltip-title]:!bg-black/60 [&_.apexcharts-tooltip-title]:!border-b [&_.apexcharts-tooltip-title]:!border-white/10 [&_.apexcharts-tooltip-title]:!font-mono [&_.apexcharts-tooltip-title]:!text-[11px] [&_.apexcharts-tooltip-text]:!text-xs [&_.apexcharts-tooltip-text]:!text-white [&_.apexcharts-xaxistooltip]:!bg-[#070707] [&_.apexcharts-xaxistooltip]:!border-white/10 [&_.apexcharts-xaxistooltip]:!text-[#9be5ff] [&_.apexcharts-xaxistooltip]:!rounded-none">
      <ChartComponent type={type} series={series} options={options} height={height} width={width} />
    </div>
  );
}
