/**
 * displayToCents: converte string monetária → centavos inteiros.
 * Regras de separador:
 *   - Se há vírgula: vírgula = decimal, pontos = milhar. "1.500,00" → 150000
 *   - Sem vírgula: ponto seguido de exatamente 3 dígitos no final = milhar ("1.500" → 150000);
 *     demais = decimal ("150.50" → 15050).
 * Rejeita: negativo, vazio, não numérico — lança Error.
 */
export function displayToCents(value: string): number {
  const raw = value.replace(/\s/g, "").replace(/^R\$\s?/, "");
  if (!raw) throw new Error(`Valor vazio: "${value}"`);

  let normalized: string;
  if (raw.includes(",")) {
    // vírgula = decimal, pontos = milhar
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // sem vírgula: ponto seguido de 3 dígitos no fim = milhar
    if (/\.\d{3}$/.test(raw)) {
      normalized = raw.replace(/\./g, ""); // remove ponto de milhar
    } else {
      normalized = raw; // ponto decimal
    }
  }

  const n = parseFloat(normalized);
  if (isNaN(n)) throw new Error(`Valor não numérico: "${value}"`);
  if (n < 0) throw new Error(`Valor negativo não permitido: "${value}"`);
  return Math.round(n * 100);
}

/** Centavos → "R$ X,XX" */
export function centsToDisplay(cents: number): string {
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Formata telefone para WhatsApp:
 * - Remove tudo que não é dígito.
 * - Remove 0 inicial se presente.
 * - Se tem 10 ou 11 dígitos, prefixar "55" (DDI Brasil).
 * - Se já começa com "55" e tem 12 ou 13 dígitos, não duplicar.
 * "(48) 99123-4567" → "5548991234567"
 */
export function formatWhatsAppPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("55") && digits.length >= 12) return digits; // já tem DDI
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

/** Serializa Date → ISO UTC estrito (...sss.Z) */
export function toUTCString(date: Date): string {
  return date.toISOString();
}

/** Mapa de error code → mensagem amigável pt-br */
export const ERROR_MESSAGES: Record<string, string> = {
  booking_conflict: "Conflito de horário com agendamento existente.",
  time_block_conflict: "Horário bloqueado (time block ativo).",
  invalid_transition: "Transição de status não permitida.",
  invalid_status: "Agendamento não pode ser remarcado no status atual.",
  deposit_required: "Sinal obrigatório para confirmar agendamento.",
  deposit_action_required: "Escolha o destino do sinal: reter ou devolver.",
  outside_hours: "Horário fora do expediente configurado.",
  past_date: "Data ou horário informado está no passado.",
  future_window: "Data ultrapassa o limite permitido de agendamento futuro.",
  not_found: "Agendamento não encontrado.",
  unknown: "Erro desconhecido. Tente novamente.",
};

export function getErrorMessage(code?: string): string {
  if (!code) return ERROR_MESSAGES.unknown;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown;
}

/** Fetch autenticado — único ponto de acesso à API da agenda */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const token =
    typeof window !== "undefined" ? (sessionStorage.getItem("admin_auth_token") ?? "") : "";
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    sessionStorage.removeItem("admin_auth_token");
    window.dispatchEvent(new CustomEvent("admin:logout"));
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: data as T };
}
