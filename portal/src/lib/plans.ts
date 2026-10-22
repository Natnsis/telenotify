// Mirrors src/billing/plans.ts in the API; keep both in sync.
export const PLANS = [
  { id: 'FREE', name: 'Free', priceEtb: 0, monthlyQuota: 1_000, blurb: 'Try Telenotify with real customers.' },
  { id: 'STARTER', name: 'Starter', priceEtb: 990, monthlyQuota: 25_000, blurb: 'Small businesses moving off SMS.' },
  { id: 'GROWTH', name: 'Growth', priceEtb: 2_990, monthlyQuota: 100_000, blurb: 'Growing apps with daily notifications.' },
  { id: 'BUSINESS', name: 'Business', priceEtb: null, monthlyQuota: null, blurb: 'Custom volume, support and terms.' },
] as const;

export type PlanInfo = (typeof PLANS)[number];

// Cheapest plan whose quota covers the monthly volume.
export function planFor(volume: number): PlanInfo {
  return PLANS.find((p) => p.monthlyQuota === null || volume <= p.monthlyQuota)!;
}

/** Typical bulk SMS price in Ethiopia: AfroMessage charges ETB 0.19838 per 1-part SMS (checked 2026-10-22). */
export const SMS_PRICE_ETB = 0.2;
