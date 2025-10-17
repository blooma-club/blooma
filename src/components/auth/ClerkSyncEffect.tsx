'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CLERK_USER_SYNC_STORAGE_KEY } from '@/lib/clerk'

/**
 * Ensures the authenticated Clerk user is synchronised with the Cloudflare D1
 * users table. Runs client-side after authentication so the sync happens no
 * matter which page the user lands on first.
 */
export default function ClerkSyncEffect() {
  const { isLoaded, userId } = useAuth()
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!userId) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CLERK_USER_SYNC_STORAGE_KEY)
      }
      syncingRef.current = false
      return
    }

    if (syncingRef.current) {
      return
    }

    const storedUserId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(CLERK_USER_SYNC_STORAGE_KEY)
        : null

    if (storedUserId === userId) {
      return
    }

    let cancelled = false
    syncingRef.current = true

    const sync = async () => {
      try {
        const response = await fetch('/api/sync-user', {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          console.error('[clerk-sync] Failed to sync user with Cloudflare D1', {
            status: response.status,
            payload,
          })
          return
        }

        if (!cancelled && typeof window !== 'undefined') {
          window.sessionStorage.setItem(CLERK_USER_SYNC_STORAGE_KEY, userId)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[clerk-sync] Unexpected error while syncing user', error)
        }
      } finally {
        if (!cancelled) {
          syncingRef.current = false
        }
      }
    }

    sync()

    return () => {
      cancelled = true
      syncingRef.current = false
    }
  }, [isLoaded, userId])

  return null
}
