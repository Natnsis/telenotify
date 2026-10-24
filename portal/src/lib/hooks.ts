'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { ApiError, fetcher } from './api';
import type { EnvironmentInfo, EnvName, Me, Org } from './types';

// Redirects away from protected pages when the session is missing or unverified.
export function useRequireUser() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<Me>('/auth/me', fetcher, { shouldRetryOnError: false });
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) router.replace(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    else if (data && !data.emailVerified) router.replace('/check-email');
  }, [data, error, router]);
  return { user: data?.emailVerified ? data : undefined, isLoading, mutate };
}

export function useOrgParams() {
  const params = useParams<{ orgId: string; env: EnvName }>();
  return { orgId: params.orgId, env: params.env };
}

export function useOrg() {
  const { orgId } = useOrgParams();
  return useSWR<Org>(`/portal/orgs/${orgId}`, fetcher);
}

export function useEnvironment() {
  const { orgId, env } = useOrgParams();
  return useSWR<EnvironmentInfo>(`/portal/orgs/${orgId}/envs/${env}`, fetcher);
}

export function envPath(orgId: string, env: EnvName) {
  return `/portal/orgs/${orgId}/envs/${env}`;
}
