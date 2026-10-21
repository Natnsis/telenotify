'use client';

import { CheckCircle2 } from 'lucide-react';
import { ChatDemo, useChatScript } from './landing/chat-demo';

export function AuthShowcase() {
  const count = useChatScript(2200);
  return (
    <div className="relative hidden overflow-hidden bg-[#0b1020] lg:flex lg:flex-col lg:justify-center lg:px-14">
      <div className="pointer-events-none absolute -left-24 top-10 size-96 rounded-full bg-sky-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 size-96 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="scale-[0.92]">
          <ChatDemo count={count} />
        </div>
        <h2 className="mt-8 text-center font-display text-2xl font-bold tracking-tight text-white">Notifications your customers actually open.</h2>
        <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
          {['Free sandbox with test customers', 'Your own branded Telegram bot', 'Instant signal when to fall back to SMS'].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-sky-400" /> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
