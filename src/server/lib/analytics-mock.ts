import { DateTime } from "luxon";

export interface AnalyticsSummary {
  total_sessions: number;
  active_users: number;
  page_views: number;
  engagement_rate: string;
  avg_engagement_time: string;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: string;
  gsc_avg_position: string;
}

export interface AnalyticsTimelineItem {
  date: string;
  sessions: number;
  users: number;
  clicks: number;
}

export interface AnalyticsCityItem {
  city: string;
  users: number;
  percentage: string;
}

export interface AnalyticsChannelItem {
  channel: string;
  sessions: number;
  percentage: string;
}

export interface SearchQueryItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: string;
  position: number;
}

export interface TopPageItem {
  path: string;
  page_views: number;
  percentage: string;
}

export interface AnalyticsDataPayload {
  success: boolean;
  is_mock: boolean;
  cached_at: string;
  period: "7d" | "30d" | "90d";
  summary: AnalyticsSummary;
  timeline: AnalyticsTimelineItem[];
  geo_cities: AnalyticsCityItem[];
  traffic_sources: AnalyticsChannelItem[];
  search_queries: SearchQueryItem[];
  top_pages: TopPageItem[];
}

/**
 * Gera dados analíticos simulados ultra-realistas com foco local (Palhoça e Grande Florianópolis).
 */
export function generateMockAnalyticsData(
  period: "7d" | "30d" | "90d" = "7d",
  now?: string,
): AnalyticsDataPayload {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const refDate = now
    ? DateTime.fromISO(now, { zone: "America/Sao_Paulo" })
    : DateTime.now().setZone("America/Sao_Paulo");

  // Timeline
  const timeline: AnalyticsTimelineItem[] = [];
  let totalSessions = 0;
  let totalUsers = 0;
  let totalClicks = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = refDate.minus({ days: i });
    const isWeekend = d.weekday >= 6;
    // Finais de semana têm pico de busca e visitantes
    const baseSessions = isWeekend ? 65 : 42;
    const randS = Math.floor(baseSessions + ((d.day * 7) % 25));
    const randU = Math.floor(randS * 0.82);
    const randC = Math.max(1, Math.floor(randS * 0.18 + ((d.day * 3) % 8)));

    totalSessions += randS;
    totalUsers += randU;
    totalClicks += randC;

    timeline.push({
      date: d.toFormat("yyyy-MM-dd"),
      sessions: randS,
      users: randU,
      clicks: randC,
    });
  }

  const totalImpressions = Math.floor(totalClicks * 26.4);
  const ctrVal = ((totalClicks / Math.max(1, totalImpressions)) * 100).toFixed(2);

  // Cidades de Santa Catarina
  const geo_cities: AnalyticsCityItem[] = [
    {
      city: "Palhoça",
      users: Math.floor(totalUsers * 0.52),
      percentage: "52.0%",
    },
    {
      city: "Florianópolis",
      users: Math.floor(totalUsers * 0.31),
      percentage: "31.0%",
    },
    {
      city: "São José",
      users: Math.floor(totalUsers * 0.12),
      percentage: "12.0%",
    },
    {
      city: "Biguaçu",
      users: Math.floor(totalUsers * 0.05),
      percentage: "5.0%",
    },
  ];

  // Canais de tráfego
  const traffic_sources: AnalyticsChannelItem[] = [
    {
      channel: "Orgânico (Google)",
      sessions: Math.floor(totalSessions * 0.64),
      percentage: "64.0%",
    },
    {
      channel: "Direto (URL / WhatsApp)",
      sessions: Math.floor(totalSessions * 0.21),
      percentage: "21.0%",
    },
    {
      channel: "Redes Sociais (Instagram)",
      sessions: Math.floor(totalSessions * 0.15),
      percentage: "15.0%",
    },
  ];

  // Palavras-chave do Search Console
  const search_queries: SearchQueryItem[] = [
    {
      query: "karlitos tattoo",
      clicks: Math.floor(totalClicks * 0.38),
      impressions: Math.floor(totalImpressions * 0.22),
      ctr: "17.2%",
      position: 1.1,
    },
    {
      query: "tatuador palhoça",
      clicks: Math.floor(totalClicks * 0.28),
      impressions: Math.floor(totalImpressions * 0.34),
      ctr: "8.2%",
      position: 2.8,
    },
    {
      query: "estudio de tatuagem palhoca",
      clicks: Math.floor(totalClicks * 0.18),
      impressions: Math.floor(totalImpressions * 0.24),
      ctr: "7.5%",
      position: 3.4,
    },
    {
      query: "tatuagem autoral florianopolis",
      clicks: Math.floor(totalClicks * 0.10),
      impressions: Math.floor(totalImpressions * 0.12),
      ctr: "8.3%",
      position: 4.2,
    },
    {
      query: "blackwork tattoo palhoça",
      clicks: Math.floor(totalClicks * 0.06),
      impressions: Math.floor(totalImpressions * 0.08),
      ctr: "7.5%",
      position: 3.9,
    },
  ];

  // Top páginas
  const pageViews = Math.floor(totalSessions * 2.6);
  const top_pages: TopPageItem[] = [
    {
      path: "/",
      page_views: Math.floor(pageViews * 0.68),
      percentage: "68.0%",
    },
    {
      path: "/#galeria",
      page_views: Math.floor(pageViews * 0.22),
      percentage: "22.0%",
    },
    {
      path: "/#estilo",
      page_views: Math.floor(pageViews * 0.10),
      percentage: "10.0%",
    },
  ];

  return {
    success: true,
    is_mock: true,
    cached_at: DateTime.now().setZone("America/Sao_Paulo").toISO() || "",
    period,
    summary: {
      total_sessions: totalSessions,
      active_users: totalUsers,
      page_views: pageViews,
      engagement_rate: "67.8%",
      avg_engagement_time: "1m 48s",
      gsc_clicks: totalClicks,
      gsc_impressions: totalImpressions,
      gsc_ctr: `${ctrVal}%`,
      gsc_avg_position: "3.2",
    },
    timeline,
    geo_cities,
    traffic_sources,
    search_queries,
    top_pages,
  };
}
