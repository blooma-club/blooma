'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignIn, SignedIn, SignedOut, useAuth } from '@clerk/nextjs'
import AuthShell from '@/components/auth/AuthShell'
import { CLERK_USER_SYNC_STORAGE_KEY } from '@/lib/clerk'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export default function AuthPage() {
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
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) {
      setStatus('idle')
      setErrorMessage(null)
      return
    }

    if (status !== 'idle') return

    const storedUserId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(CLERK_USER_SYNC_STORAGE_KEY)
        : null

    if (storedUserId === userId) {
      setStatus('success')
      router.push('/dashboard')
      return
    }

    let cancelled = false

    const syncUser = async () => {
      setStatus('syncing')

      try {
        const response = await fetch('/api/sync-user', {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const reason = payload?.error ?? `Sync endpoint responded with ${response.status}`
          throw new Error(reason)
        }

        if (!cancelled) {
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(CLERK_USER_SYNC_STORAGE_KEY, userId)
          }
          setStatus('success')
          router.push('/dashboard')
        }
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to sync user profile')
      }
    }

    syncUser()

    return () => {
      cancelled = true
    }
  }, [isLoaded, userId, router, status])

  const supportingText = useMemo(() => {
    if (status === 'syncing') {
      return 'Preparing your workspace...'
    }
    if (status === 'error') {
      return errorMessage ?? 'Something went wrong while creating your account.'
    }
    return 'Redirecting to your dashboard.'
  }, [status, errorMessage])

  const canRetry = status === 'error'

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CLERK_USER_SYNC_STORAGE_KEY)
    }
    setStatus('idle')
    setErrorMessage(null)
  }

  return (
    <AuthShell>
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-base text-neutral-600">{supportingText}</p>
          {status === 'error' && (
            <p className="text-sm text-red-500">
              Try again in a moment. If the issue persists, confirm your account configuration.
            </p>
          )}
        </div>

        {canRetry && (
          <button
            onClick={handleRetry}
            className="inline-flex h-10 items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white hover:bg-black/80"
          >
            Try again
          </button>
        )}
      </div>
    </AuthShell>
  )
}
