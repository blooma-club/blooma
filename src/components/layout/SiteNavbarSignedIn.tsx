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
    <header
      className="w-full h-14 border-b px-6 flex items-center justify-between"
      style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
    >
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
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

      {/* 오른쪽: 계정 설정 */}
      <div className="flex items-center gap-6">
        {/* 크레딧 인디케이터 */}
        <CreditsIndicator />
        {/* 테마 토글 */}
        <ThemeToggle />

        {/* 계정 설정 드롭다운 */}
        <AccountDropdown />
      </div>
    </header>
  )
}
