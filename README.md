# Ink Edit

Create an ultra-minimalist, high-end editorial website for a tattoo artist inspired by luxury editorial layouts.

### Visual Identity & Palette

- Background: Pitch black (#070707)

- Accent Color: Soft Baby Blue / Ice Blue (#9be5ff)

- Typography: Cold white (#F5F5F7) for headings, muted gray (#8A8A93) for details

- Font Family: Clean, high-fashion geometric sans-serif (uppercase with wide tracking)

- Edges: Completely sharp corners (rounded-none / border-radius: 0px)

### Structure & Layout

1. Header (Fixed/Absolute Overlay):

- Left: Minimalist geometric tattoo artist logo

- Right: Minimal outline icons for Instagram and Email (no text)

2. Hero Section:

- Full viewport height (100vh), zero margin

- Background: Full-width looping video player (with poster fallback and black/neutral overlay)

- Center: 3 stacked primary action buttons with sharp borders:

  * "AGENDAMENTO ESTÚDIO"

  * "ATENDIMENTO A DOMICÍLIO"

  * "FLASH DAYS & WORKSHOPS"

- Button styling: Black background with 1.5px solid baby blue border, bold uppercase text with tracking-wider. On hover: invert to baby blue fill with black text.

3. "Where to Find Me" Section:

- Dark background (#070707) with large breathing room (py-24)

- Centered section title: "ONDE ME ENCONTRAR" in uppercase tracking-widest

- Responsive studio locations grid (columns on desktop, vertical stack on mobile)

- Locations formatted with geometric diamond bullets (◊ Cidade/Estúdio) and clean dash subtexts

- Centered CTA button at the bottom: "SOLICITAR ORÇAMENTO"

4. "Explore" / Portfolio Grid:

- Centered divider title: "| PORTFÓLIO |"

- High-density editorial image grid (3 columns on desktop, 1-2 on mobile) with 2px gap

- Black-and-white and high-contrast tattoo photos/videos

- Clean "CARREGAR MAIS" text button at bottom

Do not use rounded card styles, soft drop shadows, or standard commercial templates. Keep it raw, sharp, dark, and editorial.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
