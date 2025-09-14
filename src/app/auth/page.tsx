'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function AuthPage() {
  const { user } = useSupabase();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src="/blooma.svg"
            alt="Blooma Logo"
            width={64}
            height={64}
            className="mx-auto h-16 w-16"
          />
          <h2 className="mt-6 text-3xl font-bold text-white">
            Welcome to Blooma
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Sign in to your account or create a new one
          </p>
        </div>
        
        <AuthForm />
      </div>
    </div>
  );
}
