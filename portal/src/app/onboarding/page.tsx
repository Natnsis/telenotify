'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Logo } from '@/components/logo';
import { Alert, Button, Input, Secret, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireUser } from '@/lib/hooks';
import type { ApiKey } from '@/lib/types';

export default function OnboardingPage() {
  const { user } = useRequireUser();
  const [created, setCreated] = useState<{ org: { id: string; name: string }; sandboxKey: ApiKey } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setCreated(await api('/portal/orgs', { method: 'POST', body: { name: new FormData(event.currentTarget).get('name') } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 mask-fade-b" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand/25 via-accent/20 to-pink-500/10 blur-3xl" />
      <div className="relative mb-8">
        <Logo />
      </div>
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-7 shadow-lift">
        {!created ? (
          <>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Create your organization</h1>
            <p className="mb-5 mt-1 text-sm text-muted">
              Hi {user.name.split(' ')[0]}. You&apos;ll get a sandbox right away to try everything before going live.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <Alert>{error}</Alert>}
              <Input label="Organization name" name="name" placeholder="e.g. Abebe Pharmacy" required maxLength={120} hint="Customers see this name in the sandbox and when they connect." />
              <Button type="submit" loading={loading} className="w-full">
                Create organization
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Your sandbox is ready 🎉</h1>
            <p className="mb-4 mt-1 text-sm text-muted">This is your sandbox API key. Copy it now; we only show it once.</p>
            <Secret value={created.sandboxKey.key!} />
            <div className="mt-4">
              <Alert tone="blue">Sandbox keys start with <code className="font-mono">tn_test_</code>. Nothing you do in the sandbox reaches real customers.</Alert>
            </div>
            <Link
              href={`/o/${created.org.id}/sandbox`}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-page shadow-soft transition-transform hover:-translate-y-px"
            >
              Continue to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
