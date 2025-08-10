'use client';
import { useUser } from '@clerk/nextjs';
import { useUserStore } from '@/store/user';
import { useEffect } from 'react';

export function ClerkZustandProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const setUserState = useUserStore(state => state.setUserState);

  useEffect(() => {
    setUserState({ user: user || null, userId: user?.id ?? null, isLoaded });
  }, [user, isLoaded, setUserState]);

  return <>{children}</>;
}
