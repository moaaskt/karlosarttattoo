import type { AnalyticsDataPayload } from "./analytics-mock";

interface CacheEntry {
  data: AnalyticsDataPayload;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightPromises = new Map<string, Promise<AnalyticsDataPayload>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos em milissegundos para manter dados recentes

/**
 * Obtém do cache em memória ou executa a função fetcher se expirado/ausente.
 * Possui deduplicação de promessas concorrentes (thundering herd protection).
 */
export async function getOrSetAnalyticsCache(
  period: "7d" | "30d" | "90d",
  fetcher: () => Promise<AnalyticsDataPayload>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<AnalyticsDataPayload> {
  const cacheKey = `analytics:${period}`;
  const now = Date.now();

  // 1. Verifica cache existente e não expirado
  const existing = memoryCache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  // 2. Se já existe uma requisição em andamento para este período, aguarda ela
  const existingPromise = inFlightPromises.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  // 3. Executa o fetcher com captura da promessa em andamento
  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      memoryCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + ttlMs,
      });
      return data;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Invalida o cache para um período específico ou todos os períodos.
 */
export function invalidateAnalyticsCache(period?: "7d" | "30d" | "90d"): void {
  if (period) {
    memoryCache.delete(`analytics:${period}`);
    inFlightPromises.delete(`analytics:${period}`);
  } else {
    memoryCache.clear();
    inFlightPromises.clear();
  }
}

/**
 * Retorna se existe cache válido atualmente para um período (útil para testes/diagnóstico).
 */
export function hasValidCache(period: "7d" | "30d" | "90d"): boolean {
  const cacheKey = `analytics:${period}`;
  const existing = memoryCache.get(cacheKey);
  return !!existing && existing.expiresAt > Date.now();
}
