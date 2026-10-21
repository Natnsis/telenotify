// localStorage key for an invitation opened before signing in.
export const PENDING_INVITE_KEY = 'tn_pending_invite';

export function takePendingInvite(): string | null {
  try {
    return localStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}
