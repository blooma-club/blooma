'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/theme-toggle'
import { useUser } from '@clerk/nextjs'
import CreditsIndicator from '../ui/CreditsIndicator'

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
  const router = useRouter()
  const { user, isLoaded } = useOptionalUser() as ReturnType<typeof useUser>

  return (
    <header className="h-16 flex items-center border-b border-border/50 backdrop-blur">
      <div className="relative w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Blooma home"
        >
          <Image
            src="/blooma_logo.svg"
            alt="Blooma Logo"
            width={28}
            height={28}
            className="w-7 h-7 object-contain"
            priority
          />
        </Link>

        <nav className="hidden md:flex gap-10 text-sm font-medium">
          <Link
            href="/#features"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/#about"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href="/#contact"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <CreditsIndicator />
          <Button
            variant="ghost"
            className="text-sm"
            onClick={() => {
              if (!isLoaded) return
              if (!user) {
                router.push('/auth')
                return
              }
              router.push('/dashboard')
            }}
          >
            {user ? 'Dashboard' : 'Login'}
          </Button>
        </div>
      </div>
    </header>
  )
}
