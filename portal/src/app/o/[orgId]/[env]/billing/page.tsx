'use client';

import { Check, Gauge } from 'lucide-react';
import { motion } from 'motion/react';
import useSWR from 'swr';
import { Badge, Card, cn, PageHeader, Skeleton } from '@/components/ui';
import { fetcher } from '@/lib/api';
import { useOrgParams } from '@/lib/hooks';
import type { BillingOverview } from '@/lib/types';

const n = (v: number) => v.toLocaleString('en-US');
const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL;

export default function BillingPage() {
  const { orgId } = useOrgParams();
  const { data } = useSWR<BillingOverview>(`/portal/orgs/${orgId}/billing`, fetcher);

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { usage } = data;
  const pct = usage.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;
  const resets = new Date(usage.end).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <>
      <PageHeader title="Plan & usage" description="Your plan covers live messages we deliver and completed phone verifications. The sandbox is always free." />

      <Card icon={Gauge} title="This month" description={`Live usage resets on ${resets}.`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="font-display text-3xl font-bold tabular-nums text-ink">
            {n(usage.used)}
            <span className="text-lg font-medium text-muted"> / {usage.quota === null ? 'unlimited' : n(usage.quota)}</span>
          </p>
          <p className="text-sm text-muted">
            {n(usage.messages)} messages · {n(usage.verifications)} verifications
          </p>
        </div>
        {usage.quota !== null && (
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-subtle">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-brand to-accent')}
            />
          </div>
        )}
        {usage.quota !== null && pct >= 100 && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">Quota reached: live sends are paused until you upgrade or the month resets.</p>}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((plan) => {
          const current = plan.id === data.plan;
          return (
            <div key={plan.id} className={cn('relative flex flex-col rounded-2xl border bg-surface p-5 shadow-soft', current ? 'border-brand ring-2 ring-brand/20' : 'border-line')}>
              {current && (
                <span className="absolute -top-2.5 left-5">
                  <Badge tone="blue">Current plan</Badge>
                </span>
              )}
              <p className="font-display text-lg font-bold text-ink">{plan.name}</p>
              <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
              <p className="mt-4 font-display text-2xl font-bold text-ink">
                {plan.priceEtb === null ? 'Custom' : plan.priceEtb === 0 ? 'Free' : `${n(plan.priceEtb)} ETB`}
                {plan.priceEtb ? <span className="text-sm font-medium text-muted"> / month</span> : null}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <Check className="size-4 text-emerald-500" />
                {plan.monthlyQuota === null ? 'Unlimited volume' : `${n(plan.monthlyQuota)} live messages & verifications`}
              </p>
              <div className="mt-auto pt-5">
                {!current && SALES_EMAIL && (
                  <a
                    href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Telenotify: switch to ${plan.name}`)}`}
                    className="block rounded-xl border border-line px-3 py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-subtle"
                  >
                    {plan.priceEtb === null ? 'Contact sales' : 'Request this plan'}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">Online payment is coming soon. For now, request a plan and we&apos;ll switch it for you.</p>
    </>
  );
}
