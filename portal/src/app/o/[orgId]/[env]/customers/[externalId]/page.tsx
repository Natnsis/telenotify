'use client';

import { ArrowLeft, Link2, MessageSquare, QrCode, Send, ShieldCheck, Unlink, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { ConnectQr } from '@/components/qr-code';
import { StatusBadge } from '@/components/status-badge';
import { Alert, Badge, Button, Card, Empty, formatDate, PageHeader, Skeleton, Table, timeAgo } from '@/components/ui';
import { api, ApiError, fetcher } from '@/lib/api';
import { envPath, useOrgParams } from '@/lib/hooks';
import type { CustomerDetail, LinkResult } from '@/lib/types';
import { useProgressRouter } from '@/components/route-progress';

export default function CustomerPage() {
  const router = useProgressRouter();
  const { orgId, env } = useOrgParams();
  const { externalId: raw } = useParams<{ externalId: string }>();
  const externalId = decodeURIComponent(raw);
  const base = `${envPath(orgId, env)}/customers/${encodeURIComponent(externalId)}`;
  const { data, error, mutate } = useSWR<CustomerDetail>(base, fetcher, { refreshInterval: 5000 });
  const [link, setLink] = useState<LinkResult | null>(null);
  const [notice, setNotice] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(key: string, action: () => Promise<unknown>, success?: string) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      if (success) setNotice({ tone: 'green', text: success });
      mutate();
    } catch (e) {
      setNotice({ tone: 'red', text: e instanceof ApiError ? e.message : 'Something went wrong' });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <Empty title={error instanceof ApiError && error.status === 404 ? 'Customer not found' : 'Could not load this customer'} />;
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const { customer, stats } = data;

  return (
    <>
      <Link href={`/o/${orgId}/${env}/customers`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <PageHeader
        title={customer.externalId}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          customer.reachable ? (
            <Badge tone="green" dot>
              reachable on Telegram
            </Badge>
          ) : (
            <Badge tone="amber" dot>
              {customer.blocked ? 'blocked the bot' : 'not linked'}
            </Badge>
          )
        }
      />
      {notice && (
        <div className="mb-5">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <Card icon={UserRound} title="Profile">
            <dl className="space-y-2.5 text-sm">
              {[
                ['Telegram', customer.telegramUsername ? `@${customer.telegramUsername}` : customer.telegramLinked ? 'linked' : 'not linked'],
                ['Linked', customer.testCustomer ? 'built-in test customer' : customer.linkedAt ? formatDate(customer.linkedAt) : '—'],
                ['Phone', customer.phone ? `+${customer.phone}` : '—'],
                ['Blocked bot', customer.blockedAt ? formatDate(customer.blockedAt) : 'no'],
                ['Messages', `${stats.SENT ?? 0} sent · ${stats.UNDELIVERABLE ?? 0} undeliverable · ${stats.RECEIVED ?? 0} replies`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {customer.telegramLinked && !customer.testCustomer && (
              <Button
                variant="danger"
                className="mt-5"
                loading={busy === 'unlink'}
                onClick={() => {
                  if (!confirm(`Disconnect ${customer.externalId} from Telegram? They'll need a new connect link to get messages again.`)) return;
                  act('unlink', () => api(`${base}/unlink`, { method: 'POST' }), 'Disconnected. Send them a new connect link to reconnect.');
                }}
              >
                <Unlink className="size-4" /> Unlink Telegram
              </Button>
            )}
          </Card>

          {!customer.testCustomer && (
            <Card icon={QrCode} title="Connect link" description="Show this as a button or QR code so the customer can connect to your bot.">
              {link ? (
                <ConnectQr url={link.url} filename={`telenotify-connect-${customer.externalId}`} caption={`One-time link, valid until ${formatDate(link.expiresAt)}.`} />
              ) : (
                <Button variant="secondary" loading={busy === 'link'} onClick={() => act('link', async () => setLink(await api<LinkResult>(`${base}/link`, { method: 'POST' })))}>
                  <Link2 className="size-4" /> Create connect link
                </Button>
              )}
            </Card>
          )}

          <Card icon={ShieldCheck} title="Phone verifications">
            {data.verifications.length === 0 ? (
              <p className="text-sm text-muted">None for this customer.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.verifications.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Badge tone={v.status === 'VERIFIED' ? 'green' : v.status === 'FAILED' ? 'red' : 'gray'}>{v.status.toLowerCase().replace('_', ' ')}</Badge>
                      {v.phone && <span className="font-mono text-xs text-muted">+{v.phone}</span>}
                    </span>
                    <span className="text-xs text-muted">{timeAgo(v.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card icon={Send} title="Send a message" description={env === 'live' ? 'This goes to the real customer.' : 'Sandbox: labelled as a test message.'}>
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const form = e.currentTarget;
                const text = new FormData(form).get('text');
                if (env === 'live' && !confirm('Send this message to the real customer?')) return;
                act(
                  'send',
                  async () => {
                    const message = await api<{ id: string; status: string; reason: string | null }>(`${base}/messages`, { method: 'POST', body: { text } });
                    form.reset();
                    if (message.status === 'UNDELIVERABLE') throw new ApiError(400, `Undeliverable (${message.reason}). Use your fallback channel.`);
                  },
                  'Sent. It will appear below in a moment.',
                );
              }}
              className="space-y-3"
            >
              <textarea
                name="text"
                required
                maxLength={4096}
                rows={3}
                placeholder="Hi! Your order is ready for pickup."
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
              />
              <Button type="submit" loading={busy === 'send'}>
                Send
              </Button>
            </form>
          </Card>

          <Card icon={MessageSquare} title="Recent messages">
            {data.messages.length === 0 ? (
              <Empty title="No messages yet" />
            ) : (
              <Table head={['Message', 'Status', 'Time']}>
                {data.messages.map((m) => (
                  <tr key={m.id} className="cursor-pointer align-top" onClick={() => router.push(`/o/${orgId}/${env}/messages/${m.id}`)}>
                    <td className="max-w-xs text-ink">
                      <p className="line-clamp-2 break-words">
                        {m.direction === 'INBOUND' && <span className="mr-1 text-xs font-semibold text-sky-600">reply</span>}
                        {m.text}
                      </p>
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="whitespace-nowrap text-muted">{timeAgo(m.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
