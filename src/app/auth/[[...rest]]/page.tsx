'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignIn, SignedIn, SignedOut, useAuth } from '@clerk/nextjs'
import AuthShell from '@/components/auth/AuthShell'


const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function AuthPage() {
  if (!clerkPublishableKey) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-black">Authentication unavailable</h2>
          <p className="text-base text-neutral-600">
            Clerk is not configured for this environment. Set the{' '}
            <span className="font-mono text-neutral-800">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span>{' '}
            environment variable to enable sign in and try again.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <>
      <SignedOut>
        <AuthShell>
          <SignIn
            routing="path"
            path="/auth"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
              },
            }}
          />
        </AuthShell>
      </SignedOut>

      <SignedIn>
        <ClerkSyncGate />
      </SignedIn>
    </>
  )
}

function ClerkSyncGate() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()

  useEffect(() => {
    if (isLoaded && userId) {
      router.push('/dashboard')
    }
  }, [isLoaded, userId, router])

  return (
    <AuthShell>
      <div className="space-y-6 text-center">
        <p className="text-base text-neutral-600">Redirecting to your dashboard...</p>
      </div>
    </AuthShell>
  )
}
