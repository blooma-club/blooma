'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import ProfileMenu from '@/components/layout/ProfileMenu'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { usePopupStore } from '@/store/popup'

import { useState, useEffect } from 'react'

export default function SiteNavbarSignedOut() {
  const { user } = useSupabaseUser()
  const { openPopup } = usePopupStore()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-background/80 backdrop-blur-xl border-b border-border/5'
        : 'bg-transparent border-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Go to top"
            tabIndex={0}
          >
            <Image
              src="/blooma_logo_black.webp"
              alt="Blooma"
              width={28}
              height={28}
              className="w-7 h-7 object-contain select-none"
              priority
            />
          </button>

          {/* Right Actions */}
          <div className="flex-shrink-0 flex items-center gap-4">
            {!user ? (
              <Button
                variant="ghost"
                className="px-5 py-2 h-9 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full"
                aria-label="Login"
                tabIndex={0}
                onClick={() => openPopup('login')}
              >
                Login
              </Button>
            ) : (
              <ProfileMenu />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
