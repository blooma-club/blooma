'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import ProfileMenu from '@/components/layout/ProfileMenu'

export default function SiteNavbarSignedIn() {
  const router = useRouter()

  return (
    <header className="w-full bg-transparent sticky top-0 z-40">
      <div className="h-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          aria-label="Go to home"
          tabIndex={0}
        >
          <Image
            src="/blooma_logo_black.webp"
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
            <CreditsIndicator placement="bottom" />
          </div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
