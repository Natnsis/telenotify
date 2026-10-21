// Built-in sandbox customers. Sending to these never touches Telegram;
// each produces a fixed outcome so integrators can test their fallback code.
export const TEST_CUSTOMERS = {
  test_linked: { linked: true, blocked: false, outcome: 'sent' },
  test_not_linked: { linked: false, blocked: false, outcome: 'not_linked' },
  test_blocked: { linked: true, blocked: true, outcome: 'blocked' },
  test_chat_gone: { linked: true, blocked: false, outcome: 'chat_gone' },
  test_telegram_down: { linked: true, blocked: false, outcome: 'telegram_unavailable' },
} as const;

export type TestCustomerId = keyof typeof TEST_CUSTOMERS;

export const TEST_CHAT_ID = 'sandbox-test';

export function isTestCustomer(externalId: string): externalId is TestCustomerId {
  return Object.prototype.hasOwnProperty.call(TEST_CUSTOMERS, externalId);
}
