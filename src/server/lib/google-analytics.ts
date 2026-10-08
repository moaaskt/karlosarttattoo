import { getGoogleAccessToken, getGoogleCredentialsConfig } from "./google-auth";
import type {
  AnalyticsSummary,
  AnalyticsTimelineItem,
  AnalyticsCityItem,
  AnalyticsChannelItem,
  TopPageItem,
} from "./analytics-mock";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export interface Ga4ReportResult {
  summary: Partial<AnalyticsSummary>;
  timeline: AnalyticsTimelineItem[];
  geo_cities: AnalyticsCityItem[];
  traffic_sources: AnalyticsChannelItem[];
  top_pages: TopPageItem[];
}

/**
 * Executa uma requisição POST ao endpoint runReport da Google Analytics Data API v1beta.
 */
async function callGa4RunReport(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<any> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA4 API error [${response.status}]: ${errorText}`);
  }

  return await response.json();
}

/**
 * Consulta relatórios analíticos reais do Google Analytics 4.
 */
export async function fetchGa4Analytics(
  period: "7d" | "30d" | "90d" = "7d",
): Promise<Ga4ReportResult | null> {
  const config = getGoogleCredentialsConfig();
  if (!config || !config.ga4PropertyId) {
    return null;
  }

  const accessToken = await getGoogleAccessToken([GA4_SCOPE]);
  if (!accessToken) {
    console.error("[GA4] Não foi possível obter token de acesso para a Service Account");
    return null;
  }

  const daysAgo = period === "7d" ? "7daysAgo" : period === "30d" ? "30daysAgo" : "90daysAgo";
  const propertyId = config.ga4PropertyId;

  try {
    // 1. Relatório Geral e Linha do Tempo Diária
    const timelineReport = await callGa4RunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: daysAgo, endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "engagementRate" },
        { name: "userEngagementDuration" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
    });

    const timeline: AnalyticsTimelineItem[] = [];
    let totalSessions = 0;
    let totalUsers = 0;
    let totalPageViews = 0;
    let totalDurationSeconds = 0;
    let engagementRateSum = 0;
    let rowCount = 0;

    if (timelineReport.rows && Array.isArray(timelineReport.rows)) {
      for (const row of timelineReport.rows) {
        const rawDate = row.dimensionValues?.[0]?.value || "";
        // Formato rawDate costuma ser YYYYMMDD
        const formattedDate =
          rawDate.length === 8
            ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
            : rawDate;

        const sessions = Number(row.metricValues?.[0]?.value || 0);
        const users = Number(row.metricValues?.[1]?.value || 0);
        const pageViews = Number(row.metricValues?.[2]?.value || 0);
        const engRate = Number(row.metricValues?.[3]?.value || 0);
        const duration = Number(row.metricValues?.[4]?.value || 0);

        totalSessions += sessions;
        totalUsers += users;
        totalPageViews += pageViews;
        engagementRateSum += engRate;
        totalDurationSeconds += duration;
        rowCount++;

        timeline.push({
          date: formattedDate,
          sessions,
          users,
          clicks: 0, // Será preenchido com dados do Search Console
        });
      }
    }

    const avgEngagementRate =
      rowCount > 0 ? `${((engagementRateSum / rowCount) * 100).toFixed(1)}%` : "0.0%";
    const avgSeconds = totalSessions > 0 ? Math.round(totalDurationSeconds / totalSessions) : 0;
    const mins = Math.floor(avgSeconds / 60);
    const secs = avgSeconds % 60;
    const formattedEngagementTime = `${mins}m ${secs.toString().padStart(2, "0")}s`;

    // 2. Cidades de Origem
    const citiesReport = await callGa4RunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: daysAgo, endDate: "today" }],
      dimensions: [{ name: "city" }],
      metrics: [{ name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    });

    const geo_cities: AnalyticsCityItem[] = [];
    let citiesTotalUsers = 0;
    if (citiesReport.rows && Array.isArray(citiesReport.rows)) {
      const parsedRows = citiesReport.rows
        .map((r: any) => ({
          city: r.dimensionValues?.[0]?.value || "Desconhecido",
          users: Number(r.metricValues?.[0]?.value || 0),
        }))
        .filter((r: any) => r.city !== "(not set)");

      citiesTotalUsers = parsedRows.reduce((acc: number, r: any) => acc + r.users, 0);

      for (const item of parsedRows.slice(0, 5)) {
        const pct =
          citiesTotalUsers > 0 ? ((item.users / citiesTotalUsers) * 100).toFixed(1) + "%" : "0%";
        geo_cities.push({
          city: item.city,
          users: item.users,
          percentage: pct,
        });
      }
    }

    // 3. Canais de Aquisição de Tráfego
    const channelsReport = await callGa4RunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: daysAgo, endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      limit: 5,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    const traffic_sources: AnalyticsChannelItem[] = [];
    if (channelsReport.rows && Array.isArray(channelsReport.rows)) {
      const parsedChannels = channelsReport.rows.map((r: any) => ({
        channel: r.dimensionValues?.[0]?.value || "Outros",
        sessions: Number(r.metricValues?.[0]?.value || 0),
      }));

      const totalChannelSessions = parsedChannels.reduce((acc: number, r: any) => acc + r.sessions, 0);

      for (const ch of parsedChannels) {
        const pct =
          totalChannelSessions > 0
            ? ((ch.sessions / totalChannelSessions) * 100).toFixed(1) + "%"
            : "0%";
        traffic_sources.push({
          channel: ch.channel,
          sessions: ch.sessions,
          percentage: pct,
        });
      }
    }

    // 4. Top Páginas
    const pagesReport = await callGa4RunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: daysAgo, endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });

    const top_pages: TopPageItem[] = [];
    if (pagesReport.rows && Array.isArray(pagesReport.rows)) {
      const parsedPages = pagesReport.rows.map((r: any) => ({
        path: r.dimensionValues?.[0]?.value || "/",
        page_views: Number(r.metricValues?.[0]?.value || 0),
      }));

      const totalViews = parsedPages.reduce((acc: number, r: any) => acc + r.page_views, 0);

      for (const p of parsedPages.slice(0, 5)) {
        const pct = totalViews > 0 ? ((p.page_views / totalViews) * 100).toFixed(1) + "%" : "0%";
        top_pages.push({
          path: p.path,
          page_views: p.page_views,
          percentage: pct,
        });
      }
    }

    return {
      summary: {
        total_sessions: totalSessions,
        active_users: totalUsers,
        page_views: totalPageViews,
        engagement_rate: avgEngagementRate,
        avg_engagement_time: formattedEngagementTime,
      },
      timeline,
      geo_cities,
      traffic_sources,
      top_pages,
    };
  } catch (err) {
    console.error("[GA4] Erro durante consulta runReport:", err);
    return null;
  }
}
