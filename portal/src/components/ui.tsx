'use client';

import { Check, Copy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, useEffect, useState } from 'react';

export { cn } from '@/lib/cn';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-page shadow-soft hover:-translate-y-px hover:shadow-lift disabled:opacity-50 disabled:hover:translate-y-0',
  secondary: 'border border-line bg-surface text-ink shadow-soft hover:bg-subtle disabled:opacity-50',
  danger: 'border border-red-200 bg-surface text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40',
  ghost: 'text-muted hover:bg-subtle hover:text-ink',
};

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
    >
      {loading && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Input({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      <input
        {...props}
        className={cn(
          'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgb(var(--shadow)/0.04)] transition-shadow placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15',
          className,
        )}
      />
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Card({
  title,
  description,
  actions,
  icon: Icon,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface shadow-soft', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/15 to-accent/15 text-brand ring-1 ring-inset ring-brand/15">
                <Icon className="size-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
          </div>
          {actions}
        </header>
      )}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

const badgeTones = {
  gray: 'bg-subtle text-muted ring-line',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
};

const dotTones = { gray: 'bg-muted', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-sky-500' };

export function Badge({ tone = 'gray', dot, children }: { tone?: keyof typeof badgeTones; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeTones[tone])}>
      {dot && <span className={cn('size-1.5 rounded-full', dotTones[tone])} />}
      {children}
    </span>
  );
}

export function Alert({ tone = 'red', children }: { tone?: 'red' | 'amber' | 'green' | 'blue'; children: ReactNode }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    blue: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200',
  };
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-xl border px-3.5 py-2.5 text-sm', tones[tone])}>
      {children}
    </motion.div>
  );
}

export function CopyButton({ value, label = 'Copy', dark }: { value: string; label?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
        dark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'border border-line bg-surface text-muted hover:text-ink',
      )}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function Secret({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-subtle px-3.5 py-2.5">
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0b1020] shadow-soft">
      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2">
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
          </span>
          {language}
        </span>
        <CopyButton value={code} dark />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem] sm:leading-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Empty({ title, icon: Icon, children, action }: { title: string; icon?: React.ComponentType<{ className?: string }>; children?: ReactNode; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-subtle/30 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-surface text-muted shadow-soft ring-1 ring-line">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && (
        <Link href={action.href} className="mt-4 inline-flex items-center rounded-xl bg-ink px-4 py-2 text-sm font-medium text-page shadow-soft transition-transform hover:-translate-y-px">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Spinner() {
  return <div className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-subtle', className)} />;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-brand hover:underline">
      {children}
    </Link>
  );
}

export function Dialog({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={cn('relative w-full rounded-2xl border border-line bg-surface p-6 shadow-lift', wide ? 'max-w-2xl' : 'max-w-md')}
          >
            <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-subtle hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </button>
            <h2 className="pr-8 font-display text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            <div className="mt-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-line/70 bg-subtle/50 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-5 py-2 font-medium sm:px-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr]:transition-colors [&>tr:hover]:bg-subtle/60 [&_td]:px-5 [&_td]:py-3 sm:[&_td]:px-6">{children}</tbody>
      </table>
    </div>
  );
}

export function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value: string | null) {
  if (!value) return '—';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [[60, 'minute'], [3600, 'hour'], [86400, 'day']];
  for (let i = units.length - 1; i >= 0; i--) {
    const [size, name] = units[i];
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
  }
  return formatDate(value);
}
