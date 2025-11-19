'use client'

import Image from 'next/image'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser, useClerk, SignInButton } from '@clerk/nextjs'
import { useThemePreference } from '@/hooks/useThemePreference'

export default function SiteNavbarSignedOut() {
  const { user } = useUser()
  const { signOut } = useClerk()
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
            <CreditsIndicator />
            <ThemeToggle />
            {!user ? (
              <SignInButton mode="modal" signUpForceRedirectUrl="/dashboard">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-neutral-800"
                  aria-label="Login"
                  tabIndex={0}
                >
                  Login
                </Button>
              </SignInButton>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
                    aria-label="User menu"
                    tabIndex={0}
                  >
                    {user.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt="User Avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {user.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 border-neutral-700"
                  style={{ backgroundColor: 'hsl(var(--background))' }}
                  align="end"
                >
                  <div className="px-3 py-2 border-b border-neutral-700">
                    <p className="text-sm text-neutral-300 truncate">
                      {user.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
