'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/blooma.svg"
            alt="Blooma Logo"
            className="mx-auto h-16 w-16"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to Blooma
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account or create a new one
          </p>
        </div>
        
        <AuthForm />
      </div>
    </div>
  );
}
