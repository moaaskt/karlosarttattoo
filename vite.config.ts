// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
    routeRules: {
      "/sitemap.xml": {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      },
    },
  },
  vite: {
    plugins: [
      {
        name: "leads-api-dev-server",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url || (!req.url.startsWith("/api/leads") && req.url !== "/api/leads")) {
              return next();
            }
            try {
              const { handleLeadsRequest } = await server.ssrLoadModule("/src/server/api/leads.ts");
              const protocol = req.headers["x-forwarded-proto"] || "http";
              const host = req.headers.host || "localhost:3000";
              const fullUrl = `${protocol}://${host}${req.url}`;

              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(Buffer.from(chunk));
              }
              const body =
                chunks.length > 0 && req.method !== "GET" && req.method !== "HEAD"
                  ? Buffer.concat(chunks)
                  : undefined;

              const webRequest = new Request(fullUrl, {
                method: req.method,
                headers: req.headers as HeadersInit,
                body,
              });

              const webResponse: Response = await handleLeadsRequest(webRequest);
              res.statusCode = webResponse.status;
              webResponse.headers.forEach((val, key) => {
                res.setHeader(key, val);
              });
              const responseText = await webResponse.text();
              res.end(responseText);
            } catch (err) {
              console.error("[Leads Dev API Error]", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal Server Error in Leads Dev API" }));
            }
          });
        },
      },
    ],
  },
});
