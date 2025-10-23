'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import ThemeToggle from '@/components/ui/theme-toggle'

export default function Home() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header (로고+네비+액션) */}
      <div className="h-16 flex items-center" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-x-32 px-4">
          {/* 좌측: 로고 */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Image
              src="/blooma_logo.svg"
              alt="Blooma Logo"
              aria-label="Blooma Logo"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
              priority
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
            <ThemeToggle />
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
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 border-neutral-700" style={{ backgroundColor: 'hsl(var(--background))' }} align="end">
                  <div className="px-3 py-2 border-b border-neutral-700">
                    <p className="text-sm text-neutral-300 truncate">{user.primaryEmailAddress?.emailAddress}</p>
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
      {/* Hero Section */}
      <section className="relative" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700/60 bg-neutral-900/70 px-4 py-2 text-sm uppercase tracking-[0.15em] text-neutral-300">
            Blooma Studio • Storyboard
          </div>

          <h1 className="mt-8 text-8xl font-regular tracking-tight font-instrument-serif" style={{ color: 'hsl(var(--foreground))' }}>
            Now, you are a director
          </h1>

          {/* 스토리보드 카드 그룹 */}
          <div className="mt-10 w-full max-w-7xl relative px-4">
            <div className="group relative flex items-center justify-center gap-6 perspective-1500 transform-style-3d">
              {/* 왼쪽 카드 */}
              <div 
                className="absolute left-0 w-[36rem] rounded-xl shadow-2xl border-2 opacity-100 translate-x-0 scale-95 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:-translate-x-20 group-hover:scale-90 hover:scale-100 cursor-pointer overflow-hidden"
                style={{ 
                  aspectRatio: '16/9',
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  zIndex: 1
                }}
              >
                <Image
                  src="https://cdn.midjourney.com/68322375-bdc6-4317-8729-379da55c1168/0_0.png"
                  alt="Opening Scene - Cinematic Style"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 576px"
                  unoptimized={true}
                />
              </div>

              {/* 중앙 메인 카드 */}
              <div 
                className="relative w-full max-w-3xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-2 transition-all duration-700 ease-out group-hover:scale-[1.02] hover:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.4)] cursor-pointer overflow-hidden"
                style={{ 
                  aspectRatio: '16/9',
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  zIndex: 3
                }}
              >
                <Image
                  src="https://cdn.midjourney.com/db57d0cf-73d9-4d85-883e-a6435690c23e/0_0.png"
                  alt="Main Scene - AI Generated"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  unoptimized={true}
                />
              </div>

              {/* 오른쪽 카드 */}
              <div 
                className="absolute right-0 w-[36rem] rounded-xl shadow-2xl border-2 opacity-100 translate-x-0 scale-95 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:translate-x-20 group-hover:scale-90 hover:scale-100 cursor-pointer overflow-hidden"
                style={{ 
                  aspectRatio: '16/9',
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  zIndex: 1
                }}
              >
                <Image
                  src="https://cdn.midjourney.com/070505e5-43dd-48f8-9e49-93c319414bba/0_0.png"
                  alt="Action Scene - Watercolor Style"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 576px"
                  unoptimized={true}
                />
              </div>
            </div>
          </div>

          <div className="mt-16 flex items-center gap-4">
            <Button
              className="px-8 py-3 text-lg font-semibold"
              style={{ 
                backgroundColor: 'hsl(var(--primary))', 
                color: 'hsl(var(--primary-foreground))' 
              }}
              onClick={() => {
                console.log('Hero Get Started button clicked, navigating to /auth')
                router.push('/auth')
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              className="px-8 py-3 text-lg font-semibold border-2"
              style={{ 
                borderColor: 'hsl(var(--border))', 
                color: 'hsl(var(--foreground))' 
              }}
              onClick={() => router.push('/dashboard')}
            >
              View Demo
            </Button>
          </div>
        </div>

        {/* 스크롤 힌트 */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <div className="h-6 w-px mb-2" style={{ backgroundColor: 'hsl(var(--border))' }} />
          Scroll
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-neutral-400">
            <p>&copy; 2025 Blooma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
