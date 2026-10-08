import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleLeadsRequest } from "./server/api/leads";
import { handleBookingsRequest } from "./server/api/bookings";
import { handleTimeBlocksRequest } from "./server/api/time-blocks";
import { handleSettingsRequest } from "./server/api/settings";
import { handleAvailabilityRulesRequest } from "./server/api/availability-rules";
import { handleAnalyticsRequest } from "./server/api/analytics";
import { handleMessagesRequest } from "./server/api/messages";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Rotas de API Backend
      if (url.pathname === "/api/leads" || url.pathname.startsWith("/api/leads/")) {
        return await handleLeadsRequest(request);
      }
      if (url.pathname === "/api/bookings" || url.pathname.startsWith("/api/bookings/")) {
        return await handleBookingsRequest(request);
      }
      if (url.pathname === "/api/time-blocks" || url.pathname.startsWith("/api/time-blocks/")) {
        return await handleTimeBlocksRequest(request);
      }
      if (url.pathname === "/api/settings" || url.pathname.startsWith("/api/settings/")) {
        return await handleSettingsRequest(request);
      }
      if (
        url.pathname === "/api/availability-rules" ||
        url.pathname.startsWith("/api/availability-rules/")
      ) {
        return await handleAvailabilityRulesRequest(request);
      }
      if (url.pathname === "/api/analytics" || url.pathname.startsWith("/api/analytics/")) {
        return await handleAnalyticsRequest(request);
      }
      if (url.pathname === "/api/messages" || url.pathname.startsWith("/api/messages/")) {
        return await handleMessagesRequest(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
