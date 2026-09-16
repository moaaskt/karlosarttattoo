# Architecture

## High-Level Architecture
This is a Single Page Application (with SSR capabilities via TanStack Start) serving as a landing page and portfolio for a tattoo artist.

- **Entry Point**: The server entry point is managed by TanStack Start via `src/server.ts` and `src/start.ts`.
- **Routing**: File-based routing is handled by `@tanstack/react-router`. The main entry is `src/routes/__root.tsx` and the primary landing page is `src/routes/index.tsx`.
- **Styling**: Tailwind CSS v4 is used globally, with custom editorial design choices (e.g., uppercase fonts, wide letter spacing, grayscale-to-color hover effects).

## Key Patterns
- **Component-Based UI**: UI elements are split into reusable components inside `src/components/`, heavily relying on Radix UI primitives.
- **Editorial Animations**: GSAP is heavily used in a custom hook `useEditorialAnimations` inside the main page to create complex, scroll-linked animations for section reveals, parallax effects on portfolio images, and text tracking expansion.
- **Smooth Scrolling**: Lenis is initialized via a custom hook `useSmoothScroll` to provide a premium, smooth scrolling experience.
