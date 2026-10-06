import { cn } from "@/lib/utils";

interface BackgroundBeamsProps {
  className?: string;
}

export function BackgroundBeams({ className }: BackgroundBeamsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden z-0 select-none",
        className,
      )}
    >
      {/* Malha de grade sutil dark */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Gradientes radiais superiores com iluminação ciano e neutra suave */}
      <div
        className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full blur-[140px] opacity-15"
        style={{
          background: "radial-gradient(circle, #9be5ff 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 -right-20 h-[600px] w-[600px] rounded-full blur-[160px] opacity-10"
        style={{
          background: "radial-gradient(circle, #9be5ff 0%, transparent 70%)",
        }}
      />

      {/* Linhas de feixe de luz decorativas */}
      <svg
        className="absolute top-0 left-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9be5ff" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="10%" y1="0" x2="60%" y2="100%" stroke="url(#beamGradient)" strokeWidth="1" />
        <line
          x1="80%"
          y1="0"
          x2="30%"
          y2="100%"
          stroke="url(#beamGradient)"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
      </svg>
    </div>
  );
}
