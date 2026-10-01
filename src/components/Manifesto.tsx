export function Manifesto() {
  return (
    <section
      id="manifesto"
      className="relative border-y border-white/10 bg-[#070707] px-6 py-24 md:px-12 md:py-36"
    >
      <div className="mx-auto max-w-5xl">
        {/* Section index */}
        <p className="section-index">00 / Manifesto</p>

        {/* Logo placement */}
        <div className="mb-10 flex justify-center">
          <img
            src="/logo-karlostattoo.png"
            alt="Karlos Art Tattoo"
            className="h-14 w-auto object-contain opacity-90 md:h-16"
          />
        </div>

        {/* Headline central — D-03 */}
        <h2
          data-anim="section-title"
          className="mx-auto mb-20 max-w-2xl text-center text-lg font-semibold uppercase leading-relaxed tracking-[0.22em] text-white md:text-2xl md:leading-relaxed"
        >
          Sua tatuagem é mais do que um desenho.
          <br />
          <span className="text-[#9be5ff]">
            É a expressão tangível do que existe dentro de você.
          </span>
        </h2>

        {/* 3 Pilares — D-04 */}
        <div className="grid gap-px bg-white/10 md:grid-cols-3">
          {/* Pilar 01 */}
          <article
            data-anim="manifesto-pillar"
            className="bg-[#070707] px-6 py-10 md:px-8"
          >
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#9be5ff]">
              01 // Conexão &amp; Essência
            </p>
            <p className="text-xs leading-7 tracking-wider text-[#A1A1AA] uppercase">
              — Criação autoral do zero
              <br />
              — Respeito à individualidade
              <br />— Cada traço nasce da sua história
            </p>
          </article>

          {/* Pilar 02 */}
          <article
            data-anim="manifesto-pillar"
            className="bg-[#070707] px-6 py-10 md:px-8"
          >
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#9be5ff]">
              02 // Futurismo &amp; Anatomia
            </p>
            <p className="text-xs leading-7 tracking-wider text-[#A1A1AA] uppercase">
              — Fine line &amp; geometria sagrada
              <br />
              — Microrrealismo de precisão
              <br />— Projeção anatômica milimétrica
            </p>
          </article>

          {/* Pilar 03 */}
          <article
            data-anim="manifesto-pillar"
            className="bg-[#070707] px-6 py-10 md:px-8"
          >
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#9be5ff]">
              03 // Ateliê &amp; Privacidade
            </p>
            <p className="text-xs leading-7 tracking-wider text-[#A1A1AA] uppercase">
              — Sessões privativas na Palhoça
              <br />
              — VIP a domicílio em Floripa/São José
              <br />— Exclusividade total
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
