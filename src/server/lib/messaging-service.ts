import nodemailer from "nodemailer";
import type {
  MessagingConfig,
  SendMessageResult,
  TestConnectionResult,
} from "../../lib/messaging/types";

import { sanitizeWhatsAppNumber } from "../../lib/messaging/engine";
export { sanitizeWhatsAppNumber };

/**
 * Recupera configurações padrão de mensageria das variáveis de ambiente.
 */
export function getMessagingConfigFromEnv(): MessagingConfig {
  return {
    evolutionUrl: process.env.EVOLUTION_API_URL?.trim() || "",
    evolutionApiKey: process.env.EVOLUTION_API_KEY?.trim() || "",
    instanceName: process.env.EVOLUTION_INSTANCE_NAME?.trim() || "",
    smtpHost: process.env.SMTP_HOST?.trim() || "",
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    smtpUser: process.env.SMTP_USER?.trim() || "",
    smtpPass: process.env.SMTP_PASS?.trim() || "",
    smtpFrom:
      process.env.SMTP_FROM?.trim() || "Karlos Art Tattoo <contato@karlosarttattoo.com.br>",
  };
}

/**
 * Envia mensagem de texto via WhatsApp utilizando a Evolution API v2.
 */
export async function sendWhatsAppMessage(params: {
  recipient: string;
  message: string;
  config?: MessagingConfig;
}): Promise<SendMessageResult> {
  const envConfig = getMessagingConfigFromEnv();
  const evolutionUrl = (params.config?.evolutionUrl || envConfig.evolutionUrl || "").replace(
    /\/+$/,
    "",
  );
  const evolutionApiKey = params.config?.evolutionApiKey || envConfig.evolutionApiKey || "";
  const instanceName = params.config?.instanceName || envConfig.instanceName || "";

  const sanitized = sanitizeWhatsAppNumber(params.recipient);

  if (!sanitized || sanitized.length < 10) {
    return {
      success: false,
      channel: "whatsapp",
      recipient: params.recipient,
      error: `Número de telefone inválido para WhatsApp: '${params.recipient}'`,
    };
  }

  if (!evolutionUrl || !evolutionApiKey || !instanceName) {
    return {
      success: false,
      channel: "whatsapp",
      recipient: sanitized,
      error:
        "Credenciais da Evolution API v2 não configuradas (verifique URL, API Key e Nome da Instância).",
    };
  }

  try {
    const endpoint = `${evolutionUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: evolutionApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: sanitized,
        text: params.message,
      }),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        responseData?.message ||
        responseData?.error ||
        `Falha ao enviar mensagem via Evolution API (Status ${response.status})`;
      return {
        success: false,
        channel: "whatsapp",
        recipient: sanitized,
        error: Array.isArray(errorMsg) ? errorMsg.join(", ") : String(errorMsg),
      };
    }

    const messageId =
      responseData?.key?.id || responseData?.messageId || responseData?.id || undefined;

    return {
      success: true,
      channel: "whatsapp",
      recipient: sanitized,
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: "whatsapp",
      recipient: sanitized,
      error: err.message || "Erro de conexão ao comunicar com a Evolution API",
    };
  }
}

/**
 * Envia e-mail formatado via transporte SMTP com Nodemailer.
 */
export async function sendEmailMessage(params: {
  recipient: string;
  subject: string;
  body: string;
  config?: MessagingConfig;
}): Promise<SendMessageResult> {
  const envConfig = getMessagingConfigFromEnv();
  const host = params.config?.smtpHost || envConfig.smtpHost || "";
  const port = params.config?.smtpPort || envConfig.smtpPort || 587;
  const user = params.config?.smtpUser || envConfig.smtpUser || "";
  const pass = params.config?.smtpPass || envConfig.smtpPass || "";
  const from = params.config?.smtpFrom || envConfig.smtpFrom || "contato@karlosarttattoo.com.br";

  const recipient = params.recipient?.trim();
  if (!recipient || !recipient.includes("@")) {
    return {
      success: false,
      channel: "email",
      recipient: params.recipient,
      error: `Endereço de e-mail inválido: '${params.recipient}'`,
    };
  }

  if (!host || !user) {
    return {
      success: false,
      channel: "email",
      recipient,
      error: "Credenciais de SMTP não configuradas (verifique Host e Usuário SMTP).",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    // Remove tags HTML básicas para o corpo de texto plano
    const plainText = params.body.replace(/<[^>]*>?/gm, "").trim();

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: params.subject || "Karlos Art Tattoo",
      text: plainText,
      html: params.body,
    });

    return {
      success: true,
      channel: "email",
      recipient,
      messageId: info.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: "email",
      recipient,
      error: err.message || "Erro ao enviar e-mail via servidor SMTP",
    };
  }
}

/**
 * Valida a conexão com a Evolution API v2 consultando o estado da instância.
 */
export async function testEvolutionConnection(
  config?: MessagingConfig,
): Promise<TestConnectionResult> {
  const envConfig = getMessagingConfigFromEnv();
  const evolutionUrl = (config?.evolutionUrl || envConfig.evolutionUrl || "").replace(/\/+$/, "");
  const evolutionApiKey = config?.evolutionApiKey || envConfig.evolutionApiKey || "";
  const instanceName = config?.instanceName || envConfig.instanceName || "";

  if (!evolutionUrl || !evolutionApiKey || !instanceName) {
    return {
      success: false,
      channel: "whatsapp",
      message: "Credenciais da Evolution API incompletas.",
    };
  }

  try {
    const endpoint = `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: evolutionApiKey,
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        channel: "whatsapp",
        message: `Falha na API: ${data?.message || `Status HTTP ${response.status}`}`,
        details: data,
      };
    }

    const state = data?.instance?.state || data?.state || "desconhecido";
    const isConnected = state === "open";

    return {
      success: isConnected,
      channel: "whatsapp",
      message: isConnected
        ? `Instância '${instanceName}' conectada e pronta para disparos!`
        : `Instância '${instanceName}' encontrada, mas estado atual é: '${state}'.`,
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: "whatsapp",
      message: `Erro de conexão com o servidor da Evolution API: ${err.message}`,
    };
  }
}

/**
 * Valida a conexão com o servidor SMTP através da verificação de autenticação do Nodemailer.
 */
export async function testSmtpConnection(
  config?: MessagingConfig,
): Promise<TestConnectionResult> {
  const envConfig = getMessagingConfigFromEnv();
  const host = config?.smtpHost || envConfig.smtpHost || "";
  const port = config?.smtpPort || envConfig.smtpPort || 587;
  const user = config?.smtpUser || envConfig.smtpUser || "";
  const pass = config?.smtpPass || envConfig.smtpPass || "";

  if (!host || !user) {
    return {
      success: false,
      channel: "email",
      message: "Configurações de Host e Usuário SMTP são obrigatórias.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.verify();

    return {
      success: true,
      channel: "email",
      message: `Conexão SMTP com '${host}:${port}' estabelecida com sucesso!`,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: "email",
      message: `Falha na autenticação SMTP: ${err.message}`,
    };
  }
}
