# KARLOS ART TATTOO — Ateliê Autoral & Fine Line

> **PROJETO COMERCIAL EXCLUSIVO**  
> Desenvolvido sob medida para **KARLOS ART TATTOO**. Todos os direitos reservados. É estritamente proibida a cópia, reprodução, distribuição ou redistribuição total ou parcial deste código-fonte, layout ou identidade visual sem autorização prévia por escrito.

---

## ✦ Visão Geral

Plataforma digital de alta performance com direção de arte **editorial, minimalista e dark mode** voltada para o posicionamento de marca do tatuador autoral **Karlos**. 

O projeto combina uma estética afiada (*sharp edges*, tipografia técnica, contraste profundo e acentos em Baby Blue `#9be5ff`) com uma experiência de agendamento ágil e fluida.

---

## ✦ Principais Recursos & Funcionalidades

- **Direção de Arte Editorial & Sharp Aesthetics:** Design 100% autoral com cantos retos (`rounded-none`), microinterações fluidas e alto contraste fotográfico.
- **Hero Cinematográfico:** Vídeo de background responsivo em loop com atmosfera imersiva e tipografia refinada.
- **Portfólio Conectado ao Instagram:** 
  - Grid simétrico e responsivo (3 colunas no desktop, 2 colunas no mobile).
  - Ícones indicadores nativos do Instagram (carrossel / multi-fotos e vídeos).
  - Links diretos para as publicações originais de cada trabalho.
  - Filtros CSS de alto contraste e transição para garantir uniformidade estética entre diferentes fotos.
- **Modal de Agendamento Ultra-Editorial:**
  - Seleção ágil de modalidade (Estúdio Privado em Palhoça, Atendimento VIP a Domicílio na Grande Florianópolis ou Outras Cidades/Guest).
  - Submissão assíncrona (AJAX/Fetch) integrada diretamente ao **Formspree** com tratamento completo de erros e tela de confirmação personalizada.
- **Performance & SEO:** Estrutura otimizada para carregamento ultra-rápido, tipografia via Google Fonts (*Manrope*) e meta tags completas para compartilhamento social.

---

## ✦ Stack Tecnológica

- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Routing & Framework:** [TanStack Router](https://tanstack.com/router) + [TanStack Start](https://tanstack.com/start)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animações:** [GSAP](https://greensock.com/gsap/) + [Lenis Smooth Scroll](https://lenis.darkroom.engineering/)
- **Ícones:** [Lucide Icons](https://lucide.dev/)
- **Backend / Integrações:** Endpoint assíncrono Formspree

---

## ✦ Estrutura do Projeto

```text
├── public/
│   ├── hero-bg.mp4           # Vídeo de fundo da seção Hero
│   └── portfolio/            # Fotografias e mídias selecionadas do portfólio
├── src/
│   ├── assets/               # Imagens e detalhes fotográficos de suporte
│   ├── components/
│   │   ├── booking-modal.tsx # Modal de agendamento ultra-editorial
│   │   └── ui/               # Primitivas de interface
│   ├── data/
│   │   └── portfolio.ts      # Dados das obras, tipos e links do Instagram
│   ├── routes/
│   │   ├── __root.tsx        # Estrutura base, fontes e SEO
│   │   └── index.tsx         # Página inicial e seções editoriais
│   └── styles.css            # Design tokens e variáveis de cor
└── package.json
```

---

## ✦ Direitos Autorais & Licenciamento

© 2026 **Karlos Art Tattoo**. Desenvolvido com exclusividade comercial.  
Todos os direitos de design, código e identidade visual são de propriedade autoral exclusiva. Proibido qualquer tipo de clonagem, templateização ou uso não autorizado.
