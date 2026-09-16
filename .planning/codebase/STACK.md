# Tech Stack

## Core
- **Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack React framework)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/) with [@lovable.dev/vite-tanstack-config] for predefined config

## Styling & Animations
- **CSS Framework**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) (Primitives for components like Dialog, Accordion, Checkbox, etc.)
- **Animations**: [GSAP](https://gsap.com/) (GreenSock Animation Platform) and GSAP ScrollTrigger for scroll-based animations
- **Smooth Scrolling**: [Lenis](https://lenis.studiofreight.com/)

## Routing & State
- **Router**: [@tanstack/react-router]
- **State/Data Fetching**: [@tanstack/react-query]

## Forms & Validation
- **Form Library**: [React Hook Form](https://react-hook-form.com/)
- **Validation**: [Zod](https://zod.dev/)

## Utilities
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Formatting**: [date-fns](https://date-fns.org/)
- **Class Merging**: `clsx` and `tailwind-merge` (standard shadcn/ui pattern)

## Deployment target
- **Target**: Vercel (via Nitro preset configuration in `vite.config.ts`)
