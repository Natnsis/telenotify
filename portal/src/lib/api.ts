export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

// Calls the Telenotify API through the portal's /api proxy.
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw = (payload as { message?: string | string[] }).message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? `Request failed (${response.status})`);
    throw new ApiError(response.status, message, (payload as { code?: string }).code);
  }
  return payload as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
