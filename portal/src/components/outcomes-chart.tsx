'use client';

import { CheckCircle2, Table2, TriangleAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { DayOutcome } from '@/lib/types';
import { cn } from '@/lib/cn';

// Status colors (reserved for state): good / warning / critical. Each series is
// always paired with an icon + label, so color never carries meaning alone.
const SERIES = [
  { key: 'sent', label: 'Sent', color: '#0ca30c', icon: CheckCircle2 },
  { key: 'undeliverable', label: 'Undeliverable', color: '#fab219', icon: TriangleAlert },
  { key: 'failed', label: 'Failed', color: '#d03b3b', icon: XCircle },
] as const;

const WIDTH = 720;
const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 32 };
const GAP = 2; // surface gap between stacked segments

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function OutcomesChart({ daily }: { daily: DayOutcome[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const totals = daily.map((d) => d.sent + d.undeliverable + d.failed);
  const max = niceMax(Math.max(0, ...totals));
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / daily.length;
  const barW = Math.max(4, Math.min(28, slot * 0.6));
  const y = (v: number) => (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(daily.length / 7);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-xs text-muted" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              <s.icon className="size-3.5" aria-hidden /> {s.label}
            </li>
          ))}
        </ul>
        <button onClick={() => setTable(!table)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-subtle hover:text-ink">
          <Table2 className="size-3.5" /> {table ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {table ? (
        <div className="max-h-64 overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...daily].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5 text-ink">{shortDate(d.date)}</td>
                  {SERIES.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right tabular-nums text-ink">
                      {d[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Messages per day by outcome" onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={PAD.top + plotH - y(t)} y2={PAD.top + plotH - y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : '2 4'} />
                <text x={PAD.left - 8} y={PAD.top + plotH - y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                  {Math.round(t)}
                </text>
              </g>
            ))}
            {daily.map((d, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              let base = PAD.top + plotH;
              const segments = SERIES.filter((s) => d[s.key] > 0);
              return (
                <g key={d.date}>
                  {hover === i && <rect x={cx - slot / 2} y={PAD.top} width={slot} height={plotH} fill="var(--subtle)" />}
                  {segments.map((s, j) => {
                    const h = Math.max(2, y(d[s.key]) - (j < segments.length - 1 ? GAP : 0));
                    base -= y(d[s.key]);
                    const top = j === segments.length - 1;
                    const yTop = base + (j < segments.length - 1 ? GAP : 0);
                    return top ? (
                      <path
                        key={s.key}
                        d={`M${cx - barW / 2},${yTop + h} V${yTop + Math.min(4, h / 2)} Q${cx - barW / 2},${yTop} ${cx - barW / 2 + 4},${yTop} H${cx + barW / 2 - 4} Q${cx + barW / 2},${yTop} ${cx + barW / 2},${yTop + Math.min(4, h / 2)} V${yTop + h} Z`}
                        fill={s.color}
                      />
                    ) : (
                      <rect key={s.key} x={cx - barW / 2} y={yTop} width={barW} height={h} fill={s.color} />
                    );
                  })}
                  {i % labelEvery === (daily.length - 1) % labelEvery && (
                    <text x={cx} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                      {shortDate(d.date)}
                    </text>
                  )}
                  {/* Hit target wider than the bar. */}
                  <rect x={cx - slot / 2} y={PAD.top} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div
              className={cn('pointer-events-none absolute top-2 z-10 min-w-40 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift')}
              style={{ left: `clamp(0px, calc(${((PAD.left + slot * hover + slot / 2) / WIDTH) * 100}% - 80px), calc(100% - 170px))` }}
            >
              <p className="mb-1 font-semibold text-ink">{shortDate(daily[hover].date)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-4 text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: s.color }} /> {s.label}
                  </span>
                  <span className="tabular-nums text-ink">{daily[hover][s.key]}</span>
                </p>
              ))}
              {daily[hover].received > 0 && <p className="mt-1 border-t border-line pt-1 text-muted">{daily[hover].received} replies received</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
