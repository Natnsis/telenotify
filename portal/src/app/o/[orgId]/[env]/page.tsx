'use client';

import { ArrowRight, BarChart3, Bot, Check, MessageSquare, PiggyBank, Send, Users } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
import { OutcomesChart } from '@/components/outcomes-chart';
import { Badge, Card, CodeBlock, cn, Skeleton } from '@/components/ui';
import { API_BASE_URL, fetcher } from '@/lib/api';
import { envPath, useEnvironment, useOrg, useOrgParams } from '@/lib/hooks';
import type { Analytics, ApiKey } from '@/lib/types';

export default function GetStartedPage() {
  const { orgId, env } = useOrgParams();
  const { data: org } = useOrg();
  const { data: environment } = useEnvironment();
  const { data: keys } = useSWR<ApiKey[]>(`${envPath(orgId, env)}/keys`, fetcher);
  const { data: analytics } = useSWR<Analytics>(`${envPath(orgId, env)}/analytics?days=14`, fetcher, { refreshInterval: 30_000 });

  if (!environment || !org || !keys) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const base = `/o/${orgId}/${env}`;
  const hasKey = keys.some((k) => !k.revokedAt);
  const steps =
    env === 'sandbox'
      ? [
          { done: hasKey, title: 'Get a sandbox API key', body: 'Your first key was created with the organization.', href: `${base}/keys`, cta: 'API keys' },
          { done: environment.usage.linkedCustomers > 0, title: 'Connect your own Telegram', body: 'Link yourself to the sandbox bot and receive a real message.', href: `${base}/playground`, cta: 'Open playground' },
          { done: false, title: 'Test your fallback', body: 'Send to the built-in test customers to see every outcome your code must handle.', href: `${base}/docs#test-customers`, cta: 'Test customers' },
          { done: Boolean(environment.eventWebhookUrl), title: 'Receive webhook events', body: 'Get delivery results and replies pushed to your server.', href: `${base}/webhooks`, cta: 'Set webhook' },
          { done: org.liveBotConnected, title: 'Go live', body: 'Connect your own bot so customers see your brand, then use a live key.', href: `/o/${orgId}/live/bot`, cta: 'Switch to live' },
        ]
      : [
          { done: environment.botConnected, title: 'Connect your Telegram bot', body: 'Create a bot with @BotFather and paste its token.', href: `${base}/bot`, cta: 'Connect bot' },
          { done: hasKey, title: 'Create a live API key', body: 'Keep it on your server only.', href: `${base}/keys`, cta: 'API keys' },
          { done: Boolean(environment.eventWebhookUrl), title: 'Set your webhook URL', body: 'HTTPS endpoint for delivery results.', href: `${base}/webhooks`, cta: 'Set webhook' },
          { done: environment.usage.linkedCustomers > 0, title: 'Link your first customer', body: 'Show the t.me link from POST /v1/customers/link in your app or receipt.', href: `${base}/docs`, cta: 'Read the guide' },
        ];
  const doneCount = steps.filter((s) => s.done).length;

  const curl = `curl -X POST ${API_BASE_URL}/v1/messages \\
  -H "x-api-key: ${env === 'sandbox' ? 'tn_test_…' : 'tn_live_…'}" \\
  -H "content-type: application/json" \\
  -d '{"to": "${env === 'sandbox' ? 'test_linked' : 'customer_123'}", "text": "Your order is on its way 🚚"}'`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-gradient-to-br from-brand/25 to-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:linear-gradient(to_left,black,transparent_60%)]" />
        <div className="relative">
          <Badge tone={env === 'sandbox' ? 'amber' : 'green'} dot>
            {env === 'sandbox' ? 'Sandbox' : 'Live'}
          </Badge>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {env === 'sandbox' ? `Welcome to ${org.name}` : `${org.name} is ${environment.botConnected ? 'ready for' : 'almost ready for'} production`}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            {env === 'sandbox'
              ? 'Try the whole flow with test data. When a customer can’t be reached on Telegram, the API tells you immediately so your own SMS or email fallback can take over.'
              : 'Messages here reach real customers through your own bot. Finish the checklist to start sending.'}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-subtle">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-brand to-accent"
              />
            </div>
            <span className="text-sm text-muted">
              {doneCount} of {steps.length} done
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={PiggyBank}
          label="SMS saved · 14 days"
          value={analytics ? formatEtb(analytics.smsSaved.etb) : '…'}
          hint={analytics ? `${analytics.smsSaved.count.toLocaleString('en-US')} messages & verifications at ${analytics.smsSaved.pricePerSmsEtb} ETB/SMS` : undefined}
        />
        <Stat
          icon={Check}
          label="Delivery rate"
          value={analytics?.deliveryRate == null ? '—' : `${Math.round(analytics.deliveryRate * 100)}%`}
          hint="Sent ÷ (sent + undeliverable + failed)"
        />
        <Stat
          icon={Users}
          label="Customers on Telegram"
          value={analytics?.reachable.share == null ? '—' : `${Math.round(analytics.reachable.share * 100)}%`}
          hint={analytics ? `${analytics.reachable.reachable} of ${analytics.reachable.customers} reachable` : undefined}
        />
        <Stat icon={Send} label="Messages today" value={environment.usage.messagesToday} limit={environment.usage.dailyMessageLimit} />
      </div>

      <Card icon={BarChart3} title="Messages per day" description="Last 14 days, by outcome. Hover a day for details.">
        {analytics ? <OutcomesChart daily={analytics.daily} /> : <Skeleton className="h-48" />}
      </Card>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3 text-sm shadow-soft">
        <Bot className="size-4 text-muted" />
        <span className="text-muted">Bot</span>
        <span className="font-medium text-ink">{environment.botUsername ? `@${environment.botUsername}` : 'Not connected'}</span>
        <span className="ml-auto text-muted">
          {environment.usage.linkedCustomers}
          {environment.usage.linkedCustomerLimit !== undefined && ` / ${environment.usage.linkedCustomerLimit}`} linked Telegram users
        </span>
      </div>

      <Card title="Checklist" description="Everything you need to send your first real notification.">
        <ol className="-my-1 divide-y divide-line">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex flex-wrap items-center gap-4 py-3.5"
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  step.done ? 'bg-emerald-500 text-white shadow-soft' : 'border border-line bg-page text-muted',
                )}
              >
                {step.done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', step.done ? 'text-muted line-through decoration-muted/40' : 'text-ink')}>{step.title}</p>
                <p className="text-sm text-muted">{step.body}</p>
              </div>
              <Link
                href={step.href}
                className="group inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-soft"
              >
                {step.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.li>
          ))}
        </ol>
      </Card>

      <Card icon={MessageSquare} title="Send your first message" description="One call. The response tells you right away if the customer can’t be reached.">
        <CodeBlock language="bash" code={curl} />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          Possible results:
          <Badge dot>queued</Badge>
          <Badge tone="green" dot>
            sent
          </Badge>
          <Badge tone="amber" dot>
            undeliverable
          </Badge>
          <Badge tone="red" dot>
            failed
          </Badge>
        </div>
      </Card>
    </div>
  );
}

// Small amounts keep their decimals so a few saved SMS don't show as "0 ETB".
function formatEtb(value: number) {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: value < 10 ? 2 : 0 })} ETB`;
}

function Stat({ icon: Icon, label, value, limit, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; limit?: number; hint?: string }) {
  const pct = typeof value === 'number' && limit ? Math.min(100, (value / limit) * 100) : null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-subtle text-muted">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 truncate font-display text-2xl font-bold tabular-nums text-ink">
        {value}
        {limit !== undefined && <span className="text-base font-medium text-muted"> / {limit}</span>}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
      {pct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
          <div className={cn('h-full rounded-full', pct > 80 ? 'bg-amber-500' : 'bg-brand')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
