# Directory Structure

```
/
├── public/                 # Static assets (images, videos, logo)
├── src/                    # Source code
│   ├── assets/             # Local images and assets
│   ├── components/         # Reusable React components
│   │   ├── ui/             # Generic UI components (Radix/shadcn style)
│   │   └── booking-modal.tsx # Specific domain components
│   ├── data/               # Hardcoded data files (e.g., portfolio.ts)
│   ├── hooks/              # Custom React hooks (e.g., use-smooth-scroll.ts)
│   ├── lib/                # Utility functions (e.g., utils for tailwind merge)
│   ├── routes/             # TanStack Router file-based routes
│   │   ├── __root.tsx      # Root route layout
│   │   └── index.tsx       # Main landing page
│   ├── server.ts           # TanStack Start SSR entry point
│   ├── start.ts            # Client entry point configuration
│   └── styles.css          # Global CSS and Tailwind directives
├── package.json
├── vite.config.ts
├── tsconfig.json
└── components.json         # UI component configuration (shadcn/ui style)
```
