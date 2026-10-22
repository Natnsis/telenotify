// Mirrors src/billing/plans.ts in the API; keep both in sync.
export const PLANS = [
  { id: 'FREE', name: 'Free', priceEtb: 0, monthlyQuota: 2_000, blurb: 'Free forever, for small shops and trying it out.' },
  { id: 'STARTER', name: 'Starter', priceEtb: 199, monthlyQuota: 20_000, blurb: 'Less than the price of 1,000 SMS.' },
  { id: 'GROWTH', name: 'Growth', priceEtb: 599, monthlyQuota: 100_000, blurb: 'Apps with daily notifications and OTPs.' },
  { id: 'BUSINESS', name: 'Business', priceEtb: null, monthlyQuota: null, blurb: 'Banks, wallets and gateways: volume pricing, SLA.' },
] as const;

export type PlanInfo = (typeof PLANS)[number];

// Cheapest plan whose quota covers the monthly volume.
export function planFor(volume: number): PlanInfo {
  return PLANS.find((p) => p.monthlyQuota === null || volume <= p.monthlyQuota)!;
}

/** Typical bulk SMS price in Ethiopia: AfroMessage charges ETB 0.19838 per 1-part SMS (checked 2026-10-22). */
export const SMS_PRICE_ETB = 0.2;
