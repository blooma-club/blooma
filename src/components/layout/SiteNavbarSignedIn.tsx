'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/theme-toggle'
import AccountDropdown from '@/components/ui/AccountDropdown'

export default function SiteNavbarSignedIn() {
  const router = useRouter()

  return (
    <header className="w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="h-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          aria-label="Go to home"
          tabIndex={0}
        >
          <Image
            src="/blooma_logo.svg"
            alt="Blooma Logo"
            width={28}
            height={28}
            className="w-7 h-7 object-contain select-none"
            draggable={false}
          />
        </button>

        {/* 오른쪽: 컨트롤 */}
        <div className="flex items-center gap-3">
          {/* 크레딧 인디케이터: 작은 화면에서는 숨김으로 미니멀 유지 */}
          <div className="hidden sm:block">
            <CreditsIndicator />
          </div>
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </div>
    </header>
  )
}
