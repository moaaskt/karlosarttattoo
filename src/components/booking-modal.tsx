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

export function BookingModal({
  open,
  onOpenChange,
  defaultService = "studio",
}: BookingModalProps) {
  const [service, setService] = React.useState<BookingServiceType>(defaultService);
  const [submitted, setSubmitted] = React.useState(false);
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (defaultService) {
      setService(defaultService);
    }
  }, [defaultService]);

  React.useEffect(() => {
    if (open) {
      setSubmitted(false);
      // Ensure focus on first input immediately after open
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-[#121214] text-foreground p-6 sm:p-8 rounded-none border-[1.5px] border-primary/40 shadow-2xl">
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#9be5ff] text-[#9be5ff] text-xl">
              ✓
            </div>
            <h4 className="text-base font-medium tracking-widest text-white uppercase">
              Solicitação Enviada!
            </h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              A equipe da KARLOS ART TATTOO entrará em contato via WhatsApp/E-mail dentro de 24 horas.
            </p>
            <Button
              variant="editorial"
              className="mt-4 w-full h-11 text-xs uppercase tracking-[0.18em]"
              onClick={() => onOpenChange(false)}
            >
              Fechar
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
                placeholder="Seu nome"
                className="h-10 rounded-none border-border bg-black/40 text-sm text-white placeholder:text-zinc-600 focus-visible:border-primary focus-visible:ring-0"
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
                  placeholder="(11) 99999-9999"
                  className="h-10 rounded-none border-border bg-black/40 text-sm text-white placeholder:text-zinc-600 focus-visible:border-primary focus-visible:ring-0"
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
                  placeholder="voce@email.com"
                  className="h-10 rounded-none border-border bg-black/40 text-sm text-white placeholder:text-zinc-600 focus-visible:border-primary focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-service" className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                Tipo de Atendimento
              </Label>
              <Select value={service} onValueChange={(v) => setService(v as BookingServiceType)}>
                <SelectTrigger
                  id="booking-service"
                  className="h-10 rounded-none border-border bg-black/40 text-sm text-white focus:ring-0 focus:border-primary"
                >
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border bg-[#18181b] text-white">
                  <SelectItem value="studio" className="cursor-pointer focus:bg-[#27272a] focus:text-white">
                    Agendamento Estúdio (São Paulo / Rio)
                  </SelectItem>
                  <SelectItem value="home" className="cursor-pointer focus:bg-[#27272a] focus:text-white">
                    Atendimento a Domicílio VIP
                  </SelectItem>
                  <SelectItem value="flash" className="cursor-pointer focus:bg-[#27272a] focus:text-white">
                    Flash Days &amp; Workshops
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
                placeholder="Descreva brevemente sua ideia, tamanho aproximado e local..."
                className="rounded-none border-border bg-black/40 text-sm text-white placeholder:text-zinc-600 focus-visible:border-primary focus-visible:ring-0 resize-none"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="editorial"
                className="w-full h-12 text-xs uppercase tracking-[0.2em] font-semibold bg-[#9be5ff] text-black hover:bg-white transition-all"
              >
                Confirmar Solicitação
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
