'use client';

import { ArrowLeft, KeyRound, ShieldAlert, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Logo } from '@/components/logo';
import { Alert, Badge, Button, Card, Dialog, Input, PageHeader, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireUser } from '@/lib/hooks';

function useAction() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; done: string | null }>({ loading: false, error: null, done: null });
  async function run(action: () => Promise<unknown>, done: string) {
    setState({ loading: true, error: null, done: null });
    try {
      await action();
      setState({ loading: false, error: null, done });
      return true;
    } catch (e) {
      setState({ loading: false, error: e instanceof ApiError ? e.message : 'Something went wrong', done: null });
      return false;
    }
  }
  return { ...state, run };
}

export default function AccountPage() {
  const router = useRouter();
  const { user, mutate } = useRequireUser();
  const profile = useAction();
  const password = useAction();
  const removal = useAction();
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard">
          <Logo suffix="Developers" />
        </Link>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
      </div>
      <PageHeader title="Account settings" description="These settings apply to you across all your organizations." />

      <div className="space-y-6">
        <Card icon={UserRound} title="Profile">
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get('name');
              if (await profile.run(() => api('/auth/me', { method: 'PATCH', body: { name } }), 'Saved.')) mutate();
            }}
            className="space-y-4"
          >
            <Input name="name" label="Full name" defaultValue={user.name} required maxLength={100} />
            <Input label="Email" value={user.email} disabled hint="Your email can't be changed yet." />
            <div className="flex items-center gap-2 text-sm text-muted">
              Google sign-in:{' '}
              {user.googleLinked ? (
                <Badge tone="green" dot>
                  linked
                </Badge>
              ) : (
                <>
                  <Badge>not linked</Badge>
                  <a href="/api/auth/google" className="font-medium text-brand hover:underline">
                    Link Google
                  </a>
                </>
              )}
            </div>
            {profile.error && <Alert>{profile.error}</Alert>}
            {profile.done && <Alert tone="green">{profile.done}</Alert>}
            <Button type="submit" loading={profile.loading}>
              Save profile
            </Button>
          </form>
        </Card>

        <Card icon={KeyRound} title={user.hasPassword ? 'Change password' : 'Set a password'} description={user.hasPassword ? 'Other devices are signed out when you change it.' : 'You sign in with Google. Add a password to also sign in with your email.'}>
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              if (data.get('newPassword') !== data.get('confirm')) return password.run(() => Promise.reject(new ApiError(400, 'New passwords do not match')), '');
              const ok = await password.run(
                () => api('/auth/change-password', { method: 'POST', body: { currentPassword: data.get('currentPassword') || undefined, newPassword: data.get('newPassword') } }),
                'Password updated. Other devices were signed out.',
              );
              if (ok) {
                form.reset();
                mutate();
              }
            }}
            className="space-y-4"
          >
            {user.hasPassword && <Input name="currentPassword" type="password" label="Current password" autoComplete="current-password" required />}
            <Input name="newPassword" type="password" label="New password" autoComplete="new-password" minLength={8} required hint="At least 8 characters." />
            <Input name="confirm" type="password" label="Confirm new password" autoComplete="new-password" minLength={8} required />
            {password.error && <Alert>{password.error}</Alert>}
            {password.done && <Alert tone="green">{password.done}</Alert>}
            <Button type="submit" loading={password.loading}>
              {user.hasPassword ? 'Change password' : 'Set password'}
            </Button>
          </form>
        </Card>

        <Card icon={ShieldAlert} title="Delete account" description="Permanently delete your account. Organizations where you're the only member are deleted too.">
          <Button variant="danger" onClick={() => setDeleting(true)}>
            Delete my account
          </Button>
        </Card>
      </div>

      <Dialog open={deleting} onClose={() => setDeleting(false)} title="Delete your account?" description="This can't be undone. Organizations you share with others stay, and your actions remain in their audit log.">
        <form
          onSubmit={async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const confirmEmail = new FormData(e.currentTarget).get('confirmEmail');
            if (await removal.run(() => api('/auth/me', { method: 'DELETE', body: { confirmEmail } }), '')) router.replace('/');
          }}
          className="space-y-4"
        >
          <Input name="confirmEmail" type="email" label={`Type ${user.email} to confirm`} required autoComplete="off" />
          {removal.error && <Alert>{removal.error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={removal.loading}>
              Delete account
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
