'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser, useClerk } from '@clerk/nextjs'

export default function SiteNavbarSignedOut() {
  const router = useRouter()

  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  return (
    <header
      className="h-16 flex items-center"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      <div className="relative w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* 좌측: 로고 */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer p-2"
            aria-label="Go to top"
            tabIndex={0}
          >
            <Image
              src="/blooma_logo.svg"
              alt="Blooma Logo"
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
              priority
            />
          </Button>
        </div>

        {/* 중앙: 네비게이션 */}
        <nav className="hidden md:flex gap-10 absolute left-1/2 -translate-x-1/2">
          <a
            href="#features"
            className="text-neutral-300 hover:text-white font-medium transition-colors"
          >
            Features
          </a>
          <a
            href="pricing"
            className="text-neutral-300 hover:text-white font-medium transition-colors"
          >
            Pricing
          </a>
          <a
            href="#about"
            className="text-neutral-300 hover:text-white font-medium transition-colors"
          >
            About
          </a>
          <a
            href="#contact"
            className="text-neutral-300 hover:text-white font-medium transition-colors"
          >
            Contact
          </a>
        </nav>

        {/* 우측: Login만 */}
        <div className="flex-shrink-0 flex items-center gap-4">
          <CreditsIndicator />
          <ThemeToggle />
          {!user ? (
            <Button
              variant="ghost"
              className="text-white hover:bg-neutral-800"
              onClick={() => {
                if (!isLoaded) return
                router.push('/auth')
              }}
              aria-label="Login"
              tabIndex={0}
            >
              Login
            </Button>
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
    </header>
  )
}
