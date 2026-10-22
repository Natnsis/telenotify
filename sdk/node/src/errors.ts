export class TelenotifyError extends Error {
  readonly name = 'TelenotifyError';

  constructor(
    message: string,
    /** HTTP status, or 0 for network errors and timeouts. */
    readonly status: number,
    /** Machine-readable code when the API provides one, e.g. "quota_exceeded". */
    readonly code?: string,
  ) {
    super(message);
  }

  get isRateLimited() {
    return this.status === 429;
  }

  get isQuotaExceeded() {
    return this.status === 402 || this.code === 'quota_exceeded';
  }
}

export class WebhookSignatureError extends Error {
  readonly name = 'WebhookSignatureError';
}
