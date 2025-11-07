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
import { Sparkles, Film, Zap } from 'lucide-react'

const FALLBACK_USER = {
  isLoaded: true,
  isSignedIn: false,
  isSignedOut: true,
  user: null,
  // Provide a stable noop to satisfy the Clerk hook contract when auth is disabled.
  setActive: async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[clerk] setActive called without a configured ClerkProvider.')
    }
  },
} as ReturnType<typeof useUser>

const FALLBACK_SIGN_OUT: ReturnType<typeof useClerk>['signOut'] = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[clerk] signOut called without a configured ClerkProvider.')
  }
}

let warnedAboutMissingClerk = false
function useOptionalUser() {
  try {
    return useUser()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !warnedAboutMissingClerk) {
      console.warn(
        '[clerk] Falling back to an unauthenticated state because ClerkProvider is not available. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.',
        error
      )
      warnedAboutMissingClerk = true
    }
    return FALLBACK_USER
  }
}

function useOptionalSignOut() {
  try {
    return useClerk().signOut
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !warnedAboutMissingClerk) {
      console.warn(
        '[clerk] Falling back to a noop signOut because ClerkProvider is not available. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.',
        error
      )
      warnedAboutMissingClerk = true
    }
    return FALLBACK_SIGN_OUT
  }
}

export default function Home() {
  const router = useRouter()
  const { user, isLoaded } = useOptionalUser() as ReturnType<typeof useUser>
  const signOut = useOptionalSignOut()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header - Linear Style: Fixed, Transparent with Blur */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-black/10 dark:border-white/5 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to top"
              tabIndex={0}
            >
              <Image
                src="/blooma_logo.svg"
                alt="Blooma"
                width={28}
                height={28}
                className="w-7 h-7"
                priority
              />
            </button>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {!user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!isLoaded) return
                    router.push('/auth')
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Login"
                  tabIndex={0}
                >
                  Login
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center hover:opacity-80 transition-opacity"
                      aria-label="User menu"
                      tabIndex={0}
                    >
                      {user.imageUrl ? (
                        <Image
                          src={user.imageUrl}
                          alt="User Avatar"
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium text-foreground">
                            {user.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 border-border bg-popover" align="end">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm text-muted-foreground truncate">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="text-foreground hover:bg-accent cursor-pointer"
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
      {/* Hero Section - Linear Style */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/5 dark:via-violet-950/5 to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-foreground/80">
                Introducing AI Storyboard
              </span>
            </div>
          </div>

          {/* Main Heading - Gradient Text with Instrument Serif */}
          <h1 className="text-center mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-[110px] font-regular tracking-tight leading-[1.1] font-instrument-serif bg-gradient-to-br from-foreground via-foreground to-foreground/60 dark:from-white dark:via-white dark:to-white/40 bg-clip-text text-transparent">
              Now, you are a director
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Create stunning storyboards with AI. From script to visual narrative in minutes.
          </p>

          {/* CTA Buttons - Smaller Size */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Button
              onClick={() => {
                if (!isLoaded) return
                router.push(user ? '/dashboard' : '/auth')
              }}
              className="px-6 py-3 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all duration-200"
              aria-label="Get Started"
              tabIndex={0}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const featuresSection = document.getElementById('features')
                featuresSection?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-6 py-3 text-sm font-medium border-border dark:border-white/10 text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5 transition-all duration-200"
              aria-label="Learn More"
              tabIndex={0}
            >
              Learn More
            </Button>
          </div>

          {/* Storyboard Cards - Overlapping Style (Upgraded) */}
          <div className="relative max-w-7xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="group relative flex items-center justify-center min-h-[400px] sm:min-h-[500px] perspective-1500 transform-style-3d">
              {/* Left Card */}
              <div
                className="absolute left-0 w-[85%] sm:w-[36rem] rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 dark:border-white/10 bg-card/50 dark:bg-neutral-900/50 backdrop-blur-sm shadow-2xl opacity-80 translate-x-0 scale-95 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:-translate-x-8 sm:group-hover:-translate-x-20 group-hover:scale-90 hover:scale-100 cursor-pointer"
                style={{
                  aspectRatio: '16/9',
                  zIndex: 1,
                }}
              >
                <Image
                  src="/left card.webp"
                  alt="Opening Scene - Cinematic Style"
                  fill
                  className="object-cover transition-opacity duration-500"
                  sizes="(max-width: 768px) 85vw, 576px"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Center Main Card - Featured */}
              <div
                className="relative w-[90%] sm:w-full max-w-3xl rounded-xl sm:rounded-2xl overflow-hidden border border-border dark:border-white/20 bg-card/50 dark:bg-neutral-900/50 backdrop-blur-sm shadow-2xl shadow-violet-500/10 transition-all duration-700 ease-out group-hover:scale-105 hover:shadow-[0_25px_80px_-15px_rgba(139,92,246,0.3)] cursor-pointer"
                style={{
                  aspectRatio: '16/9',
                  zIndex: 3,
                }}
              >
                <Image
                  src="/middle card.webp"
                  alt="Main Scene - AI Generated"
                  fill
                  className="object-cover transition-opacity duration-500"
                  sizes="(max-width: 768px) 90vw, 768px"
                  unoptimized={true}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Right Card */}
              <div
                className="absolute right-0 w-[85%] sm:w-[36rem] rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 dark:border-white/10 bg-card/50 dark:bg-neutral-900/50 backdrop-blur-sm shadow-2xl opacity-80 translate-x-0 scale-95 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:translate-x-8 sm:group-hover:translate-x-20 group-hover:scale-90 hover:scale-100 cursor-pointer"
                style={{
                  aspectRatio: '16/9',
                  zIndex: 1,
                }}
              >
                <Image
                  src="/right card.webp"
                  alt="Action Scene - Watercolor Style"
                  fill
                  className="object-cover transition-opacity duration-500"
                  sizes="(max-width: 768px) 85vw, 576px"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Linear Style */}
      <section id="features" className="relative py-32 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground mb-6">
              Built for creative minds
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to transform ideas into visual stories
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent hover:border-border dark:hover:border-white/10 transition-all duration-300">
              <div className="mb-6 w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI-Powered Generation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Transform your script into stunning visual storyboards with advanced AI technology
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent hover:border-border dark:hover:border-white/10 transition-all duration-300">
              <div className="mb-6 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Film className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Cinematic Quality</h3>
              <p className="text-muted-foreground leading-relaxed">
                Professional-grade visuals that bring your creative vision to life instantly
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent hover:border-border dark:hover:border-white/10 transition-all duration-300">
              <div className="mb-6 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Create complete storyboards in minutes, not hours. Focus on creativity, not tedious
                work
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Linear Style */}
      <footer className="relative border-t border-border/50 dark:border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo & Copyright */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Image
                  src="/blooma_logo.svg"
                  alt="Blooma"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="text-sm font-medium text-foreground">Blooma</span>
              </div>
              <p className="text-sm text-muted-foreground">
                &copy; 2025 Blooma. All rights reserved.
              </p>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8">
              <a
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
