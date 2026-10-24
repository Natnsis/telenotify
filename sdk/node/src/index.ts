export { Telenotify } from './client';
export type { TelenotifyOptions } from './client';
export { TelenotifyError, WebhookSignatureError } from './errors';
export { constructEvent, verifySignature } from './webhooks';
export { verifyToken } from './verification-token';
export * from './types';

import { verifyToken } from './verification-token';
import { constructEvent, verifySignature } from './webhooks';

/** Convenience namespace: `webhooks.constructEvent(raw, header, secret)`. */
export const webhooks = { constructEvent, verifySignature };

/** Convenience namespace: `verifications.verifyToken(token, signingSecret)`. */
export const verifications = { verifyToken };
