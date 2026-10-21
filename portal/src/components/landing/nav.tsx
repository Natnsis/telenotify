'use client';

import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Logo } from '@/components/logo';
import { cn } from '@/components/ui';
import { fetcher } from '@/lib/api';
import type { Me } from '@/lib/types';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#developers', label: 'Developers' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));
  const { data: me } = useSWR<Me>('/auth/me', fetcher, { shouldRetryOnError: false, revalidateOnFocus: false });

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-line/70 bg-page/75 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Link href="/" aria-label="Telenotify home">
          <Logo product="Telenotify" />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink">
              {link.label}
            </a>
          ))}
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {me ? (
            <PrimaryLink href="/dashboard">Open dashboard</PrimaryLink>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-subtle">
                Sign in
              </Link>
              <PrimaryLink href="/signup">Start free</PrimaryLink>
            </>
          )}
        </div>
        <button className="ml-auto rounded-lg p-2 text-ink md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-line bg-page/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-ink hover:bg-subtle">
                  {link.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href={me ? '/dashboard' : '/login'} className="rounded-full border border-line px-4 py-2 text-center text-sm font-medium text-ink">
                  {me ? 'Dashboard' : 'Sign in'}
                </Link>
                <PrimaryLink href="/signup">Start free</PrimaryLink>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function PrimaryLink({ href, children, size = 'md' }: { href: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-ink font-medium text-page shadow-lift transition-transform hover:-translate-y-0.5',
        size === 'lg' ? 'px-6 py-3 text-[15px]' : 'px-4 py-2 text-sm',
      )}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-brand via-accent to-brand bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100" />
      <span className="relative flex items-center gap-2">{children}</span>
    </Link>
  );
}
