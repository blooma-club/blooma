'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import { Sparkles, Film, Zap } from 'lucide-react'
import SiteNavbarSignedOut from '@/components/layout/SiteNavbarSignedOut'
import SiteFooter from '@/components/layout/footer'

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

export default function Home() {
  const router = useRouter()
  const { user, isLoaded } = useOptionalUser() as ReturnType<typeof useUser>

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      {/* Header - Linear Style: Fixed, Transparent with Blur */}
      <SiteNavbarSignedOut />
      {/* Hero Section - Linear Style */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/5 to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-sm font-medium text-neutral-300">
                Introducing AI Storyboard
              </span>
            </div>
          </div>

          {/* Main Heading - Gradient Text with Instrument Serif */}
          <h1 className="text-center mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-[110px] font-regular tracking-tight leading-[1.1] font-instrument-serif bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
              Now, you are a director
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Create stunning storyboards with AI. From script to visual narrative in minutes.
          </p>

          {/* CTA Buttons - Smaller Size */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Button
              onClick={() => {
                if (!isLoaded) return
                router.push(user ? '/dashboard' : '/auth')
              }}
              className="px-6 py-3 text-sm font-medium bg-white text-black hover:bg-white/90 transition-all duration-200"
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
              className="px-6 py-3 text-sm font-medium border-white/10 text-white hover:bg-white/5 transition-all duration-200"
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
                className="absolute left-0 w-[85%] sm:w-[36rem] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50 backdrop-blur-sm shadow-2xl opacity-80 translate-x-0 scale-95 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:-translate-x-8 sm:group-hover:-translate-x-20 group-hover:scale-90 hover:scale-100 cursor-pointer"
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
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Center Main Card - Featured */}
              <div
                className="relative w-[90%] sm:w-full max-w-3xl rounded-xl sm:rounded-2xl overflow-hidden border border-white/20 bg-neutral-900/50 backdrop-blur-sm shadow-2xl shadow-violet-500/10 transition-all duration-700 ease-out group-hover:scale-105 hover:shadow-[0_25px_80px_-15px_rgba(139,92,246,0.3)] cursor-pointer"
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
                  priority
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Right Card */}
              <div
                className="absolute right-0 w-[85%] sm:w-[36rem] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50 backdrop-blur-sm shadow-2xl opacity-80 translate-x-0 scale-95 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:translate-x-8 sm:group-hover:translate-x-20 group-hover:scale-90 hover:scale-100 cursor-pointer"
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
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6">
              Built for creative minds
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Everything you need to transform ideas into visual stories
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/10 transition-all duration-300">
              <div className="mb-6 w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Generation</h3>
              <p className="text-neutral-400 leading-relaxed">
                Transform your script into stunning visual storyboards with advanced AI technology
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/10 transition-all duration-300">
              <div className="mb-6 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Film className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Cinematic Quality</h3>
              <p className="text-neutral-400 leading-relaxed">
                Professional-grade visuals that bring your creative vision to life instantly
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/10 transition-all duration-300">
              <div className="mb-6 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Lightning Fast</h3>
              <p className="text-neutral-400 leading-relaxed">
                Create complete storyboards in minutes, not hours. Focus on creativity, not tedious
                work
              </p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
