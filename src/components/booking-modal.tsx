import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BookingServiceType =
  | "studio"
  | "home"
  | "flash";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultService?: BookingServiceType;
}

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
      <DialogContent className="max-w-md bg-[#070707] text-foreground p-6 sm:p-8 rounded-none border-[1.5px] border-[#9be5ff] shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#9be5ff]">
            KARLOS ART TATTOO · Ateliê Autoral
          </p>
          <DialogTitle className="text-xl font-bold uppercase tracking-[0.2em] text-white">
            Solicitar Horário
          </DialogTitle>
          <DialogDescription className="text-xs text-[#A1A1AA] tracking-wide">
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
            <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-sm mx-auto">
              Obrigado! Recebemos sua ideia. O Karlos analisará a proposta e entrará em contato via WhatsApp/E-mail para alinhar disponibilidade e orçamento.
            </p>
            <Button
              type="button"
              variant="editorial"
              className="mt-4 w-full h-11 text-xs uppercase tracking-[0.2em] font-semibold bg-[#9be5ff] text-black hover:bg-white transition-all rounded-none"
              onClick={handleClose}
            >
              FECHAR
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="booking-name" className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Nome Completo
              </Label>
              <Input
                ref={firstInputRef}
                id="booking-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                disabled={loading}
                className="h-10 rounded-none border-neutral-800 bg-black/60 text-sm text-white placeholder:text-zinc-600 focus-visible:border-[#9be5ff] focus-visible:ring-0"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="booking-phone" className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                  WhatsApp / Celular
                </Label>
                <Input
                  id="booking-phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={loading}
                  className="h-10 rounded-none border-neutral-800 bg-black/60 text-sm text-white placeholder:text-zinc-600 focus-visible:border-[#9be5ff] focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-email" className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                  E-mail
                </Label>
                <Input
                  id="booking-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  disabled={loading}
                  className="h-10 rounded-none border-neutral-800 bg-black/60 text-sm text-white placeholder:text-zinc-600 focus-visible:border-[#9be5ff] focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-service" className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Local de Atendimento
              </Label>
              <Select
                value={service}
                onValueChange={(v) => setService(v as BookingServiceType)}
                disabled={loading}
              >
                <SelectTrigger
                  id="booking-service"
                  className="h-10 rounded-none border-neutral-800 bg-black/60 text-sm text-white focus:ring-0 focus:border-[#9be5ff]"
                >
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-neutral-800 bg-[#121214] text-white">
                  <SelectItem value="studio" className="cursor-pointer focus:bg-[#27272a] focus:text-white rounded-none">
                    Estúdio Privado (Palhoça)
                  </SelectItem>
                  <SelectItem value="home" className="cursor-pointer focus:bg-[#27272a] focus:text-white rounded-none">
                    Atendimento a Domicílio (Florianópolis / São José / Região)
                  </SelectItem>
                  <SelectItem value="flash" className="cursor-pointer focus:bg-[#27272a] focus:text-white rounded-none">
                    Outra Cidade / Eventos
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-notes" className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Ideia / Local do Corpo / Referência
              </Label>
              <Textarea
                id="booking-notes"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva brevemente sua ideia, tamanho aproximado e local..."
                disabled={loading}
                className="rounded-none border-neutral-800 bg-black/60 text-sm text-white placeholder:text-zinc-600 focus-visible:border-[#9be5ff] focus-visible:ring-0 resize-none"
              />
            </div>

            <p className="text-center text-[10px] uppercase tracking-[0.16em] text-[#A1A1AA] pt-1">
              Atendimento presencial e a domicílio em toda a Grande Florianópolis.
            </p>

            {error && (
              <div className="text-center text-xs text-red-400 tracking-wide font-medium bg-red-950/30 border border-red-800/40 p-2.5">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                variant="editorial"
                className={`w-full h-12 text-xs uppercase tracking-[0.2em] font-semibold bg-[#9be5ff] text-black hover:bg-white transition-all rounded-none ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "ENVIANDO..." : "Confirmar Solicitação"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
