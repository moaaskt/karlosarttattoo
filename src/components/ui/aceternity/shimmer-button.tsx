import * as React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ shimmerColor = "#9be5ff", background = "#070707", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex items-center justify-center overflow-hidden border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-[#9be5ff] hover:shadow-[0_0_20px_rgba(155,229,255,0.25)] active:scale-[0.99] cursor-pointer rounded-none disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
        style={{ backgroundColor: background }}
        {...props}
      >
        {/* Efeito de feixe de luz Shimmer correndo no hover/idle */}
        <span className="absolute inset-0 block h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-[rgba(155,229,255,0.25)] to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />

        {/* Conteúdo com z-index para ficar acima do brilho */}
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";
