import { Plan } from '@prisma/client';

// Monthly plans, priced in ETB. The quota covers live messages we deliver plus
// completed phone verifications; the sandbox has its own separate limits.
export const PLANS: Record<Plan, { name: string; priceEtb: number | null; monthlyQuota: number | null; blurb: string }> = {
  FREE: { name: 'Free', priceEtb: 0, monthlyQuota: 1_000, blurb: 'For trying Telenotify with real customers.' },
  STARTER: { name: 'Starter', priceEtb: 990, monthlyQuota: 25_000, blurb: 'For small businesses moving off SMS.' },
  GROWTH: { name: 'Growth', priceEtb: 2_990, monthlyQuota: 100_000, blurb: 'For growing apps with daily notifications.' },
  BUSINESS: { name: 'Business', priceEtb: null, monthlyQuota: null, blurb: 'Custom volume, support and terms.' },
};

export function currentPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
