'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePopupStore } from '@/store/popup'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export function LoginModal() {
  const { user, isLoading } = useSupabaseUser()
  const { activePopup, closePopup } = usePopupStore()
  const isOpen = activePopup === 'login'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (!isLoading && user) {
      closePopup()
    }
  }, [isLoading, isOpen, user, closePopup])

  const handleSignIn = useCallback(async () => {
    if (isLoading) return
    try {
      const nextPath = `${window.location.pathname}${window.location.search || ''}` || '/'
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
    } catch (error) {
      console.error('Failed to start Google sign-in', error)
    }
  }, [isLoading])

  if (!mounted || !isOpen) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={closePopup} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xs min-h-[300px] rounded-2xl border border-border/40 bg-background/95 shadow-2xl backdrop-blur-xl overflow-hidden"
      >
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex min-h-[300px] flex-col px-6 py-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/90 shadow-sm">
              <div className="relative h-6 w-6">
                <Image
                  src="/blooma_logo_white.webp"
                  alt="Blooma"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <p className="text-xl font-semibold tracking-tight">Sign in to Blooma</p>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
              <span>First user 100 credits</span>
            </div>
          </div>

          <div className="mt-auto">
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              className="h-11 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
            >
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
