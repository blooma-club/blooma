'use client'

import { useUser } from '@clerk/nextjs'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'
import SiteNavbarSignedOut from '@/components/layout/SiteNavbarSignedOut'

const FALLBACK_USER = {
  isLoaded: true,
  isSignedIn: false,
  isSignedOut: true,
  user: null,
} as ReturnType<typeof useUser>

let warnedAboutMissingClerk = false

function useOptionalUser() {
  try {
    return useUser()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !warnedAboutMissingClerk) {
      console.warn(
        '[clerk] Falling back to an unauthenticated state because ClerkProvider is not available. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.',
        error
      )
      warnedAboutMissingClerk = true
    }
    return FALLBACK_USER
  }
}

export default function SiteNavbar() {
  const { user, isLoaded } = useOptionalUser() as ReturnType<typeof useUser>

  if (!isLoaded) {
    return <SiteNavbarSignedOut />
  }

  return user ? <SiteNavbarSignedIn /> : <SiteNavbarSignedOut />
}
