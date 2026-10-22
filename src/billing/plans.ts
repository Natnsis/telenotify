import { Plan } from '@prisma/client';

// Monthly plans, priced in ETB. The quota covers live messages we deliver plus
// completed phone verifications; the sandbox has its own separate limits.
export const PLANS: Record<Plan, { name: string; priceEtb: number | null; monthlyQuota: number | null; blurb: string }> = {
  // Every paid plan costs less than 1,000 SMS (~0.20 ETB each at AfroMessage, Oct 2026).
  FREE: { name: 'Free', priceEtb: 0, monthlyQuota: 2_000, blurb: 'Free forever, for small shops and trying it out.' },
  STARTER: { name: 'Starter', priceEtb: 199, monthlyQuota: 20_000, blurb: 'Less than the price of 1,000 SMS.' },
  GROWTH: { name: 'Growth', priceEtb: 599, monthlyQuota: 100_000, blurb: 'For apps with daily notifications and OTPs.' },
  BUSINESS: { name: 'Business', priceEtb: null, monthlyQuota: null, blurb: 'Banks, wallets and gateways: volume pricing, SLA.' },
};

export function currentPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
