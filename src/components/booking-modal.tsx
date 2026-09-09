import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type BookingServiceType =
  | "studio"
  | "home"
  | "flash";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultService?: BookingServiceType;
}

const locationOptions: { id: BookingServiceType; label: string; sub: string }[] = [
  {
    id: "studio",
    label: "Estúdio Privado",
    sub: "Palhoça",
  },
  {
    id: "home",
    label: "Atendimento VIP",
    sub: "Domicílio / Floripa",
  },
  {
    id: "flash",
    label: "Outra Cidade",
    sub: "Guest / Eventos",
  },
];

const locationLabels: Record<BookingServiceType, string> = {
  studio: "Estúdio Privado (Palhoça)",
  home: "Atendimento a Domicílio (Florianópolis / São José / Região)",
  flash: "Outra Cidade / Eventos",
};

export function BookingModal({
  open,
  onOpenChange,
  defaultService = "studio",
}: BookingModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [service, setService] = React.useState<BookingServiceType>(defaultService);
  const [message, setMessage] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const firstInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (defaultService) {
      setService(defaultService);
    }
  }, [defaultService]);

  React.useEffect(() => {
    if (open) {
      setSubmitted(false);
      setError(null);
      // Ensure focus on first input immediately after open
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setError(null);
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      phone,
      email,
      location: locationLabels[service] || service,
      message,
      _subject: "Novo Orçamento Autoral — Karlos Art Tattoo",
    };

    try {
      const response = await fetch("https://formspree.io/f/xqpkwdzp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json().catch(() => null);
        if (data && data.errors && data.errors.length > 0) {
          setError(data.errors.map((err: { message: string }) => err.message).join(", "));
        } else {
          setError("Ocorreu um erro ao enviar. Tente novamente ou entre em contato pelo Instagram.");
        }
      }
    } catch {
      setError("Ocorreu um erro ao enviar. Tente novamente ou entre em contato pelo Instagram.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0a0c] text-foreground p-6 sm:p-8 rounded-none border border-white/10 shadow-2xl [&>button]:text-neutral-400 [&>button]:hover:text-[#9be5ff] [&>button]:transition-colors [&>button]:rounded-none">
        <DialogHeader className="space-y-1 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#9be5ff]">
            KARLOS ART TATTOO · ATELIÊ AUTORAL
          </p>
          <DialogTitle className="text-base sm:text-lg font-bold uppercase tracking-[0.25em] text-white">
            SOLICITAR AGENDAMENTO
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 tracking-wider mt-1 mb-4">
            Preencha os dados abaixo para receber nossa proposta autoral e disponibilidade com Karlos.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none border border-[#9be5ff] text-[#9be5ff] text-xl">
              ✓
            </div>
            <h4 className="text-lg font-bold tracking-[0.25em] text-[#9be5ff] uppercase">
              SOLICITAÇÃO ENVIADA
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Obrigado! Recebemos sua ideia. O Karlos analisará a proposta e entrará em contato via WhatsApp/E-mail para alinhar disponibilidade e orçamento.
            </p>
            <button
              type="button"
              className="w-full mt-6 py-3.5 bg-[#9be5ff] hover:bg-[#82d9f7] text-[#070707] font-bold text-xs uppercase tracking-[0.25em] transition-all rounded-none shadow-[0_0_20px_rgba(155,229,255,0.25)] active:scale-[0.99] cursor-pointer"
              onClick={handleClose}
            >
              FECHAR
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Nome Completo */}
            <div>
              <Label htmlFor="booking-name" className="text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase mb-1.5 block">
                Nome Completo
              </Label>
              <input
                ref={firstInputRef}
                id="booking-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={loading}
                className="w-full bg-black/50 border border-white/15 focus:border-[#9be5ff] text-white text-sm px-3.5 py-2.5 outline-none transition-all rounded-none placeholder:text-neutral-600"
              />
            </div>

            {/* WhatsApp e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="booking-phone" className="text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase mb-1.5 block">
                  WhatsApp / Celular
                </Label>
                <input
                  id="booking-phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(48) 99999-9999"
                  disabled={loading}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#9be5ff] text-white text-sm px-3.5 py-2.5 outline-none transition-all rounded-none placeholder:text-neutral-600"
                />
              </div>
              <div>
                <Label htmlFor="booking-email" className="text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase mb-1.5 block">
                  E-mail
                </Label>
                <input
                  id="booking-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  disabled={loading}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#9be5ff] text-white text-sm px-3.5 py-2.5 outline-none transition-all rounded-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Seleção de Local de Atendimento (Pílulas / Grid Editorial) */}
            <div>
              <Label className="text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase mb-1.5 block">
                Local de Atendimento
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {locationOptions.map((opt) => {
                  const isSelected = service === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setService(opt.id)}
                      className={`py-2 px-2 text-center transition-all rounded-none cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-[#9be5ff]/10 border border-[#9be5ff] text-[#9be5ff] font-medium"
                          : "bg-black/40 border border-white/10 text-neutral-400 hover:border-white/30"
                      }`}
                    >
                      <span className="text-xs tracking-wider uppercase font-semibold">
                        {opt.label}
                      </span>
                      <span className={`text-[10px] tracking-wide mt-0.5 ${isSelected ? "text-[#9be5ff]/80" : "text-neutral-500"}`}>
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ideia / Referência */}
            <div>
              <Label htmlFor="booking-notes" className="text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase mb-1.5 block">
                Ideia / Local do Corpo / Referência
              </Label>
              <textarea
                id="booking-notes"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva brevemente sua ideia, tamanho aproximado e local do corpo..."
                disabled={loading}
                className="w-full bg-black/50 border border-white/15 focus:border-[#9be5ff] text-white text-sm px-3.5 py-2.5 outline-none transition-all rounded-none placeholder:text-neutral-600 resize-none"
              />
            </div>

            <p className="text-center text-[10px] uppercase tracking-[0.16em] text-neutral-500 pt-0.5">
              Atendimento presencial no ateliê e domiciliar em toda a Grande Florianópolis.
            </p>

            {error && (
              <div className="text-center text-xs text-red-400 tracking-wide font-medium bg-red-950/30 border border-red-800/40 p-2.5 rounded-none">
                {error}
              </div>
            )}

            <div className="pt-2 pb-1">
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 sm:mt-4 py-3.5 bg-[#9be5ff] hover:bg-[#82d9f7] text-[#070707] font-bold text-xs uppercase tracking-[0.25em] transition-all rounded-none shadow-[0_0_20px_rgba(155,229,255,0.25)] active:scale-[0.99] cursor-pointer ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "ENVIANDO..." : "CONFIRMAR SOLICITAÇÃO"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
