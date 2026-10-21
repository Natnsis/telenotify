'use client';

import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ChatDemo, useChatScript } from './chat-demo';
import { PrimaryLink } from './nav';

export function Hero() {
  const count = useChatScript();
  // The API card mirrors the chat: QUEUED while the order message is typing, SENT once it lands.
  const status = count >= 2 ? 'SENT' : 'QUEUED';

  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand/25 via-accent/20 to-pink-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.a
            href="#how-it-works"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3 text-sm text-muted shadow-soft backdrop-blur hover:text-ink"
          >
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">New</span>
            Free sandbox. Send your first message in 2 minutes
            <ArrowRight className="size-3.5" />
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-[2.7rem] font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]"
          >
            Reach customers where they <span className="text-gradient">actually read.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl"
          >
            Verify phone numbers and send transaction alerts, order updates and receipts on <b className="font-semibold text-ink">Telegram</b>, the app your customers already use, from your own branded bot. Stop paying for every SMS and every “resend code”.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <PrimaryLink href="/signup" size="lg">
              Start free in the sandbox <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </PrimaryLink>
            <a href="#developers" className="rounded-full border border-line bg-surface/70 px-6 py-3 text-[15px] font-medium text-ink backdrop-blur transition-colors hover:bg-subtle">
              See the API
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"
          >
            {['No credit card', 'No SMS cost per message', 'Phone verification without OTP'].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" /> {item}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative mx-auto"
        >
          <div className="relative z-0 animate-float">
            <ChatDemo count={count} />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="absolute -left-16 top-24 z-20 hidden w-64 rounded-2xl border border-line bg-surface/90 p-4 shadow-lift backdrop-blur-xl sm:block lg:-left-28"
          >
            <p className="font-mono text-[11px] text-muted">POST /v1/messages</p>
            <pre className="mt-2 font-mono text-[11.5px] leading-relaxed text-ink">
              {`{ "to": "customer_1042",\n  "text": "Out for delivery 🚚" }`}
            </pre>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-muted">status</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={
                    status === 'SENT'
                      ? 'rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'rounded-md bg-subtle px-2 py-0.5 font-mono text-xs font-semibold text-muted'
                  }
                >
                  {status}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute -bottom-7 -right-4 z-20 hidden items-center gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3 shadow-lift backdrop-blur-xl sm:flex lg:-right-12"
          >
            <span className="relative grid size-8 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-amber-500/30" />
              <Sparkles className="relative size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">customer_88 can&apos;t be reached</p>
              <p className="font-mono text-[11px] text-muted">UNDELIVERABLE · not_linked → use SMS</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
