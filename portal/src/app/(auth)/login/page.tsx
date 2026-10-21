'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { GoogleButton } from '@/components/google-button';
import { Alert, Button, Input, TextLink } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

const errors: Record<string, string> = {
  google_failed: 'Google sign-in failed. Please try again.',
  google_not_configured: 'Google sign-in is not set up on this server.',
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(errors[params.get('error') ?? ''] ?? null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await api('/auth/login', { method: 'POST', body: { email: form.get('email'), password: form.get('password') } });
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Sign in</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">Welcome back.</p>
      <GoogleButton label="Continue with Google" />
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required />
        <div className="text-right text-sm">
          <TextLink href="/forgot-password">Forgot password?</TextLink>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        New here? <TextLink href="/signup">Create an account</TextLink>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
