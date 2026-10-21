import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { PLANS } from '@/lib/plans';
import { Reveal, SectionHeading } from './reveal';

const common = ['Free sandbox with test customers', 'Your own branded bot', 'Phone verification without SMS', 'Signed webhooks with retries'];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-surface/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple monthly plans. <span className="text-gradient">A fraction of SMS.</span>
            </>
          }
          body="Pay only for live messages we deliver and phone numbers we verify. Undeliverable messages are free, and the sandbox is always free."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => {
            const featured = plan.id === 'STARTER';
            const perMessage = plan.priceEtb && plan.monthlyQuota ? plan.priceEtb / plan.monthlyQuota : null;
            return (
              <Reveal
                key={plan.id}
                delay={0.08 * i}
                className={cn(
                  'relative flex flex-col rounded-3xl border bg-surface p-6 shadow-soft',
                  featured ? 'border-brand shadow-lift ring-4 ring-brand/10' : 'border-line',
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-brand to-accent px-3 py-1 text-xs font-semibold text-white">Most popular</span>
                )}
                <p className="font-display text-xl font-bold text-ink">{plan.name}</p>
                <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
                <p className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink">
                  {plan.priceEtb === null ? 'Custom' : plan.priceEtb === 0 ? '0' : plan.priceEtb.toLocaleString('en-US')}
                  {plan.priceEtb !== null && <span className="text-base font-semibold text-muted"> ETB / month</span>}
                </p>
                <p className="mt-2 text-sm text-ink">
                  {plan.monthlyQuota === null ? 'Unlimited messages & verifications' : `${plan.monthlyQuota.toLocaleString('en-US')} messages & verifications / month`}
                </p>
                {perMessage !== null && (
                  <p className="mt-1 text-xs text-muted">
                    ≈ {perMessage.toFixed(3)} ETB each, vs ~0.25 ETB per SMS
                  </p>
                )}
                <ul className="mt-6 space-y-2.5 text-sm text-muted">
                  {common.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <Link
                    href="/signup"
                    className={cn(
                      'block rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5',
                      featured ? 'bg-ink text-page shadow-lift' : 'border border-line text-ink hover:bg-subtle',
                    )}
                  >
                    {plan.priceEtb === null ? 'Talk to us' : 'Start free'}
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
