export { Telenotify } from './client';
export type { TelenotifyOptions } from './client';
export { TelenotifyError, WebhookSignatureError } from './errors';
export { constructEvent, verifySignature } from './webhooks';
export * from './types';

import { constructEvent, verifySignature } from './webhooks';

/** Convenience namespace: `webhooks.constructEvent(raw, header, secret)`. */
export const webhooks = { constructEvent, verifySignature };
