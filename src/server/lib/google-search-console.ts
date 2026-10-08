import { DateTime } from "luxon";
import { getGoogleAccessToken, getGoogleCredentialsConfig } from "./google-auth";
import type { AnalyticsSummary, SearchQueryItem } from "./analytics-mock";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export interface GscReportResult {
  summary: Pick<AnalyticsSummary, "gsc_clicks" | "gsc_impressions" | "gsc_ctr" | "gsc_avg_position">;
  dateClicks: Record<string, number>;
  search_queries: SearchQueryItem[];
}

/**
 * Consulta relatórios analíticos reais do Google Search Console v3.
 */
export async function fetchGscAnalytics(
  period: "7d" | "30d" | "90d" = "7d",
): Promise<GscReportResult | null> {
  const config = getGoogleCredentialsConfig();
  if (!config || !config.gscSiteUrl) {
    return null;
  }

  const accessToken = await getGoogleAccessToken([GSC_SCOPE]);
  if (!accessToken) {
    console.error("[GSC] Não foi possível obter token de acesso para a Service Account");
    return null;
  }

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const now = DateTime.now().setZone("America/Sao_Paulo");
  const startDate = now.minus({ days }).toFormat("yyyy-MM-dd");
  const endDate = now.toFormat("yyyy-MM-dd");

  const siteUrlEncoded = encodeURIComponent(config.gscSiteUrl);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrlEncoded}/searchAnalytics/query`;

  try {
    // 1. Relatório por Termo de Busca (Query)
    const queriesResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 25,
      }),
    });

    if (!queriesResponse.ok) {
      const errText = await queriesResponse.text();
      throw new Error(`GSC API queries error [${queriesResponse.status}]: ${errText}`);
    }

    const queriesData = await queriesResponse.json();

    const search_queries: SearchQueryItem[] = [];
    let totalClicks = 0;
    let totalImpressions = 0;
    let weightedPositionSum = 0;

    if (queriesData.rows && Array.isArray(queriesData.rows)) {
      for (const row of queriesData.rows) {
        const query = row.keys?.[0] || "";
        const clicks = Number(row.clicks || 0);
        const impressions = Number(row.impressions || 0);
        const ctr = `${((Number(row.ctr || 0)) * 100).toFixed(1)}%`;
        const position = Number((row.position || 0).toFixed(1));

        totalClicks += clicks;
        totalImpressions += impressions;
        weightedPositionSum += position * impressions;

        search_queries.push({
          query,
          clicks,
          impressions,
          ctr,
          position,
        });
      }
    }

    // 2. Relatório por Data (para preencher a timeline diária)
    const datesResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["date"],
      }),
    });

    const dateClicks: Record<string, number> = {};
    if (datesResponse.ok) {
      const datesData = await datesResponse.json();
      if (datesData.rows && Array.isArray(datesData.rows)) {
        for (const row of datesData.rows) {
          const d = row.keys?.[0];
          if (d) {
            dateClicks[d] = Number(row.clicks || 0);
          }
        }
      }
    }

    const avgCtr =
      totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(1)}%` : "0.0%";
    const avgPosition =
      totalImpressions > 0
        ? (weightedPositionSum / totalImpressions).toFixed(1)
        : search_queries.length > 0
        ? (search_queries.reduce((acc, q) => acc + q.position, 0) / search_queries.length).toFixed(1)
        : "0.0";

    return {
      summary: {
        gsc_clicks: totalClicks,
        gsc_impressions: totalImpressions,
        gsc_ctr: avgCtr,
        gsc_avg_position: avgPosition,
      },
      dateClicks,
      search_queries,
    };
  } catch (err) {
    console.error("[GSC] Erro durante consulta Search Analytics:", err);
    return null;
  }
}
