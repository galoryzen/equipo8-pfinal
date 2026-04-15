'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getMe } from '@/app/lib/api/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Checks the user's session once on mount and exposes:
 *  - `authStatus`  — 'loading' | 'authenticated' | 'unauthenticated'
 *  - `requireAuth` — call with a destination URL; navigates there if the user
 *    is logged in, or to `/login/traveler?redirect=<destination>` if not.
 */
export function useAuthAction() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    getMe().then((user) => {
      setAuthStatus(user ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  const requireAuth = useCallback(
    (destination: string) => {
      if (authStatus === 'authenticated') {
        router.push(destination);
      } else {
        router.push(`/login/traveler?redirect=${encodeURIComponent(destination)}`);
      }
    },
    [authStatus, router]
  );

  return { authStatus, requireAuth };
}
