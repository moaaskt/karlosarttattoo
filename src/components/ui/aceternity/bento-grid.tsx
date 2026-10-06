import * as React from "react";
import { cn } from "@/lib/utils";

interface BentoGridProps {
  className?: string;
  children?: React.ReactNode;
}

export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  badge?: React.ReactNode;
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  children,
  badge,
}: BentoGridItemProps) {
  return (
    <div
      className={cn(
        "row-span-1 rounded-none p-5 bg-[#0b0b0e] border border-white/10 flex flex-col justify-between space-y-4 hover:border-[#9be5ff]/40 transition duration-300 relative overflow-hidden group shadow-lg",
        className,
      )}
    >
      {/* Luz sutil de destaque no topo do card */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9be5ff]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {header}

      <div className="flex-1 flex flex-col justify-between">
        {(icon || badge) && (
          <div className="flex items-center justify-between gap-2 mb-2">
            {icon && <div className="text-[#9be5ff]">{icon}</div>}
            {badge && <div>{badge}</div>}
          </div>
        )}

        {title && (
          <div className="font-extrabold text-sm sm:text-base uppercase tracking-[0.16em] text-white">
            {title}
          </div>
        )}

        {description && (
          <div className="font-normal text-xs text-neutral-400 mt-1 leading-relaxed">
            {description}
          </div>
        )}

        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
