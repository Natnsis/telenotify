// Where to go after signing in. Only same-site paths are accepted, so a crafted
// ?next= link can't send someone to another website.
const KEY = 'tn_after_login';

export function safeNext(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  return path;
}

export function rememberNext(path: string | null) {
  try {
    if (path) sessionStorage.setItem(KEY, path);
  } catch {}
}

export function takeNext(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return safeNext(path);
  } catch {
    return null;
  }
}
