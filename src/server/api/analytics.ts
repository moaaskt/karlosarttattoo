import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";
import { hasGoogleCredentials } from "../lib/google-auth";
import { getOrSetAnalyticsCache, invalidateAnalyticsCache } from "../lib/analytics-cache";
import { generateMockAnalyticsData, type AnalyticsDataPayload } from "../lib/analytics-mock";
import { fetchGa4Analytics, fetchGa4RealtimeUsers } from "../lib/google-analytics";
import { fetchGscAnalytics } from "../lib/google-search-console";
import { DateTime } from "luxon";

export async function handleAnalyticsRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (method !== "GET") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const rawPeriod = url.searchParams.get("period");
    const period: "7d" | "30d" | "90d" =
      rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "7d";

    const force = url.searchParams.get("force") === "true";
    if (force) {
      invalidateAnalyticsCache(period);
    }

    const payload = await getOrSetAnalyticsCache(period, async (): Promise<AnalyticsDataPayload> => {
      // 1. Se não houver credenciais configuradas, usa o gerador de simulação
      if (!hasGoogleCredentials()) {
        return generateMockAnalyticsData(period);
      }

      // 2. Com credenciais configuradas, busca os dados das APIs reais
      try {
        const [ga4Result, gscResult, realtimeUsers] = await Promise.all([
          fetchGa4Analytics(period),
          fetchGscAnalytics(period),
          fetchGa4RealtimeUsers(),
        ]);

        // Se ambas as consultas falharem totalmente, fallback seguro para o mock com aviso
        if (!ga4Result && !gscResult) {
          console.warn("[Analytics API] Consultas do Google falharam. Retornando contingência.");
          return generateMockAnalyticsData(period);
        }

        const now = DateTime.now().setZone("America/Sao_Paulo");

        // Merge da timeline: adiciona cliques do Search Console aos dias do GA4
        const timeline = (ga4Result?.timeline || []).map((item) => ({
          ...item,
          clicks: gscResult?.dateClicks?.[item.date] ?? 0,
        }));

        const combinedPayload: AnalyticsDataPayload = {
          success: true,
          is_mock: false,
          cached_at: now.toISO() || new Date().toISOString(),
          period,
          summary: {
            total_sessions: ga4Result?.summary?.total_sessions ?? 0,
            active_users: ga4Result?.summary?.active_users ?? 0,
            page_views: ga4Result?.summary?.page_views ?? 0,
            engagement_rate: ga4Result?.summary?.engagement_rate ?? "0.0%",
            avg_engagement_time: ga4Result?.summary?.avg_engagement_time ?? "0m 00s",
            gsc_clicks: gscResult?.summary?.gsc_clicks ?? 0,
            gsc_impressions: gscResult?.summary?.gsc_impressions ?? 0,
            gsc_ctr: gscResult?.summary?.gsc_ctr ?? "0.0%",
            gsc_avg_position: gscResult?.summary?.gsc_avg_position ?? "0.0",
            realtime_active_users: realtimeUsers,
          },
          timeline,
          geo_cities: ga4Result?.geo_cities || [],
          traffic_sources: ga4Result?.traffic_sources || [],
          search_queries: gscResult?.search_queries || [],
          top_pages: ga4Result?.top_pages || [],
        };

        return combinedPayload;
      } catch (fetchErr) {
        console.error("[Analytics API] Erro ao integrar relatórios do Google:", fetchErr);
        return generateMockAnalyticsData(period);
      }
    });

    return jsonResponse(payload);
  } catch (err: any) {
    console.error("[Analytics API] Erro interno no processamento:", err);
    return jsonResponse({ error: "Erro interno ao processar dados analíticos" }, 500);
  }
}
