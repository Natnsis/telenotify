// Example responses for the API reference (the OpenAPI spec has no response schemas).

const message = {
  id: '6f1c2a4e-…',
  to: 'customer_123',
  direction: 'OUTBOUND',
  status: 'QUEUED',
  priority: 'normal',
  template: null,
  locale: null,
  reason: null,
  text: 'Your order #55 is out for delivery 🚚',
  buttons: [[{ text: 'Track order', url: 'https://shop.example.com/orders/55' }]],
  idempotencyKey: 'order-55-shipped',
  error: null,
  attempts: 0,
  fallback: null,
  sentAt: null,
  createdAt: '2026-10-23T09:30:00.000Z',
};

const customer = {
  externalId: 'customer_123',
  phone: '251911223344',
  locale: 'am',
  reachable: true,
  telegramLinked: true,
  telegramUsername: 'abebe',
  linkedAt: '2026-10-20T08:12:00.000Z',
  blocked: false,
  testCustomer: false,
  createdAt: '2026-10-20T08:10:00.000Z',
};

const verification = {
  id: '9a7d…',
  status: 'PENDING',
  reason: null,
  externalId: 'customer_123',
  phone: null,
  url: 'https://t.me/your_bot?start=v_…',
  expiresAt: '2026-10-23T09:40:00.000Z',
  verifiedAt: null,
  createdAt: '2026-10-23T09:30:00.000Z',
};

export const EXAMPLE_RESPONSES: Record<string, { status: number; body: unknown }> = {
  'post /v1/customers/link': { status: 201, body: { token: 'b6Yq…', url: 'https://t.me/your_bot?start=b6Yq…', expiresAt: '2026-10-30T09:30:00.000Z' } },
  'put /v1/customers/{externalId}': { status: 200, body: customer },
  'get /v1/customers/{externalId}': { status: 200, body: customer },
  'post /v1/messages': { status: 202, body: message },
  'get /v1/messages': { status: 200, body: { data: [{ ...message, status: 'SENT', sentAt: '2026-10-23T09:30:01.000Z' }], nextCursor: null } },
  'get /v1/messages/{id}': { status: 200, body: { ...message, status: 'SENT', attempts: 1, sentAt: '2026-10-23T09:30:01.000Z' } },
  'get /v1/templates': {
    status: 200,
    body: [
      {
        id: 'c41e…',
        key: 'payment_received',
        name: 'Payment received',
        description: null,
        variants: { en: 'Payment of {{amount}} ETB received from {{payer}}.', am: 'ከ{{payer}} {{amount}} ብር ተቀብለዋል።' },
        defaultLocale: 'en',
        placeholders: ['amount', 'payer'],
        createdAt: '2026-10-22T10:00:00.000Z',
        updatedAt: '2026-10-22T10:00:00.000Z',
      },
    ],
  },
  'post /v1/verifications': { status: 201, body: verification },
  'get /v1/verifications/{id}': { status: 200, body: { ...verification, status: 'VERIFIED', phone: '251911223344', url: null, verifiedAt: '2026-10-23T09:31:10.000Z' } },
};
