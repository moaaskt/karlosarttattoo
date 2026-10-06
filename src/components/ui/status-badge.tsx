import * as React from "react";
import {
  Archive,
  Calendar,
  Hash,
  MapPin,
  PhoneCall,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LeadStatus = "novo" | "contatado" | "agendado" | "arquivado";

const BASE = "inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 shadow-none";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; icon: LucideIcon; className: string; iconClassName: string }
> = {
  novo: {
    label: "Novo",
    icon: Sparkles,
    className: "bg-cyan-500 text-slate-950 font-semibold border-cyan-600 hover:bg-cyan-500",
    iconClassName: "text-slate-950",
  },
  agendado: {
    label: "Agendado",
    icon: Calendar,
    className:
      "bg-emerald-500 text-slate-950 font-semibold border-emerald-600 hover:bg-emerald-500",
    iconClassName: "text-slate-950",
  },
  contatado: {
    label: "Contatado",
    icon: PhoneCall,
    className: "bg-amber-500 text-slate-950 font-semibold border-amber-600 hover:bg-amber-500",
    iconClassName: "text-slate-950",
  },
  arquivado: {
    label: "Arquivado",
    icon: Archive,
    className: "bg-slate-800 text-slate-200 font-semibold border-slate-700 hover:bg-slate-800",
    iconClassName: "text-slate-200",
  },
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.arquivado;
  const Icon = config.icon;
  return (
    <Badge variant="default" className={cn(BASE, config.className, className)}>
      <Icon className={cn("w-3 h-3", config.iconClassName)} />
      {config.label}
    </Badge>
  );
}

const INFO_ICONS = { location: MapPin, id: Hash } as const;

export function InfoBadge({
  type,
  children,
  className,
}: {
  type: keyof typeof INFO_ICONS;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = INFO_ICONS[type];
  return (
    <Badge
      variant="outline"
      className={cn(BASE, "bg-slate-800 text-slate-200 border-slate-700 font-medium", className)}
    >
      <Icon className="w-3 h-3 text-slate-200" />
      {children}
    </Badge>
  );
}
