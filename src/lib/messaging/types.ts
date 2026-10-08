export type Channel = "whatsapp" | "email";

export type TemplateCategory =
  | "welcome"
  | "deposit_request"
  | "booking_confirm"
  | "reminder"
  | "post_care"
  | "promo";

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: Channel;
  subject?: string;
  body: string;
  variables: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessagingConfig {
  evolutionUrl?: string;
  evolutionApiKey?: string;
  instanceName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

export interface MessageLog {
  id: string;
  lead_id?: string;
  lead_name?: string;
  channel: Channel;
  recipient: string;
  status: "sent" | "failed";
  sent_at: string;
  error?: string;
  payload?: string;
}

export interface SendMessagePayload {
  lead_id?: string;
  lead_name?: string;
  channel: Channel;
  recipient: string;
  subject?: string;
  body: string;
  template_id?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: Channel;
  recipient: string;
  logId?: string;
}

export interface TestConnectionPayload {
  channel: Channel;
  config?: Partial<MessagingConfig>;
}

export interface TestConnectionResult {
  success: boolean;
  channel: Channel;
  message: string;
  details?: unknown;
}
