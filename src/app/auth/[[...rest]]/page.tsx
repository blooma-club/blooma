'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useSupabaseUser()
  const nextPath = searchParams.get('next') ?? '/studio/create'

  useEffect(() => {
    if (!isLoading && user) {
      router.push(nextPath)
    }
  }, [isLoading, nextPath, router, user])

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-black">Sign in</h2>
          <p className="text-base text-neutral-600">Continue with Google to access your workspace.</p>
        </div>
        <Button
          className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90"
          onClick={async () => {
            try {
              const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
              await getSupabaseBrowserClient().auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo },
              })
            } catch (error) {
              console.error('Failed to start Google sign-in', error)
            }
          }}
          disabled={isLoading}
        >
          Continue with Google
        </Button>
      </div>
    </AuthShell>
  )
}
