export const MESSAGES_QUEUE = 'messages';

export interface DeliverJob {
  messageId: string;
  // Rate-limit bucket: the live environment's own bot, or "sandbox" for the shared bot.
  botKey?: string;
}

// BullMQ priorities: lower runs first.
export const JOB_PRIORITY = { HIGH: 1, NORMAL: 10 } as const;
