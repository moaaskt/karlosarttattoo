import { JWT } from "google-auth-library";

export interface GoogleCredentialsConfig {
  clientEmail: string;
  privateKey: string;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
}

/**
 * Normaliza e sanitiza a chave privada RSA PEM proveniente do .env ou arquivo.
 */
export function normalizePrivateKey(key: string): string {
  if (!key) return "";
  let cleanKey = key.trim();
  // Se estiver entre aspas, remove
  if (
    (cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
    (cleanKey.startsWith("'") && cleanKey.endsWith("'"))
  ) {
    cleanKey = cleanKey.slice(1, -1);
  }
  // Substitui sequências literais de \n por quebras de linha reais
  cleanKey = cleanKey.replace(/\\n/g, "\n");
  return cleanKey;
}

/**
 * Lê e valida as credenciais das variáveis de ambiente.
 */
export function getGoogleCredentialsConfig(): GoogleCredentialsConfig | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_PRIVATE_KEY?.trim();
  const ga4PropertyId = process.env.GA4_PROPERTY_ID?.trim();
  const gscSiteUrl = process.env.GSC_SITE_URL?.trim();

  if (!clientEmail || !rawKey) {
    return null;
  }

  const privateKey = normalizePrivateKey(rawKey);
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
    ga4PropertyId,
    gscSiteUrl,
  };
}

/**
 * Retorna true se houver credenciais completas configuradas no ambiente.
 */
export function hasGoogleCredentials(): boolean {
  return getGoogleCredentialsConfig() !== null;
}

/**
 * Gera token de acesso OAuth2 Bearer utilizando a Service Account.
 */
export async function getGoogleAccessToken(scopes: string[]): Promise<string | null> {
  const config = getGoogleCredentialsConfig();
  if (!config) return null;

  try {
    const jwtClient = new JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes,
    });

    const tokens = await jwtClient.authorize();
    return tokens.access_token || null;
  } catch (err) {
    console.error("[GoogleAuth] Erro ao autorizar Service Account:", err);
    return null;
  }
}
