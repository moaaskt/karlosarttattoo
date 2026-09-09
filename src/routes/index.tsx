import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, ArrowDown, Play } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { BookingModal, type BookingServiceType } from "@/components/booking-modal";
import { portfolioItems } from "@/data/portfolio";
import tattoo02 from "@/assets/tattoo-detail-02.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KARLOS ART TATTOO — Ateliê Autoral & Fine Line" },
      { name: "description", content: "Tatuagem autoral, ateliê privado e atendimento a domicílio em Palhoça, Florianópolis e toda Santa Catarina." },
      { property: "og:title", content: "KARLOS ART TATTOO — Ateliê Autoral & Fine Line" },
      { property: "og:description", content: "Tatuagem autoral, ateliê privado e atendimento a domicílio em Palhoça, Florianópolis e toda Santa Catarina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Mark() {
  return (
    <a href="#inicio" aria-label="KARLOS ART TATTOO — início" className="group flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-9 w-9 text-primary" aria-hidden="true">
        <path d="M4 4h32v32H4zM4 4l32 32M36 4L4 36M20 4v32" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M12 20h16" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="hidden text-[13px] font-medium uppercase tracking-[0.25em] text-[#F5F5F7] sm:block">
        KARLOS ART TATTOO
      </span>
    </a>
  );
}

function useEditorialAnimations(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        // Header reveal
        gsap.from("[data-anim='header'] > *", {
          y: -20,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
        });

        // Hero caption + buttons - subtle entrance once, rock-solid opacity
        gsap.fromTo(
          "[data-anim='hero-item']",
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: 0.1,
            ease: "power2.out",
            stagger: 0.1,
            clearProps: "all",
          },
        );

        // Section titles: fade + tracking expansion
        gsap.utils.toArray<HTMLElement>("[data-anim='section-title']").forEach((title) => {
          gsap.fromTo(
            title,
            { y: 24, opacity: 0, letterSpacing: "0.02em" },
            {
              y: 0,
              opacity: 1,
              letterSpacing: "0.34em",
              duration: 1.1,
              ease: "power3.out",
              scrollTrigger: { trigger: title, start: "top 85%" },
            },
          );
        });

        // Location columns
        gsap.from("[data-anim='location']", {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "#locais", start: "top 75%" },
        });

        // Portfolio parallax on alternating columns
        gsap.utils.toArray<HTMLElement>("[data-anim='tile']").forEach((tile, i) => {
          const img = tile.querySelector("img");
          if (!img) return;
          gsap.fromTo(
            img,
            { yPercent: i % 2 === 0 ? -4 : 4 },
            {
              yPercent: i % 2 === 0 ? 4 : -4,
              ease: "none",
              scrollTrigger: { trigger: tile, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        });
      }, el);

      cleanup = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [root]);
}

function Index() {
  const root = useRef<HTMLElement>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<BookingServiceType>("studio");
  const [visibleCount, setVisibleCount] = useState(6);

  useSmoothScroll();
  useEditorialAnimations(root);

  const openBooking = (service: BookingServiceType) => {
    setBookingService(service);
    setBookingOpen(true);
  };

  const handleLoadMore = () => {
    if (visibleCount < portfolioItems.length) {
      setVisibleCount((prev) => Math.min(prev + 3, portfolioItems.length));
    } else {
      window.open("https://www.instagram.com/karlitostattooo/", "_blank", "noopener,noreferrer");
    }
  };

  const displayedItems = portfolioItems.slice(0, visibleCount);

  return (
    <main ref={root} className="overflow-hidden bg-background text-foreground">
      <header data-anim="header" className="fixed inset-x-0 top-0 z-50 flex h-24 items-center justify-between px-6 md:px-12">
        <Mark />
        <nav aria-label="Contato" className="flex items-center gap-5">
          <a href="https://www.instagram.com/karlitostattooo/" target="_blank" rel="noreferrer" aria-label="Instagram" className="text-foreground transition-colors hover:text-primary"><Instagram strokeWidth={1.25} /></a>
          <a href="mailto:karlosmonsalve14@gmail.com" aria-label="E-mail" className="text-foreground transition-colors hover:text-primary"><Mail strokeWidth={1.25} /></a>
        </nav>
      </header>

      <section id="inicio" className="relative flex min-h-[100svh] items-center justify-center px-5 py-28">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={tattoo02}
          className="w-full h-full object-cover object-[center_20%] absolute inset-0 z-0 grayscale"
          aria-hidden="true"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-[1]" />
        <div className="hero-overlay absolute inset-0 pointer-events-none z-[2]" />
        <p className="absolute left-6 top-1/2 hidden -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-[0.3em] text-neutral-600 md:block z-10">SANTA CATARINA — BRASIL</p>
        <div className="relative z-10 flex w-full max-w-md flex-col gap-3">
          <p data-anim="hero-item" className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.45em] text-[#9be5ff] opacity-90">Tatuagem autoral · 2026</p>
          <h1 className="sr-only">KARLOS ART TATTOO — tatuagem autoral</h1>
          <Button
            data-anim="hero-item"
            type="button"
            variant="editorial"
            onClick={() => openBooking("studio")}
            className="h-14 w-full px-6 text-[13px] font-medium uppercase tracking-[0.18em] !opacity-100"
          >
            AGENDAMENTO ESTÚDIO
          </Button>
          <Button
            data-anim="hero-item"
            type="button"
            variant="editorial"
            onClick={() => openBooking("home")}
            className="h-14 w-full px-6 text-[13px] font-medium uppercase tracking-[0.18em] !opacity-100"
          >
            ATENDIMENTO A DOMICÍLIO
          </Button>
          <Button
            data-anim="hero-item"
            type="button"
            variant="editorial"
            onClick={() => openBooking("flash")}
            className="h-14 w-full px-6 text-[13px] font-medium uppercase tracking-[0.18em] !opacity-100"
          >
            FLASH DAYS &amp; WORKSHOPS
          </Button>
        </div>
        <a href="#locais" aria-label="Ver locais" className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[#9be5ff] z-10"><ArrowDown className="h-5 w-5 animate-bounce" strokeWidth={1} /></a>
      </section>

      <section id="locais" className="border-y border-border px-6 py-24 md:px-12 md:py-36 bg-black">
        <div className="mx-auto max-w-6xl">
          <p className="section-index">01 / Locais</p>
          <h2 data-anim="section-title" className="mb-20 text-center text-xl font-semibold uppercase tracking-[0.34em] text-white md:text-3xl">Onde me encontrar</h2>
          <div className="grid gap-px bg-border md:grid-cols-3">
            <article data-anim="location" className="bg-black px-5 py-9 md:px-8">
              <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white">
                <span className="text-[#9be5ff] text-base leading-none">◊</span> PALHOÇA (BASE / ESTÚDIO)
              </h3>
              <p className="mt-5 text-xs text-[#A1A1AA] tracking-wider uppercase leading-7">
                — ATELIÊ PRIVADO<br />— ATENDIMENTO COM HORA MARCADA<br />— SESSÕES EXCLUSIVAS
              </p>
            </article>
            <article data-anim="location" className="bg-black px-5 py-9 md:px-8">
              <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white">
                <span className="text-[#9be5ff] text-base leading-none">◊</span> FLORIANÓPOLIS &amp; SÃO JOSÉ
              </h3>
              <p className="mt-5 text-xs text-[#A1A1AA] tracking-wider uppercase leading-7">
                — ATENDIMENTO A DOMICÍLIO (VIP)<br />— GUEST SPOTS &amp; ESTÚDIOS PARCEIROS<br />— CONSULTE DISPONIBILIDADE
              </p>
            </article>
            <article data-anim="location" className="bg-black px-5 py-9 md:px-8">
              <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white">
                <span className="text-[#9be5ff] text-base leading-none">◊</span> GRANDE FLORIANÓPOLIS
              </h3>
              <p className="mt-5 text-xs text-[#A1A1AA] tracking-wider uppercase leading-7">
                — ATENDIMENTO ITINERANTE<br />— EVENTOS &amp; FLASH DAYS REGIONAIS<br />— SANTA CATARINA
              </p>
            </article>
          </div>
          <div className="mt-16 text-center">
            <Button
              type="button"
              onClick={() => openBooking("studio")}
              variant="editorialGhost"
              className="h-12 px-9 text-[11px] font-medium uppercase tracking-[0.18em]"
            >
              SOLICITAR ORÇAMENTO
            </Button>
          </div>
        </div>
      </section>

      <section id="portfolio" className="py-24 md:py-36 bg-background">
        <div className="mb-16 px-6 text-center md:px-12">
          <p className="section-index">02 / Trabalhos selecionados</p>
          <h2 data-anim="section-title" className="text-xl font-semibold uppercase tracking-[0.34em] text-white md:text-3xl">
            | Portfólio |
          </h2>
        </div>
        
        {/* Continuous TiagoDot-style portfolio grid */}
        <div className="grid grid-cols-2 gap-[2px] bg-border md:grid-cols-3 max-w-7xl mx-auto px-1 sm:px-4">
          {displayedItems.map((item, index) => (
            <a
              key={item.id + index}
              href={item.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-anim="tile"
              className="group relative aspect-[4/5] overflow-hidden bg-[#121214] block"
              aria-label={`${item.caption} — Ver no Instagram`}
            >
              <img
                src={item.imageUrl}
                alt={item.caption}
                loading="lazy"
                width={800}
                height={1000}
                className="h-full w-full object-cover grayscale contrast-125 brightness-95 transition-all duration-500 ease-out group-hover:scale-105 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
              />

              {/* Instagram Media Indicator Badges */}
              {item.type === "video" ? (
                <div
                  className="absolute top-3 right-3 z-10 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  aria-label="Vídeo do Instagram"
                >
                  {/* Instagram-style Video Play Icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-md"
                  >
                    <path d="M5.5 3.5A1.5 1.5 0 0 0 3 4.8v14.4a1.5 1.5 0 0 0 2.5 1.3l13.5-7.2a1.5 1.5 0 0 0 0-2.6L5.5 3.5z" />
                  </svg>
                </div>
              ) : (
                <div
                  className="absolute top-3 right-3 z-10 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  aria-label="Carrossel do Instagram"
                >
                  {/* Instagram-style Carousel / Multiple items Icon (overlapping cards) */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-md"
                  >
                    {/* Back card */}
                    <path d="M7 4h10a2 2 0 0 1 2 2v10" stroke="currentColor" fill="none" opacity="0.8" />
                    {/* Front card */}
                    <rect x="3" y="7" width="13" height="13" rx="2" stroke="currentColor" fill="none" />
                  </svg>
                </div>
              )}

              {/* Subtle hover overlay & reveal */}
              <div className="pointer-events-none absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-between p-4 sm:p-5">
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#9be5ff]">
                    0{index + 1} / Karlos.Art
                  </span>
                </div>
                
                <div className="flex flex-col items-center justify-center gap-2 text-center my-auto">
                  <div className="h-9 w-9 rounded-full border border-[#9be5ff]/50 bg-black/70 flex items-center justify-center text-[#9be5ff] transition-transform duration-300 group-hover:scale-110">
                    <Instagram className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9be5ff]">
                    Ver no Instagram
                  </span>
                  <p className="text-[11px] text-neutral-300 line-clamp-1 max-w-[200px] hidden sm:block">
                    {item.caption}
                  </p>
                </div>

                <div className="text-left">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-400">
                    @karlitostattooo
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button
            type="button"
            onClick={handleLoadMore}
            variant="link"
            className="rounded-none px-0 text-[11px] font-medium uppercase tracking-[0.18em] text-[#F5F5F7] no-underline transition-colors duration-250 hover:text-[#9be5ff] hover:no-underline cursor-pointer"
          >
            {visibleCount < portfolioItems.length ? (
              <>CARREGAR MAIS <span aria-hidden="true">＋</span></>
            ) : (
              <>VER FEED COMPLETO NO INSTAGRAM <span aria-hidden="true">↗</span></>
            )}
          </Button>
        </div>
      </section>

      <footer className="flex flex-col gap-5 border-t border-border px-6 py-10 text-[9px] uppercase tracking-[0.22em] text-muted-foreground md:flex-row md:items-center md:justify-between md:px-12"><span>© 2026 KARLOS ART TATTOO. ALL RIGHTS RESERVED.</span><span>Arte permanente / Feita à mão</span></footer>

      <BookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        defaultService={bookingService}
      />
    </main>
  );
}
