import * as React from "react";
import { cn } from "@/lib/utils";

interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: string;
  glowOpacity?: number;
  className?: string;
  children: React.ReactNode;
}

export function GlowingCard({
  glowColor = "#76abae",
  glowOpacity = 0.2,
  className,
  children,
  ...props
}: GlowingCardProps) {
  const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden bg-[#31363f] border border-white/10 rounded-none transition-colors duration-300",
        className,
      )}
      {...props}
    >
      {/* Efeito Spotlight / Glow dinâmico acompanhando o cursor */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${glowColor}${Math.round(
            glowOpacity * 255,
          )
            .toString(16)
            .padStart(2, "0")}, transparent 80%)`,
        }}
      />

      {/* Borda luminosa no hover */}
      <div
        className="pointer-events-none absolute inset-0 border transition-opacity duration-300 rounded-none"
        style={{
          opacity: isHovered ? 0.6 : 0,
          borderColor: glowColor,
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
