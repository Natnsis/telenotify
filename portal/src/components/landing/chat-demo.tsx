'use client';

import { BadgeCheck, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/components/ui';

type Bubble = { from: 'bot' | 'user'; text: string; button?: string; time: string };

const script: Bubble[] = [
  { from: 'bot', text: '✅ Connected to Abebe Pharmacy. You’ll get your updates here.', time: '9:41' },
  { from: 'bot', text: 'Your order #1042 is packed and out for delivery 🚚', button: 'Track order', time: '9:42' },
  { from: 'bot', text: 'Your verification code is 482 913. It expires in 5 minutes.', time: '9:44' },
  { from: 'user', text: 'Thank you! 🙏', time: '9:45' },
];

// Plays the script one bubble at a time (with a typing indicator), then loops.
export function useChatScript(stepMs = 1900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const done = count >= script.length;
    const timer = setTimeout(() => setCount(done ? 0 : count + 1), done ? 3200 : count === 0 ? 700 : stepMs);
    return () => clearTimeout(timer);
  }, [count, stepMs]);
  return count;
}

export function ChatDemo({ count }: { count: number }) {
  const visible = script.slice(0, count);
  const typing = count < script.length && script[count].from === 'bot' && count > 0;
  return (
    <div className="relative mx-auto w-[300px] sm:w-[320px]">
      <div className="rounded-[2.6rem] border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 p-2.5 shadow-lift">
        <div className="overflow-hidden rounded-[2.1rem] bg-[#0e1621]">
          <div className="flex items-center gap-3 bg-[#17212b] px-4 pb-3 pt-7">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">AP</div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold text-white">
                Abebe Pharmacy <BadgeCheck className="size-3.5 text-sky-400" />
              </p>
              <p className="text-xs text-sky-300/80">bot</p>
            </div>
          </div>
          <div
            className="flex h-[400px] flex-col justify-end gap-2 px-3 pb-4"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.08), transparent 45%), radial-gradient(circle at 80% 70%, rgba(129,140,248,0.08), transparent 40%)' }}
          >
            <AnimatePresence initial={false}>
              {visible.map((bubble, i) => (
                <motion.div
                  key={`${i}-${bubble.text}`}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className={cn('max-w-[85%]', bubble.from === 'user' ? 'self-end' : 'self-start')}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 text-[13px] leading-snug text-white',
                      bubble.from === 'user' ? 'rounded-br-md bg-[#2b5278]' : 'rounded-bl-md bg-[#182533]',
                    )}
                  >
                    {bubble.text}
                    <span className="ml-2 inline-block translate-y-0.5 text-[10px] text-white/40">{bubble.time}</span>
                  </div>
                  {bubble.button && (
                    <div className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#182533]/80 py-1.5 text-[13px] font-medium text-sky-300">
                      {bubble.button} <ExternalLink className="size-3" />
                    </div>
                  )}
                </motion.div>
              ))}
              {typing && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex w-14 items-center justify-center gap-1 self-start rounded-2xl rounded-bl-md bg-[#182533] py-3"
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1.5 rounded-full bg-white/50"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
