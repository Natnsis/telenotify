'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Input, TextLink } from '@/components/ui';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    await api('/auth/forgot-password', { method: 'POST', body: { email: new FormData(event.currentTarget).get('email') } });
    setLoading(false);
    setSent(true);
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Reset your password</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">We&apos;ll email you a link to set a new one.</p>
      {sent ? (
        <Alert tone="green">If an account exists for that email, a reset link is on its way.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Button type="submit" loading={loading} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        <TextLink href="/login">Back to sign in</TextLink>
      </p>
    </>
  );
}
