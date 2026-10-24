'use client';

import { ReactNode } from 'react';
import { LogoMark } from '@/components/logo';

// Frame shared by the hosted verify pages: a centered card on a calm background,
// "Secured by Telenotify" underneath. These pages are shown to our customers' users.
export function VerifyShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand/20 via-accent/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(circle_at_top,black,transparent_65%)]" />
      <main className="relative w-full max-w-md">{children}</main>
      <p className="relative mt-6 flex items-center gap-2 text-xs text-muted">
        <LogoMark className="size-4" /> Secured by <a href="/" className="font-medium text-ink hover:underline">Telenotify</a>
      </p>
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-line bg-surface p-7 shadow-lift sm:p-8">{children}</div>;
}
