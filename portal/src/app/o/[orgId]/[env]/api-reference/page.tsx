'use client';

import { Download, Play, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Badge, Button, Card, CodeBlock, cn, Input, PageHeader, Skeleton } from '@/components/ui';
import { API_BASE_URL } from '@/lib/api';
import { useOrgParams } from '@/lib/hooks';
import { bodyExample, endpoints, type Endpoint, type OpenApiSpec, toPostman } from '@/lib/openapi';

const methodTone: Record<string, string> = {
  GET: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  POST: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  PUT: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  DELETE: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const KEY_STORAGE = 'tn_explorer_key';

interface Result {
  status: number;
  ms: number;
  body: string;
}

export default function ApiReferencePage() {
  const { env } = useOrgParams();
  const { data: spec } = useSWR<OpenApiSpec>('/api/docs-json', (url: string) => fetch(url).then((r) => r.json()));
  const list = useMemo(() => (spec ? endpoints(spec) : []), [spec]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((e) => e.id === selectedId) ?? list[0];
  const [apiKey, setApiKey] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const prefix = env === 'sandbox' ? 'tn_test_' : 'tn_live_';

  useEffect(() => {
    try {
      setApiKey(sessionStorage.getItem(KEY_STORAGE) ?? '');
    } catch {}
  }, []);

  useEffect(() => {
    if (!selected || !spec) return;
    setParams({});
    setResult(null);
    setError(null);
    setBody(bodyExample(spec, selected.op) ?? '');
  }, [selected?.id, spec]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildPath(e: Endpoint) {
    let path = e.path.replace(/\{(\w+)\}/g, (_, name: string) => encodeURIComponent(params[name] ?? `{${name}}`));
    const query = new URLSearchParams();
    for (const p of e.op.parameters ?? []) if (p.in === 'query' && params[p.name]) query.set(p.name, params[p.name]);
    if (query.size) path += `?${query}`;
    return path;
  }

  async function send() {
    if (!selected) return;
    setError(null);
    setResult(null);
    if (!apiKey.startsWith(prefix)) return setError(`Use a ${env} key here (it starts with ${prefix}).`);
    if ((selected.op.parameters ?? []).some((p) => p.in === 'path' && !params[p.name])) return setError('Fill in the path parameters.');
    let parsed: unknown;
    if (body.trim()) {
      try {
        parsed = JSON.parse(body);
      } catch {
        return setError('The request body is not valid JSON.');
      }
    }
    try {
      sessionStorage.setItem(KEY_STORAGE, apiKey);
    } catch {}
    setSending(true);
    const started = performance.now();
    try {
      const response = await fetch(`/api${buildPath(selected)}`, {
        method: selected.method,
        headers: { 'x-api-key': apiKey, ...(parsed !== undefined ? { 'content-type': 'application/json' } : {}) },
        body: parsed !== undefined ? JSON.stringify(parsed) : undefined,
      });
      const text = await response.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResult({ status: response.status, ms: Math.round(performance.now() - started), body: pretty });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function downloadPostman() {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(toPostman(spec, API_BASE_URL), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'telenotify.postman_collection.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!spec) return <Skeleton className="h-96" />;

  const path = selected ? buildPath(selected) : '';
  const curl = selected
    ? [`curl -X ${selected.method} ${API_BASE_URL}${path}`, `  -H "x-api-key: ${prefix}…"`, ...(body.trim() ? ['  -H "content-type: application/json"', `  -d '${body.replace(/'/g, "'\\''")}'`] : [])].join(' \\\n')
    : '';

  return (
    <>
      <PageHeader
        title="API reference"
        description="Every public endpoint, generated from the live API. Try calls with your key, right here."
        actions={
          <Button variant="secondary" onClick={downloadPostman}>
            <Download className="size-4" /> Postman collection
          </Button>
        }
      />

      <div className="mb-6 rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Input label={`Your ${env} API key`} type="password" placeholder={`${prefix}…`} value={apiKey} onChange={(e) => setApiKey(e.target.value.trim())} autoComplete="off" />
          </div>
          <p className="flex max-w-sm items-center gap-2 text-xs text-muted">
            <ShieldAlert className="size-4 shrink-0 text-amber-500" />
            Kept only in this browser tab. {env === 'live' ? 'Live calls affect real customers.' : 'Sandbox calls are safe to experiment with.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <nav className="space-y-4">
          {[...new Set(list.map((e) => e.tag))].map((tag) => (
            <div key={tag}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{tag}</p>
              {list
                .filter((e) => e.tag === tag)
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm', selected?.id === e.id ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle/60')}
                  >
                    <span className={cn('w-12 shrink-0 rounded-md px-1 py-0.5 text-center font-mono text-[10px] font-bold', methodTone[e.method])}>{e.method}</span>
                    <span className="truncate font-mono text-xs">{e.path}</span>
                  </button>
                ))}
            </div>
          ))}
        </nav>

        {selected && (
          <div className="space-y-6">
            <Card
              title={
                <span className="flex items-center gap-2">
                  <span className={cn('rounded-md px-1.5 py-0.5 font-mono text-xs font-bold', methodTone[selected.method])}>{selected.method}</span>
                  <span className="font-mono text-sm">{selected.path}</span>
                </span>
              }
              description={selected.op.summary}
            >
              {selected.op.description && <p className="mb-4 text-sm leading-relaxed text-muted">{withCode(selected.op.description)}</p>}
              {(selected.op.parameters ?? []).filter((p) => p.in !== 'header').length > 0 && (
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  {(selected.op.parameters ?? [])
                    .filter((p) => p.in !== 'header')
                    .map((p) => (
                      <Input
                        key={p.name}
                        label={`${p.name}${p.required ? '' : ' (optional)'}`}
                        hint={p.in === 'path' ? 'Path parameter' : p.schema?.enum ? `One of ${p.schema.enum.join(', ')}` : 'Query parameter'}
                        value={params[p.name] ?? ''}
                        onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                      />
                    ))}
                </div>
              )}
              {selected.op.requestBody && (
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Request body (JSON)</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={Math.min(14, Math.max(4, body.split('\n').length + 1))}
                    spellCheck={false}
                    className="w-full rounded-xl border border-line bg-[#0b1020] p-3 font-mono text-[13px] leading-relaxed text-slate-100 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                  />
                </label>
              )}
              {error && (
                <div className="mb-4">
                  <Alert>{error}</Alert>
                </div>
              )}
              <Button onClick={send} loading={sending}>
                <Play className="size-4" /> Send request
              </Button>
              {result && (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge tone={result.status >= 500 ? 'red' : result.status >= 400 ? 'amber' : 'green'} dot>
                      {result.status}
                    </Badge>
                    <span className="text-muted">{result.ms} ms</span>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    <CodeBlock language="response" code={result.body || '(empty)'} />
                  </div>
                </div>
              )}
            </Card>
            <Card title="Code">
              <CodeBlock language="bash" code={curl} />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

// Renders `backtick` spans in OpenAPI descriptions as inline code.
function withCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="rounded bg-subtle px-1 font-mono text-xs text-ink">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
