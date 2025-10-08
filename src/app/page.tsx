'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Home() {
  const router = useRouter()
  const { user, signOut } = useSupabase()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header (로고+네비+액션) */}
      <div className="bg-black h-16 flex items-center">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-x-32 px-4">
          {/* 좌측: 로고 */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img
              src="/blooma_logo.svg"
              alt="Blooma Logo"
              aria-label="Blooma Logo"
              className="w-9 h-9 object-contain"
              draggable={false}
            />
            <span className="text-2xl font-bold text-white select-none ml-3">Blooma</span>
          </button>
          {/* 중앙: 네비게이션 */}
          <nav className="hidden md:flex gap-10 pr-30">
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
          <div className="flex items-center gap-4 -mt-1 group">
            {!user ? (
              <>
                <Button
                  variant="ghost"
                  className="py-1 px-3 text-white hover:bg-neutral-800"
                  onClick={() => {
                    console.log('Login button clicked, navigating to /auth')
                    router.push('/auth')
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="outline"
                  className="py-1 px-3 border-neutral-700 text-white hover:bg-neutral-800"
                  onClick={() => {
                    console.log('Get Started Free button clicked, navigating to /auth')
                    router.push('/auth')
                  }}
                >
                  Get Started Free
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center hover:opacity-80 transition-opacity cursor-pointer">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-black border-neutral-700" align="end">
                  <div className="px-3 py-2 border-b border-neutral-700">
                    <p className="text-sm text-neutral-300 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={signOut}
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
      {/* Hero Section */}
      <section className="relative isolate min-h-screen overflow-hidden">
        {/* 배경 이미지 (목업) */}
        <img
          src="/hero-background.png"
          alt="hero background"
          className="absolute inset-0 w-[90%] h-full object-cover left-1/2 transform -translate-x-1/2 rounded-4xl"
          draggable={false}
        />
        {/* 오버레이 */}

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-70 pb-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/70 backdrop-blur mt-10">
            Blooma Studio • Storyboard
          </div>

          <div className="mt-10 flex items-center gap-4">
            <Button
              className="bg-white text-black hover:bg-neutral-200"
              onClick={() => {
                console.log('Hero Get Started button clicked, navigating to /auth')
                router.push('/auth')
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              className="border-neutral-700 text-white hover:bg-neutral-800"
              onClick={() => router.push('/dashboard')}
            >
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
      <footer className="py-8 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-neutral-400">
            <p>&copy; 2025 Blooma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
