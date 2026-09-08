import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import heroVideo from "@/assets/tattoo-hero.mp4";
import tattoo01 from "@/assets/tattoo-detail-01.jpg";
import tattoo02 from "@/assets/tattoo-detail-02.jpg";
import tattoo03 from "@/assets/tattoo-detail-03.jpg";
import tattoo04 from "@/assets/tattoo-detail-04.jpg";
import tattoo05 from "@/assets/tattoo-detail-05.jpg";
import tattoo06 from "@/assets/tattoo-detail-06.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nox Tattoo — Arte Autoral" },
      { name: "description", content: "Tatuagem autoral, atendimentos exclusivos e workshops em São Paulo e Rio de Janeiro." },
      { property: "og:title", content: "Nox Tattoo — Arte Autoral" },
      { property: "og:description", content: "Tatuagem autoral, atendimentos exclusivos e workshops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const work = [
  { src: tattoo01, alt: "Tatuagem geométrica de linhas finas no antebraço", className: "md:row-span-1" },
  { src: tattoo02, alt: "Retrato editorial com tatuagem abstrata nas costas", className: "md:row-span-2" },
  { src: tattoo03, alt: "Processo de criação de uma tatuagem autoral", className: "md:row-span-1" },
  { src: tattoo04, alt: "Detalhe de tatuagem ornamental em preto", className: "md:row-span-2" },
  { src: tattoo05, alt: "Retrato editorial com tatuagens no pescoço", className: "md:row-span-1" },
  { src: tattoo06, alt: "Tatuagem botânica de traço fino no braço", className: "md:row-span-2" },
];

function Mark() {
  return (
    <a href="#inicio" aria-label="Nox Tattoo — início" className="group flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-9 w-9 text-primary" aria-hidden="true">
        <path d="M4 4h32v32H4zM4 4l32 32M36 4L4 36M20 4v32" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M12 20h16" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-foreground sm:block">Nox Tattoo</span>
    </a>
  );
}

function Index() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 flex h-24 items-center justify-between px-6 md:px-12">
        <Mark />
        <nav aria-label="Contato" className="flex items-center gap-5">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="text-foreground transition-colors hover:text-primary"><Instagram strokeWidth={1.25} /></a>
          <a href="mailto:contato@noxtattoo.com" aria-label="E-mail" className="text-foreground transition-colors hover:text-primary"><Mail strokeWidth={1.25} /></a>
        </nav>
      </header>

      <section id="inicio" className="relative flex min-h-[100svh] items-center justify-center px-5 py-28">
        <video autoPlay muted loop playsInline poster={tattoo02} className="absolute inset-0 h-full w-full object-cover object-center grayscale" aria-hidden="true">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="hero-overlay absolute inset-0" />
        <p className="absolute left-6 top-1/2 hidden -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-[0.38em] text-muted-foreground md:block">São Paulo — Brasil</p>
        <div className="relative z-10 flex w-full max-w-md flex-col gap-3">
          <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.45em] text-primary">Tatuagem autoral · 2026</p>
          <h1 className="sr-only">Nox Tattoo — tatuagem autoral</h1>
          <Button asChild variant="editorial" className="h-14 w-full px-6 text-[11px] font-bold tracking-[0.22em]"><a href="mailto:contato@noxtattoo.com?subject=Agendamento%20Estúdio">Agendamento Estúdio</a></Button>
          <Button asChild variant="editorial" className="h-14 w-full px-6 text-[11px] font-bold tracking-[0.22em]"><a href="mailto:contato@noxtattoo.com?subject=Atendimento%20a%20Domicílio">Atendimento a Domicílio</a></Button>
          <Button asChild variant="editorial" className="h-14 w-full px-6 text-[11px] font-bold tracking-[0.22em]"><a href="#portfolio">Flash Days &amp; Workshops</a></Button>
        </div>
        <a href="#locais" aria-label="Ver locais" className="absolute bottom-7 left-1/2 -translate-x-1/2 text-primary"><ArrowDown className="h-5 w-5 animate-bounce" strokeWidth={1} /></a>
      </section>

      <section id="locais" className="border-y border-border px-6 py-24 md:px-12 md:py-36">
        <div className="mx-auto max-w-6xl">
          <p className="section-index">01 / Locais</p>
          <h2 className="mb-20 text-center text-xl font-semibold uppercase tracking-[0.34em] md:text-3xl">Onde me encontrar</h2>
          <div className="grid gap-px bg-border md:grid-cols-3">
            <article className="bg-background px-5 py-9 md:px-8"><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">◊ São Paulo</h3><p className="mt-5 text-xs uppercase leading-7 tracking-[0.16em] text-muted-foreground">— Atelier República<br />— Atendimento com hora marcada</p></article>
            <article className="bg-background px-5 py-9 md:px-8"><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">◊ Rio de Janeiro</h3><p className="mt-5 text-xs uppercase leading-7 tracking-[0.16em] text-muted-foreground">— Estúdio Botafogo<br />— Datas selecionadas</p></article>
            <article className="bg-background px-5 py-9 md:px-8"><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">◊ Outras Cidades</h3><p className="mt-5 text-xs uppercase leading-7 tracking-[0.16em] text-muted-foreground">— Agenda itinerante<br />— Consulte disponibilidade</p></article>
          </div>
          <div className="mt-16 text-center"><Button asChild variant="editorialGhost" className="h-12 px-9 text-[10px] font-semibold uppercase tracking-[0.24em]"><a href="mailto:contato@noxtattoo.com?subject=Solicitação%20de%20Orçamento">Solicitar Orçamento</a></Button></div>
        </div>
      </section>

      <section id="portfolio" className="py-24 md:py-36">
        <div className="mb-16 px-6 text-center md:px-12"><p className="section-index">02 / Trabalhos selecionados</p><h2 className="text-xl font-semibold uppercase tracking-[0.34em] md:text-3xl">| Portfólio |</h2></div>
        <div className="grid grid-cols-2 gap-0.5 bg-background md:auto-rows-[22rem] md:grid-cols-3">
          {work.map((image, index) => <figure key={image.src} className={`group relative aspect-[4/5] overflow-hidden bg-muted md:aspect-auto ${image.className}`}><img src={image.src} alt={image.alt} loading="lazy" width={800} height={1000} className="h-full w-full object-cover grayscale transition-[filter,transform] duration-700 group-hover:scale-[1.02] group-hover:grayscale-0" /><figcaption className="absolute bottom-0 left-0 bg-background px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">0{index + 1} / Nox</figcaption></figure>)}
        </div>
        <div className="mt-16 text-center"><Button variant="link" className="rounded-none px-0 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground no-underline hover:text-primary hover:no-underline">Carregar mais <span aria-hidden="true">＋</span></Button></div>
      </section>

      <footer className="flex flex-col gap-5 border-t border-border px-6 py-10 text-[9px] uppercase tracking-[0.22em] text-muted-foreground md:flex-row md:items-center md:justify-between md:px-12"><span>© 2026 Nox Tattoo</span><span>Arte permanente / Feita à mão</span></footer>
    </main>
  );
}