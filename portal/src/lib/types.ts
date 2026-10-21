export interface Me {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
}

export interface OrgSummary {
  id: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
}

export interface Org extends OrgSummary {
  liveBotConnected: boolean;
  liveBotUsername: string | null;
}

export type EnvName = 'sandbox' | 'live';

export interface EnvironmentInfo {
  type: EnvName;
  keyPrefix: string;
  botConnected: boolean;
  botUsername: string | null;
  eventWebhookUrl: string | null;
  eventSigningSecret: string;
  usage: { messagesToday: number; linkedCustomers: number; dailyMessageLimit?: number; linkedCustomerLimit?: number };
  testCustomers: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  key?: string;
}

export type MessageStatus = 'QUEUED' | 'SENT' | 'UNDELIVERABLE' | 'FAILED' | 'RECEIVED';

export interface Message {
  id: string;
  to: string;
  direction: 'OUTBOUND' | 'INBOUND';
  status: MessageStatus;
  reason: string | null;
  text: string;
  error: string | null;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
}

export interface Customer {
  externalId: string;
  phone: string | null;
  reachable: boolean;
  telegramLinked: boolean;
  telegramUsername: string | null;
  linkedAt: string | null;
  blocked: boolean;
  testCustomer: boolean;
  createdAt: string;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export interface LinkResult {
  token: string;
  url: string;
  expiresAt: string;
}
