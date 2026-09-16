# Conventions

## Code Style
- **TypeScript**: Strict typing is expected.
- **Formatting**: Handled by Prettier (configured in `.prettierrc` / `eslint.config.js`).
- **Linting**: ESLint 9 is configured with React and TypeScript recommended rules.

## React & Components
- Functional components with Hooks.
- `shadcn/ui` pattern: UI components are placed in `src/components/ui/` and use Radix UI + Tailwind merge.
- Use `lucide-react` for icons.

## CSS and Styling
- Tailwind utility classes are preferred over custom CSS where possible.
- Design choices emphasize dark mode aesthetics (`bg-background text-foreground` using a dark theme).
- Custom animations use GSAP targeting `data-anim` attributes on HTML elements.

## Routing
- TanStack Router file-based routing conventions are used. Route files are placed in `src/routes/` and export a `Route` object created by `createFileRoute`.
