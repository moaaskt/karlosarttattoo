import * as React from "react";
import type { CalendarOptions } from "@fullcalendar/core";

type FCPlugins = any[];
let cachedPlugins: FCPlugins | null = null;
let cachedFullCalendarComponent: React.ComponentType<any> | null = null;

export interface FullCalendarClientProps extends CalendarOptions {
  [key: string]: any;
}

export const FullCalendarClient = React.memo(
  React.forwardRef<any, FullCalendarClientProps>((props, ref) => {
    const [FullCalendarComponent, setFullCalendarComponent] = React.useState<React.ComponentType<any> | null>(
      () => cachedFullCalendarComponent
    );
    const [isMounted, setIsMounted] = React.useState(Boolean(cachedFullCalendarComponent));

    React.useEffect(() => {
      setIsMounted(true);
      if (cachedFullCalendarComponent && cachedPlugins) {
        return;
      }

      let cancelled = false;

      Promise.all([
        import("@fullcalendar/react"),
        import("@fullcalendar/daygrid"),
        import("@fullcalendar/timegrid"),
        import("@fullcalendar/interaction"),
        import("@fullcalendar/luxon3"),
      ]).then(([reactMod, dayGrid, timeGrid, interaction, luxon3]) => {
        if (cancelled) return;
        if (!cachedPlugins) {
          cachedPlugins = [
            dayGrid.default,
            timeGrid.default,
            interaction.default,
            luxon3.default,
          ];
        }
        cachedFullCalendarComponent = reactMod.default;
        setFullCalendarComponent(() => reactMod.default);
      });

      return () => {
        cancelled = true;
      };
    }, []);

    if (!isMounted || !FullCalendarComponent) {
      return (
        <div className="w-full flex flex-col items-center justify-center bg-black/40 border border-white/5 animate-pulse min-h-[500px]">
          <div className="w-7 h-7 rounded-full border-2 border-[#9be5ff] border-t-transparent animate-spin mb-3" />
          <span className="text-[11px] uppercase font-bold tracking-[0.2em] text-neutral-400">
            Carregando Calendário do Ateliê...
          </span>
        </div>
      );
    }

    return (
      <div className="karlos-fullcalendar-container w-full h-full">
        <FullCalendarComponent ref={ref} {...props} plugins={cachedPlugins!} />
      </div>
    );
  })
);

FullCalendarClient.displayName = "FullCalendarClient";
