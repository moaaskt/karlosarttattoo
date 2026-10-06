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

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; icon: LucideIcon; className: string; iconClassName: string }
> = {
  novo: {
    label: "Novo",
    icon: Sparkles,
    className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
    iconClassName: "text-cyan-400",
  },
  agendado: {
    label: "Agendado",
    icon: Calendar,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    iconClassName: "text-emerald-400",
  },
  contatado: {
    label: "Contatado",
    icon: PhoneCall,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    iconClassName: "text-amber-400",
  },
  arquivado: {
    label: "Arquivado",
    icon: Archive,
    className: "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10",
    iconClassName: "text-neutral-400",
  },
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.arquivado;
  const Icon = config.icon;
  return (
    <Badge
      variant="default"
      className={cn("inline-flex items-center gap-1.5 shadow-none", config.className, className)}
    >
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
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <Icon className="w-3 h-3" />
      {children}
    </Badge>
  );
}
