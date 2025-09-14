'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()
  const { user, signOut } = useSupabase()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header (로고+네비+액션) */}
      <div className="bg-black border-b-2 border-neutral-800 h-16 flex items-center">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto gap-x-24 px-4">
          {/* 좌측: 로고 */}
          <div className="flex items-center">
            <Image
              src="/blooma.svg"
              alt="Blooma Logo"
              width={56}
              height={56}
              className="w-14 h-14 object-contain"
              draggable={false}
              priority
            />
            <span className="text-2xl font-bold text-white select-none ml-3">Blooma</span>
          </div>
          {/* 중앙: 네비게이션 */}
          <nav className="hidden md:flex gap-8">
            <a
              href="#features"
              className="text-neutral-300 hover:text-white font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
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
          {/* 우측: 액션 버튼 */}
          <div className="flex items-center gap-3 -mt-1 group">
            {!user ? (
              <>
                <Button variant="ghost" className="py-1 px-3 text-white hover:bg-neutral-800" onClick={() => router.push('/auth')}>
                  Login
                </Button>
                <Button variant="outline" className="py-1 px-3 border-neutral-700 text-white hover:bg-neutral-800" onClick={() => router.push('/auth')}>
                  Get Started Free
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-300">{user.email}</span>
                <Button variant="ghost" size="sm" className="text-white hover:bg-neutral-800" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Hero Section */}
      <section className="relative isolate flex-1 overflow-hidden">
        {/* 배경 이미지 (목업) */}
        <Image
          src="/styles/cinematic.jpg"
          alt="hero background"
          fill
          className="object-cover opacity-70"
          draggable={false}
          priority
        />
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_40%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/65 to-black" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/70 backdrop-blur">
            Blooma Studio • Storyboard
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.1] sm:text-6xl lg:text-7xl">
            Craft cinematic storyboards
          </h1>
          <p className="mt-6 max-w-2xl text-neutral-300 text-lg leading-relaxed">
            High-fidelity layouts for film, fashion, and brand storytelling. Designed for studios that obsess over detail.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Button className="bg-white text-black hover:bg-neutral-200" onClick={() => router.push('/auth')}>
              Get Started
            </Button>
            <Button variant="outline" className="border-neutral-700 text-white hover:bg-neutral-800" onClick={() => router.push('/dashboard')}>
              View Demo
            </Button>
          </div>
        </div>

        {/* 스크롤 힌트 */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-[11px] text-neutral-400">
          <div className="h-6 w-px bg-neutral-600 mb-2" />
          Scroll
        </div>
      </section>



      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-neutral-400">
            <p>&copy; 2025 Blooma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
