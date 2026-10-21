'use client';

import {
  BookOpen,
  Bot,
  Check,
  ChevronsUpDown,
  CreditCard,
  FlaskConical,
  KeyRound,
  LogOut,
  Menu,
  MessagesSquare,
  Plus,
  Rocket,
  Users,
  UsersRound,
  Webhook,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Logo } from '@/components/logo';
import { cn, Spinner } from '@/components/ui';
import { api, fetcher } from '@/lib/api';
import { useOrg, useOrgParams, useRequireUser } from '@/lib/hooks';
import type { EnvName, OrgSummary } from '@/lib/types';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; sandboxOnly?: boolean };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Build',
    items: [
      { href: '', label: 'Get started', icon: Rocket },
      { href: '/playground', label: 'Playground', icon: FlaskConical, sandboxOnly: true },
      { href: '/docs', label: 'Docs', icon: BookOpen },
    ],
  },
  {
    label: 'Configure',
    items: [
      { href: '/keys', label: 'API keys', icon: KeyRound },
      { href: '/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/bot', label: 'Telegram bot', icon: Bot },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { href: '/messages', label: 'Messages', icon: MessagesSquare },
      { href: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Organization',
    items: [
      { href: '/team', label: 'Team', icon: UsersRound },
      { href: '/billing', label: 'Plan & usage', icon: CreditCard },
    ],
  },
];

export default function OrgLayout({ children }: { children: ReactNode }) {
  const { user } = useRequireUser();
  const { orgId, env } = useOrgParams();
  const { data: org, error: orgError } = useOrg();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const base = `/o/${orgId}/${env}`;
  const subpath = pathname.slice(base.length);

  useEffect(() => setDrawer(false), [pathname]);

  if (orgError) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        <p>
          Organization not found.{' '}
          <Link className="text-brand" href="/dashboard">
            Go home
          </Link>
        </p>
      </div>
    );
  }
  if (!user || !org) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  // Keep the current page when switching environments (playground has no live twin).
  const switchTo = (target: EnvName) => `/o/${orgId}/${target}${target === 'live' && subpath.startsWith('/playground') ? '' : subpath}`;

  const nav = (
    <Sidebar
      base={base}
      env={env}
      subpath={subpath}
      orgSwitcher={<OrgSwitcher currentId={orgId} currentName={org.name} />}
      footer={<UserMenu name={user.name} email={user.email} />}
    />
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/80 backdrop-blur-xl lg:block">{nav}</aside>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface"
            >
              <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label="Close menu">
                <X className="size-4" />
              </button>
              {nav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 border-b border-line bg-page/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-8">
          <button onClick={() => setDrawer(true)} className="-ml-1 rounded-lg p-1.5 text-ink hover:bg-subtle lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="truncate text-sm font-medium text-ink lg:hidden">{org.name}</span>
          <div className="ml-auto">
            <EnvSwitch env={env} hrefFor={switchTo} />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {env === 'sandbox' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-amber-300/50 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 text-center text-xs font-medium text-amber-900 dark:border-amber-500/20 dark:from-amber-500/5 dark:via-amber-500/10 dark:to-amber-500/5 dark:text-amber-200"
            >
              <p className="px-4 py-1.5">Sandbox mode: test data only. Messages go through the shared Telenotify sandbox bot.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          {children}
        </motion.div>
      </main>
    </div>
  );
}

function Sidebar({ base, env, subpath, orgSwitcher, footer }: { base: string; env: EnvName; subpath: string; orgSwitcher: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-4">
        <Link href={base} className="inline-block">
          <Logo suffix="Developers" />
        </Link>
      </div>
      <div className="px-3">{orgSwitcher}</div>
      <nav className="mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const items = group.items.filter((i) => !(i.sandboxOnly && env === 'live'));
          return (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80">{group.label}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = item.href === '' ? subpath === '' : subpath.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={`${base}${item.href}`}
                        className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors', active ? 'font-medium text-ink' : 'text-muted hover:bg-subtle/70 hover:text-ink')}
                      >
                        {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-subtle ring-1 ring-line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        <item.icon className={cn('relative size-4', active && 'text-brand')} />
                        <span className="relative">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">{footer}</div>
    </div>
  );
}

function EnvSwitch({ env, hrefFor }: { env: EnvName; hrefFor: (env: EnvName) => string }) {
  return (
    <div className="relative flex rounded-xl border border-line bg-subtle p-1 text-sm">
      {(['sandbox', 'live'] as const).map((target) => (
        <Link key={target} href={hrefFor(target)} className="relative px-3.5 py-1 font-medium capitalize">
          {env === target && (
            <motion.span
              layoutId="env-pill"
              className={cn('absolute inset-0 rounded-lg shadow-soft', target === 'sandbox' ? 'bg-amber-400' : 'bg-emerald-500')}
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className={cn('relative flex items-center gap-1.5', env === target ? (target === 'sandbox' ? 'text-amber-950' : 'text-white') : 'text-muted hover:text-ink')}>
            {target === 'live' && <span className={cn('size-1.5 rounded-full', env === 'live' ? 'bg-white' : 'bg-emerald-500')} />}
            {target}
          </span>
        </Link>
      ))}
    </div>
  );
}

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);
  return ref;
}

function OrgSwitcher({ currentId, currentName }: { currentId: string; currentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const { data: orgs } = useSWR<OrgSummary[]>('/portal/orgs', fetcher);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-left shadow-soft transition-colors hover:bg-subtle"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white dark:from-slate-600 dark:to-slate-800">
          {currentName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{currentName}</span>
        <ChevronsUpDown className="size-4 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-40 mt-1.5 rounded-xl border border-line bg-surface p-1 shadow-lift"
          >
            {(orgs ?? []).map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setOpen(false);
                  router.push(`/o/${o.id}/sandbox`);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-subtle"
              >
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.id === currentId && <Check className="size-4 text-brand" />}
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <Link href="/onboarding" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-subtle hover:text-ink">
              <Plus className="size-4" /> New organization
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-full z-40 mb-1.5 rounded-xl border border-line bg-surface p-1 shadow-lift"
          >
            <Link href="/" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-subtle">
              <Rocket className="size-4 text-muted" /> Telenotify home
            </Link>
            <button
              onClick={async () => {
                await api('/auth/logout', { method: 'POST' });
                router.replace('/login');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-subtle"
            >
              <LogOut className="size-4 text-muted" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-subtle" aria-label="Account menu">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-accent text-sm font-semibold text-white">{name.charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{name}</span>
          <span className="block truncate text-xs text-muted">{email}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted" />
      </button>
    </div>
  );
}
