'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/theme-toggle'
import { useUser, SignInButton } from '@clerk/nextjs'
import { useThemePreference } from '@/hooks/useThemePreference'
import ProfileMenu from '@/components/layout/ProfileMenu'

export default function SiteNavbarSignedOut() {
  const { user } = useUser()
  const theme = useThemePreference()
  const logoSrc = theme === 'dark' ? '/blooma_logo_white.png' : '/blooma_logo_black.png'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-black/10 dark:border-white/5 bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Go to top"
            tabIndex={0}
          >
            <Image
              src={logoSrc}
              alt="Blooma"
              width={28}
              height={28}
              className="w-12 h-12 object-contain select-none"
              priority
            />
          </button>

          {/* Right Actions */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <ThemeToggle />
            {!user ? (
              <SignInButton mode="modal" signUpForceRedirectUrl="/dashboard">
                <Button
                  variant="ghost"
                  className="px-5 py-2 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 transition-all rounded-full"
                  aria-label="Login"
                  tabIndex={0}
                >
                  Login
                </Button>
              </SignInButton>
            ) : (
              <ProfileMenu />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
