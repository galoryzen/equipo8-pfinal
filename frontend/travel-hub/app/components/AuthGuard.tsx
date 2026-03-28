'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getMe } from '../lib/api/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getMe().then((user) => {
      if (!user) {
        const isTravelerRoute = pathname.startsWith('/traveler');
        router.replace(isTravelerRoute ? '/login/traveler' : '/login/manager');
      } else {
        setChecked(true);
      }
    });
  }, [pathname, router]);

  if (!checked) return null;

  return <>{children}</>;
}
