import type { MessageTemplate } from "./types";

/**
 * Variáveis suportadas para interpolação nos templates de mensageria.
 */
export interface TemplateVariableDefinition {
  key: string;
  label: string;
  description: string;
  example: string;
}

export const AVAILABLE_VARIABLES: TemplateVariableDefinition[] = [
  {
    key: "nome",
    label: "Nome do Cliente",
    description: "Nome do cliente",
    example: "Mariana Silva",
  },
  {
    key: "primeiro_nome",
    label: "Primeiro Nome",
    description: "Primeiro nome extraído do cliente",
    example: "Mariana",
  },
  {
    key: "telefone",
    label: "Telefone",
    description: "Número de telefone sanitizado",
    example: "(48) 99123-4567",
  },
  {
    key: "email",
    label: "E-mail",
    description: "Endereço de e-mail do lead",
    example: "mariana@exemplo.com",
  },
  {
    key: "ideia",
    label: "Ideia da Tattoo",
    description: "Descrição do projeto enviada no orçamento",
    example: "Rosa em fine line no antebraço",
  },
  {
    key: "local",
    label: "Local / Atendimento",
    description: "Estúdio Privado em Palhoça ou VIP Floripa/SJ",
    example: "Estúdio Privado (Palhoça)",
  },
  {
    key: "estilo",
    label: "Estilo",
    description: "Estilo desejado da tatuagem",
    example: "Fine Line",
  },
  {
    key: "data_agendamento",
    label: "Data Agendada",
    description: "Data da sessão de tatuagem",
    example: "15/10/2026",
  },
  {
    key: "horario_agendamento",
    label: "Horário Agendado",
    description: "Horário de início da sessão",
    example: "14:00",
  },
  {
    key: "valor_total",
    label: "Valor Total",
    description: "Valor total do orçamento",
    example: "R$ 800,00",
  },
  {
    key: "valor_sinal",
    label: "Valor do Sinal",
    description: "Valor do sinal para confirmação",
    example: "R$ 200,00",
  },
  {
    key: "chave_pix",
    label: "Chave PIX",
    description: "Chave PIX do ateliê para pagamento",
    example: "contato@karlosarttattoo.com.br",
  },
];

/**
 * Extrai todas as variáveis no formato {{variavel}} encontradas no texto.
 */
export function extractVariablesFromTemplate(content: string): string[] {
  if (!content) return [];
  const regex = /{{\s*([\w.]+)\s*}}/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      matches.add(match[1].toLowerCase());
    }
  }

  return Array.from(matches);
}

/**
 * Interpola dinamicamente tags {{variavel}} com os valores fornecidos no objeto data.
 */
export function interpolateTemplate(
  template: string,
  data: Record<string, any> = {},
): string {
  if (!template) return "";

  // Normaliza chaves de data para lookup case-insensitive
  const normalizedData: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      normalizedData[k.toLowerCase()] = v;
    }
  }

  // Se 'primeiro_nome' não foi passado explicitamente, deduz de 'nome' ou 'client_name'
  if (!normalizedData.primeiro_nome) {
    const fullName =
      normalizedData.nome || normalizedData.client_name || normalizedData.lead_name || "";
    if (typeof fullName === "string" && fullName.trim()) {
      normalizedData.primeiro_nome = fullName.trim().split(/\s+/)[0];
    }
  }

  // Regex para substituição de {{ variavel }}
  return template.replace(/{{\s*([\w.]+)\s*}}/gi, (fullMatch, rawKey) => {
    const key = rawKey.toLowerCase();

    // Sinônimos comuns de mapeamento
    if (key === "nome" && normalizedData.client_name) return String(normalizedData.client_name);
    if (key === "telefone" && normalizedData.client_phone) return String(normalizedData.client_phone);
    if (key === "ideia" && normalizedData.idea) return String(normalizedData.idea);
    if (key === "local" && normalizedData.location) return String(normalizedData.location);

    if (key in normalizedData) {
      return String(normalizedData[key]);
    }

    // Se a variável não estiver presente, substitui por vazio de forma limpa
    return "";
  });
}

/**
 * Catálogo de templates padrão de fábrica calibrados para o ateliê Karlos Art Tattoo.
 */
export const DEFAULT_TEMPLATES: Array<
  Omit<MessageTemplate, "id" | "created_at" | "updated_at">
> = [
  {
    name: "Boas-vindas & Recebimento de Ideia",
    category: "welcome",
    channel: "whatsapp",
    body: `Olá {{primeiro_nome}}, tudo bem? Aqui é o Karlos do ateliê Karlos Art Tattoo! 🖤\n\nRecebi sua solicitação de orçamento para: "{{ideia}}".\n\nAdorei a proposta! Para que eu possa preparar seu orçamento sob medida e verificar datas na agenda, você já tem alguma referência visual ou tamanho aproximado em mente?`,
    variables: ["primeiro_nome", "ideia"],
    active: true,
  },
  {
    name: "Cobrança de Sinal / Reserva de Data",
    category: "deposit_request",
    channel: "whatsapp",
    body: `Olá {{primeiro_nome}}! ✨\n\nPara garantir e travar seu horário no dia {{data_agendamento}} às {{horario_agendamento}}, solicitamos um sinal de reserva de {{valor_sinal}}.\n\n🔑 Chave PIX: {{chave_pix}}\n\nAssim que fizer o pagamento, envie o comprovante por aqui para confirmarmos sua sessão na agenda!`,
    variables: ["primeiro_nome", "data_agendamento", "horario_agendamento", "valor_sinal", "chave_pix"],
    active: true,
  },
  {
    name: "Confirmação de Sessão Agendada (WhatsApp)",
    category: "booking_confirm",
    channel: "whatsapp",
    body: `Sessão Confirmada, {{primeiro_nome}}! 🗓️✨\n\nSua sessão está agendada com sucesso:\n📅 Data: {{data_agendamento}}\n⏰ Horário: {{horario_agendamento}}\n📍 Local: {{local}}\n\nRecomendações para o dia:\n- Durma bem e alimente-se antes de vir;\n- Evite consumir bebidas alcoólicas na véspera;\n- Use roupas confortáveis para a área da tattoo.\n\nQualquer dúvida estou à disposição! Até lá! 🎨`,
    variables: ["primeiro_nome", "data_agendamento", "horario_agendamento", "local"],
    active: true,
  },
  {
    name: "Lembrete 24h Antes da Sessão",
    category: "reminder",
    channel: "whatsapp",
    body: `Oi {{primeiro_nome}}, passando para lembrar que amanhã teremos nossa sessão de tatuagem às {{horario_agendamento}}! ⚡\n\n📍 Local: {{local}}\n\nLembre-se de se hidratar e vir bem alimentado(a). Nos vemos amanhã no ateliê!`,
    variables: ["primeiro_nome", "horario_agendamento", "local"],
    active: true,
  },
  {
    name: "Guia de Cuidados Pós-Tattoo (WhatsApp)",
    category: "post_care",
    channel: "whatsapp",
    body: `Obrigado pela confiança na sessão de hoje, {{primeiro_nome}}! Sua tattoo ficou incrível! 🔥\n\nPara que a cicatrização seja perfeita, siga estes cuidados essenciais:\n1. Mantenha o plástico filme apenas pelas primeiras 2 a 3 horas;\n2. Lave delicadamente com água morna/fria e sabonete neutro (sem esfregar);\n3. Aplique uma camada fina da pomada cicatrizante 3x ao dia;\n4. Não arranque casquinhas nem exponha ao sol, piscina ou mar por 20 dias.\n\nQualquer dúvida durante a cicatrização, é só me mandar mensagem aqui! 🖤`,
    variables: ["primeiro_nome"],
    active: true,
  },
  {
    name: "Confirmação de Sessão Agendada (E-mail)",
    category: "booking_confirm",
    channel: "email",
    subject: "Sua Sessão de Tatuagem está Confirmada — Karlos Art Tattoo",
    body: `<div style="font-family: sans-serif; background-color: #222831; color: #eeeeee; padding: 24px; border-radius: 8px;">
  <h2 style="color: #76abae; margin-top: 0;">Sessão Confirmada!</h2>
  <p>Olá, <strong>{{nome}}</strong>,</p>
  <p>Sua sessão de tatuagem autoral no ateliê Karlos Art Tattoo foi confirmada com sucesso.</p>
  <div style="background-color: #31363f; padding: 16px; border-left: 4px solid #76abae; margin: 20px 0;">
    <p style="margin: 4px 0;"><strong>Data:</strong> {{data_agendamento}}</p>
    <p style="margin: 4px 0;"><strong>Horário:</strong> {{horario_agendamento}}</p>
    <p style="margin: 4px 0;"><strong>Local:</strong> {{local}}</p>
    <p style="margin: 4px 0;"><strong>Projeto:</strong> {{ideia}}</p>
  </div>
  <h3>Orientações importantes:</h3>
  <ul>
    <li>Venha bem descansado(a) e alimentado(a).</li>
    <li>Use roupas confortáveis que facilitem o acesso ao local da tatuagem.</li>
    <li>Evite álcool e analgésicos com efeito anticoagulante nas 24h anteriores.</li>
  </ul>
  <p style="margin-top: 24px; font-size: 13px; color: #9da5b4;">Ateliê Karlos Art Tattoo — Palhoça & Grande Florianópolis</p>
</div>`,
    variables: ["nome", "data_agendamento", "horario_agendamento", "local", "ideia"],
    active: true,
  },
  {
    name: "Campanha Flash Day & Novas Vagas",
    category: "promo",
    channel: "whatsapp",
    body: `Fala {{primeiro_nome}}, tudo certo? Karlos por aqui! 🎨⚡\n\nPassando para avisar que abri novas datas na agenda deste mês para projetos autorais em fine line e flash tattoos exclusivas.\n\nSe você estava pensando em tirar aquela ideia do papel ou fazer um novo projeto, me responde aqui para vermos os horários livres antes que esgotem! 🖤`,
    variables: ["primeiro_nome"],
    active: true,
  },
];
