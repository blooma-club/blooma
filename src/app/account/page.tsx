'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { getSupabaseBrowserClient } from '@/lib/db/supabase-client'
import { Button } from '@/components/ui/button'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { Header } from '@/components/layout/Header'

export default function AccountPage() {
  const { user, isLoading } = useSupabaseUser()

  const metadata = (user?.user_metadata || {}) as Record<string, unknown>
  const displayName = useMemo(() => {
    if (typeof metadata.full_name === 'string' && metadata.full_name) return metadata.full_name
    if (typeof metadata.name === 'string' && metadata.name) return metadata.name
    return user?.email || 'Blooma user'
  }, [metadata.full_name, metadata.name, user?.email])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Account</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile, credits, and access.
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-sm">
              <div className="text-sm text-muted-foreground">Loading account...</div>
            </div>
          ) : !user ? (
            <div className="rounded-2xl border border-border/60 bg-white/70 p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
              <p className="text-sm text-muted-foreground mt-2">
                You need to sign in to view your profile.
              </p>
              <Button asChild className="mt-4 h-9">
                <Link href="/auth">Go to sign in</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Profile
                    </p>
                    <div className="mt-3">
                      <p className="text-lg font-medium text-foreground">{displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => getSupabaseBrowserClient().auth.signOut()}
                  >
                    Log out
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Credits</p>
                    <p className="text-xs text-muted-foreground">Track remaining balance.</p>
                  </div>
                  <Button asChild className="h-9">
                    <Link href="/pricing">Upgrade</Link>
                  </Button>
                </div>
                <div className="mt-4">
                  <CreditsIndicator minimal />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
