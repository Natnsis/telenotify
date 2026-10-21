'use client';

import { ArrowRight, Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/logo';
import { PrimaryLink } from './nav';
import { Reveal, SectionHeading } from './reveal';

const faqs = [
  {
    q: 'Do my customers need to install anything?',
    a: 'Only Telegram, which most already use. They tap your link, press Start once, and they’re connected. No app, no account, no forms.',
  },
  {
    q: 'What happens if a customer isn’t on Telegram?',
    a: 'The API returns UNDELIVERABLE with reason not_linked immediately. Your system sends that message through your existing SMS or email provider. We tell you exactly when it’s needed.',
  },
  {
    q: 'Will messages show my business name?',
    a: 'Yes. In live mode you connect your own @BotFather bot, so customers see your name, logo and description. Only the sandbox uses our shared test bot.',
  },
  {
    q: 'Can I try it without affecting real customers?',
    a: 'Every organization gets a sandbox with its own keys and data, a shared test bot, and built-in test customers that simulate every outcome. Nothing in the sandbox reaches real customers.',
  },
  {
    q: 'How do I know a webhook really came from Telenotify?',
    a: 'Every event carries an HMAC-SHA256 signature over the timestamp and body using your signing secret, plus a stable event id so retries can be de-duplicated.',
  },
  {
    q: 'Is sending on Telegram really free?',
    a: 'Telegram doesn’t charge bots to send messages. That’s what makes it a much cheaper first channel than SMS for customers who use Telegram.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 bg-surface/60 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <div className="mt-12 divide-y divide-line rounded-3xl border border-line bg-surface shadow-soft">
          {faqs.map((faq, i) => (
            <div key={faq.q}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                <span className="font-medium text-ink">{faq.q}</span>
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted">
                  {open === i ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 leading-relaxed text-muted">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-5 py-24 sm:py-32">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#0b1020] px-6 py-16 text-center shadow-lift sm:px-16 sm:py-20">
        <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 size-80 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
        <h2 className="relative font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Your next notification could
          <br className="hidden sm:block" /> be on Telegram today.
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-lg text-slate-300">Create an account, grab your sandbox key and send yourself a message in minutes. Free to start, no card required.</p>
        <div className="relative mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
          >
            Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/login" className="rounded-full border border-white/20 px-6 py-3 text-[15px] font-medium text-white hover:bg-white/10">
            Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">Customer notifications on Telegram, with one API call.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#developers" className="hover:text-ink">Developers</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </div>
        <p className="text-sm text-muted">© {new Date().getFullYear()} Telenotify</p>
      </div>
    </footer>
  );
}

export { PrimaryLink };
