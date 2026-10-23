'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SplashScreen } from '@/components/splash';
import { api, ApiError } from '@/lib/api';
import { takePendingInvite } from '@/lib/invite';
import type { Me, OrgSummary } from '@/lib/types';

// Routes the visitor to the right place: login, email check, onboarding or their org.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const me = await api<Me>('/auth/me');
        if (!me.emailVerified) return router.replace('/check-email');
        // Finish an invitation that was opened before signing in.
        const invite = takePendingInvite();
        if (invite) return router.replace(`/invite?token=${encodeURIComponent(invite)}`);
        const orgs = await api<OrgSummary[]>('/portal/orgs');
        router.replace(orgs.length ? `/o/${orgs[0].id}/sandbox` : '/onboarding');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) router.replace('/login');
        else throw error;
      }
    })();
  }, [router]);
  return <SplashScreen />;
}
