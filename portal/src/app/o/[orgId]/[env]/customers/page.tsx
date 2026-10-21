'use client';

import { Search, Users } from 'lucide-react';
import { useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Badge, Button, Card, Empty, formatDate, PageHeader, Select, Skeleton, Table } from '@/components/ui';
import { fetcher } from '@/lib/api';
import { envPath, useOrgParams } from '@/lib/hooks';
import type { Customer, Page } from '@/lib/types';

export default function CustomersPage() {
  const { orgId, env } = useOrgParams();
  const [search, setSearch] = useState('');
  const [linked, setLinked] = useState('');
  const query = new URLSearchParams({ limit: '25', ...(search ? { search } : {}), ...(linked ? { linked } : {}) });
  const { data, size, setSize, isLoading } = useSWRInfinite<Page<Customer>>(
    (index, previous) => (previous && !previous.nextCursor ? null : `${envPath(orgId, env)}/customers?${query}${previous ? `&cursor=${previous.nextCursor}` : ''}`),
    fetcher,
  );
  const customers = data?.flatMap((p) => p.data) ?? [];
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  return (
    <>
      <PageHeader title="Customers" description="People your system has sent to or linked. Customers who aren't reachable need your own fallback channel." />
      <Card>
        <div className="mb-5 flex flex-wrap gap-3">
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search customer id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink shadow-soft placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            />
          </label>
          <Select value={linked} onChange={(e) => setLinked(e.target.value)}>
            <option value="">All customers</option>
            <option value="true">Linked to Telegram</option>
            <option value="false">Not linked</option>
          </Select>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <Empty title="No customers yet" icon={Users}>
            They appear when you create a connect link or send a message.
          </Empty>
        ) : (
          <Table head={['Customer', 'Telegram', 'Reachable', 'Linked']}>
            {customers.map((c) => (
              <tr key={c.externalId}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-subtle text-xs font-semibold text-muted">
                      {c.externalId.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-ink">{c.externalId}</span>
                    {c.testCustomer && <Badge tone="blue">test</Badge>}
                  </span>
                </td>
                <td className="text-muted">{c.telegramUsername ? `@${c.telegramUsername}` : c.telegramLinked ? 'linked' : '—'}</td>
                <td>
                  {c.reachable ? (
                    <Badge tone="green" dot>
                      reachable
                    </Badge>
                  ) : (
                    <Badge tone="amber" dot>
                      {c.blocked ? 'blocked' : 'not linked'}
                    </Badge>
                  )}
                </td>
                <td className="whitespace-nowrap text-muted">{c.testCustomer ? '—' : formatDate(c.linkedAt)}</td>
              </tr>
            ))}
          </Table>
        )}
        {hasMore && (
          <div className="mt-5 text-center">
            <Button variant="secondary" onClick={() => setSize(size + 1)}>
              Load more
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
