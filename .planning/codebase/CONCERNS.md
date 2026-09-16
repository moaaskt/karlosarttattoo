# Concerns

## Technical Debt & Risks
- **Hardcoded Data**: Portfolio data is hardcoded in `src/data/portfolio.ts`. Adding new tattoos requires a code change and deployment. Consider moving to a headless CMS (like Sanity, Contentful) or fetching directly from the Instagram API.
- **Form Handling**: The booking form uses Formspree directly from the client. While functional, it exposes the form endpoint and relies entirely on client-side validation before hitting Formspree. If requirements grow, a custom backend route (using TanStack Start server functions) might be safer and more flexible.
- **GSAP Animations**: The `useEditorialAnimations` hook heavily uses `gsap.context` and queries DOM elements by `data-anim` attributes. This breaks the React declarative model slightly, and care must be taken to ensure elements are present when the GSAP context is created.
- **Missing Tests**: No automated test suite is present. A single broken tailwind class or React upgrade could break the layout silently.
- **Missing Error Boundaries**: Ensure TanStack Router has proper error boundaries set up for production robustness.
