import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className={buttonVariants({ variant: "default" })}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-4 text-left">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro na aplicação</AlertTitle>
            <AlertDescription>
              {error.message || "Ocorreu um erro inesperado ao carregar a página."}
            </AlertDescription>
          </Alert>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Karlitos Tattoo | Tatuador em Palhoça — Fine Line & Autoral | Karlos Art Tattoo" },
      {
        name: "description",
        content:
          "Karlitos Tattoo (Karlos Art Tattoo) — tatuador em Palhoça, Florianópolis e Grande Florianópolis. Tatuagem autoral fine line, microrrealismo e geometria. Ateliê privado e atendimento VIP a domicílio.",
      },
      {
        name: "keywords",
        content:
          "karlitostattoo, karlitos tattoo, tatuador em palhoça, tatuagem autoral grande florianópolis, fine line florianópolis, tatuador florianópolis, karlos art tattoo",
      },
      { name: "author", content: "Karlos Art Tattoo" },
      {
        property: "og:title",
        content: "Karlitos Tattoo | Tatuador em Palhoça — Fine Line & Autoral",
      },
      {
        property: "og:description",
        content:
          "Tatuagem autoral fine line, microrrealismo e geometria. Ateliê privado em Palhoça e atendimento VIP a domicílio em Florianópolis e Grande Florianópolis.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://karlosarttattoo.vercel.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://karlosarttattoo.vercel.app/" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon-k.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TattooParlor",
              name: "Karlos Art Tattoo",
              alternateName: "Karlitos Tattoo",
              description:
                "Tatuagem autoral fine line, microrrealismo e geometria sagrada. Ateliê privado em Palhoça e atendimento VIP a domicílio em Florianópolis e Grande Florianópolis.",
              url: "https://karlosarttattoo.vercel.app/",
              image: "https://karlosarttattoo.vercel.app/logo-karlostattoo.png",
              telephone: "",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Palhoça",
                addressRegion: "SC",
                addressCountry: "BR",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: -27.6453,
                longitude: -48.6697,
              },
              areaServed: [
                { "@type": "City", name: "Palhoça" },
                { "@type": "City", name: "Florianópolis" },
                { "@type": "City", name: "São José" },
                { "@type": "AdministrativeArea", name: "Grande Florianópolis" },
              ],
              hasMap: "https://www.google.com/maps/place/Palho%C3%A7a,+SC/",
              sameAs: ["https://www.instagram.com/karlitostattooo/"],
              priceRange: "$$",
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "09:00",
                closes: "19:00",
              },
            }),
          }}
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-KV170XZ94S"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-KV170XZ94S');
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
