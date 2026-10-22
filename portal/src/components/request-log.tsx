'use client';

import { Activity } from 'lucide-react';
import { useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { ApiKey, Page } from '@/lib/types';
import { Badge, Button, Card, Empty, formatDate, Select, Skeleton, Table, timeAgo } from './ui';

interface ApiRequest {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  error: string | null;
  key: { id: string; name: string; prefix: string };
  createdAt: string;
}

function StatusCode({ code }: { code: number }) {
  const tone = code >= 500 ? 'red' : code >= 400 ? 'amber' : 'green';
  return (
    <Badge tone={tone} dot>
      {code}
    </Badge>
  );
}

// Every call made with this environment's keys in the last 30 days.
export function RequestLog({ basePath, keys }: { basePath: string; keys: ApiKey[] }) {
  const [keyId, setKeyId] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const query = new URLSearchParams({ limit: '25', ...(keyId ? { keyId } : {}), ...(errorsOnly ? { errorsOnly: 'true' } : {}) });
  const { data, size, setSize, isLoading } = useSWRInfinite<Page<ApiRequest>>(
    (index, previous) => (previous && !previous.nextCursor ? null : `${basePath}/requests?${query}${previous ? `&cursor=${previous.nextCursor}` : ''}`),
    fetcher,
    { refreshInterval: 5000 },
  );
  const rows = data?.flatMap((p) => p.data) ?? [];
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  return (
    <Card icon={Activity} title="Recent API requests" description="Calls made with your keys in the last 30 days. Failed calls show the exact error message.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={keyId} onChange={(e) => setKeyId(e.target.value)}>
          <option value="">All keys</option>
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name} ({k.prefix}…)
            </option>
          ))}
        </Select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Errors only
        </label>
      </div>
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <Empty title={errorsOnly ? 'No failed requests' : 'No requests yet'} icon={Activity}>
          {errorsOnly ? 'Nice: every call succeeded.' : 'Calls you make with these keys show up here within seconds.'}
        </Empty>
      ) : (
        <Table head={['Request', 'Status', 'Time', 'Key', 'When']}>
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="max-w-md">
                <span className="font-mono text-xs text-ink">
                  <span className={cn('mr-1.5 font-semibold', r.method === 'GET' ? 'text-sky-600 dark:text-sky-400' : 'text-violet-600 dark:text-violet-400')}>{r.method}</span>
                  {r.path}
                </span>
                {r.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{r.error}</p>}
              </td>
              <td>
                <StatusCode code={r.statusCode} />
              </td>
              <td className="whitespace-nowrap tabular-nums text-muted">{r.durationMs} ms</td>
              <td className="whitespace-nowrap text-muted">{r.key.name}</td>
              <td className="whitespace-nowrap text-muted" title={formatDate(r.createdAt)}>
                {timeAgo(r.createdAt)}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={() => setSize(size + 1)}>
            Load more
          </Button>
        </div>
      )}
    </Card>
  );
}
