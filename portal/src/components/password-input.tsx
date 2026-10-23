'use client';

import { Check, Eye, EyeOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '@/lib/cn';
import { passwordChecks, passwordScore } from '@/lib/password';

const LEVELS = [
  { label: '', bar: 'bg-line', text: 'text-muted' },
  { label: 'Weak', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Very strong', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
];

// Password field with a show/hide toggle. With `showStrength`, a meter and the
// list of rules appear while typing a new password.
export function PasswordInput({
  label,
  hint,
  showStrength,
  matchWith,
  className,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  hint?: ReactNode;
  showStrength?: boolean;
  /** For a "confirm password" field: the password it must equal. */
  matchWith?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(typeof props.defaultValue === 'string' ? props.defaultValue : '');
  const current = typeof props.value === 'string' ? props.value : value;
  const score = passwordScore(current);
  const level = LEVELS[score];

  return (
    <div>
      <label className="block">
        {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
        <span className="relative block">
          <input
            {...props}
            type={visible ? 'text' : 'password'}
            onChange={(e) => {
              setValue(e.target.value);
              onChange?.(e);
            }}
            className={cn(
              'w-full rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-11 text-sm text-ink shadow-[inset_0_1px_2px_rgb(var(--shadow)/0.04)] transition-shadow placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15',
              className,
            )}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={visible ? 'hide' : 'show'}
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                transition={{ duration: 0.15 }}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </span>
        {hint && !showStrength && matchWith === undefined && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
      </label>

      {matchWith !== undefined && current.length > 0 && (
        <p
          className={cn(
            'mt-1.5 flex items-center gap-1.5 text-xs font-medium',
            current === matchWith ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}
        >
          {current === matchWith ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
          {current === matchWith ? 'Passwords match' : 'Passwords don’t match yet'}
        </p>
      )}

      {showStrength && (
        <div className="mt-2.5">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <span key={step} className="h-1.5 overflow-hidden rounded-full bg-line/70">
                  <motion.span
                    className={cn('block h-full rounded-full', level.bar)}
                    initial={false}
                    animate={{ width: score >= step ? '100%' : '0%' }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  />
                </span>
              ))}
            </div>
            <span className={cn('w-20 text-right text-xs font-medium', level.text)}>{level.label}</span>
          </div>
          <AnimatePresence initial={false}>
            {current.length > 0 && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 grid gap-1 overflow-hidden text-xs sm:grid-cols-2"
              >
                {passwordChecks(current).map((check) => (
                  <li key={check.id} className={cn('flex items-center gap-1.5 transition-colors', check.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted')}>
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded-full transition-colors',
                        check.ok ? 'bg-emerald-500 text-white' : 'bg-subtle text-muted ring-1 ring-inset ring-line',
                      )}
                    >
                      {check.ok ? <Check className="size-2.5" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
                    </span>
                    {check.label}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          {current.length === 0 && (
            <p className="mt-1.5 text-xs text-muted">Use 8+ characters with uppercase, lowercase, a number and a special character.</p>
          )}
        </div>
      )}
    </div>
  );
}
