export type MessageStatus = 'QUEUED' | 'SENT' | 'UNDELIVERABLE' | 'FAILED' | 'RECEIVED';

/** Why a message couldn't be delivered on Telegram. Use your fallback channel for these. */
export type UndeliverableReason = 'not_linked' | 'blocked' | 'chat_gone';
export type FailureReason = 'telegram_unavailable' | 'telegram_rejected';

export interface InlineButton {
  text: string;
  url: string;
}

export interface Message {
  id: string;
  /** Your id for the customer. */
  to: string;
  direction: 'OUTBOUND' | 'INBOUND';
  status: MessageStatus;
  priority: 'normal' | 'high';
  reason: UndeliverableReason | FailureReason | null;
  text: string;
  buttons: InlineButton[][] | null;
  idempotencyKey: string | null;
  error: string | null;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
}

export interface SendMessageParams {
  /** Your id for the customer (externalId). */
  to: string;
  text: string;
  /** Rows of URL buttons shown under the message. */
  buttons?: InlineButton[][];
  /** Reusing a key returns the original message instead of sending twice. Also makes retries safe. */
  idempotencyKey?: string;
  /** "high" for OTPs and payment/transaction alerts: sent ahead of normal messages. */
  priority?: 'normal' | 'high';
}

export interface Customer {
  externalId: string;
  phone: string | null;
  /** true when a message sent now would go out on Telegram. */
  reachable: boolean;
  telegramLinked: boolean;
  telegramUsername: string | null;
  linkedAt: string | null;
  blocked: boolean;
  testCustomer: boolean;
  createdAt: string;
}

export interface ConnectLink {
  token: string;
  /** t.me link to show as a button or QR code. */
  url: string;
  expiresAt: string;
}

export type VerificationStatus = 'PENDING' | 'AWAITING_CONTACT' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

export interface Verification {
  id: string;
  status: VerificationStatus;
  reason: 'phone_mismatch' | null;
  externalId: string | null;
  /** The verified number (normalized, e.g. 251911223344) once VERIFIED. */
  phone: string | null;
  /** t.me link while the verification is open. */
  url: string | null;
  expiresAt: string;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CreateVerificationParams {
  /** Your id for this person; once verified they're also linked for notifications. */
  externalId?: string;
  /** Fail unless the shared Telegram number matches this one. */
  phone?: string;
  /** 1-60, default 10. */
  expiresInMinutes?: number;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export type EventType =
  | 'message.sent'
  | 'message.undeliverable'
  | 'message.failed'
  | 'message.received'
  | 'customer.linked'
  | 'customer.blocked'
  | 'verification.completed'
  | 'verification.failed'
  | 'webhook.test';

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  event: EventType;
  environment: 'sandbox' | 'live';
  createdAt: string;
  data: T;
}
