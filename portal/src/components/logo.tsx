import { cn } from '@/lib/cn';

export function Logo({ compact, product = 'Telenotify', suffix, className }: { compact?: boolean; product?: string; suffix?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="relative grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-brand to-accent text-white shadow-soft">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
          <path d="M21.4 3.6 2.9 10.7c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5ZM9.6 14.9l-.4 3.7-1.4-4.6 10-6.3-8.2 7.2Z" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-tight text-ink">
          {product}
          {suffix && <span className="ml-1.5 font-sans text-sm font-normal text-muted">{suffix}</span>}
        </span>
      )}
    </div>
  );
}
