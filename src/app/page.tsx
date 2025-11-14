'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useUser, useClerk, SignInButton } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { Sparkles, Film, Zap } from 'lucide-react'
import SiteFooter from '@/components/layout/footer'
import SiteNavbarSignedOut from '@/components/layout/SiteNavbarSignedOut'
import PromptDock from '@/components/storyboard/PromptDock'
import { useToast } from '@/components/ui/toast'
import { useState } from 'react'

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

const FALLBACK_OPEN_SIGN_IN: NonNullable<ReturnType<typeof useClerk>['openSignIn']> = async () => {
  if (process.env.NODE_ENV !== 'production' && !warnedAboutMissingClerk) {
    console.warn(
      '[clerk] openSignIn called without a configured ClerkProvider. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.'
    )
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

function useOptionalOpenSignIn() {
  try {
    const { openSignIn } = useClerk()
    return openSignIn ?? FALLBACK_OPEN_SIGN_IN
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !warnedAboutMissingClerk) {
      console.warn(
        '[clerk] Falling back to a noop openSignIn because ClerkProvider is not available. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.',
        error
      )
      warnedAboutMissingClerk = true
    }
    return FALLBACK_OPEN_SIGN_IN
  }
}

export default function Home() {
  const router = useRouter()
  const { user, isLoaded } = useOptionalUser() as ReturnType<typeof useUser>
  const signOut = useOptionalSignOut()
  const openSignIn = useOptionalOpenSignIn()
  const { push: showToast } = useToast()

  // Create a new project and navigate to its storyboard
  const createProjectAndNavigate = async (promptText?: string) => {
    if (!user?.id) {
      showToast({
        title: 'Sign in required',
        description: 'Please sign in to generate storyboard images.',
      })
      return null
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Project',
          description: '',
          is_public: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error?.message || 'Unable to create project.')
      }

      const result = await response.json()
      const projectId = result?.data?.id

      if (!projectId) {
        throw new Error('Missing project identifier.')
      }

      // Navigate to storyboard page with optional prompt parameter
      const url = promptText
        ? `/project/${projectId}/storyboard?autoGenerate=true&prompt=${encodeURIComponent(promptText)}`
        : `/project/${projectId}/storyboard`
      router.push(url)
      return projectId
    } catch (error) {
      console.error('[Landing] Failed to create project:', error)
      showToast({
        title: 'Project creation failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      })
      return null
    }
  }

  // Handle landing prompt submission before image generation
  const handleBeforeSubmit = async (promptText: string): Promise<boolean> => {
    if (!user || !isLoaded) {
      showToast({
        title: 'Sign in required',
        description: 'Please sign in to generate storyboard images.',
      })
      await openSignIn()
      return false
    }

    // Create project and navigate (actual generation happens on storyboard page)
    await createProjectAndNavigate(promptText)
    return false
  }

  const handleCreateFrame = async () => {}

  // Carousel state for hero cards
  const [activeCardIndex, setActiveCardIndex] = useState(1) // Start with center card (index 1)

  const heroCards = [
    {
      src: '/left card.webp',
      alt: 'On-brand mood board — cinematic style',
    },
    {
      src: '/middle card.webp',
      alt: 'AI Studio output — dramatic portrait with high contrast lighting',
    },
    {
      src: '/right card.webp',
      alt: 'On-brand variation — watercolor style',
    },
  ]

  const getCardPosition = (index: number) => {
    const total = heroCards.length
    // Calculate relative position: 0 = active (center), 1 = next (right), 2 = prev (left)
    const relativeIndex = (index - activeCardIndex + total) % total

    if (relativeIndex === 0) {
      // Active card (center)
      return {
        zIndex: 3,
        opacity: 1,
        scale: 1,
        width: '70%',
        maxWidth: 'max-w-2xl',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%) scale(1)',
      }
    } else if (relativeIndex === 1) {
      // Next card (right side) - symmetric with left
      return {
        zIndex: 2,
        opacity: 0.9,
        scale: 0.85,
        width: '60%',
        maxWidth: 'sm:w-[28rem]',
        left: '50%',
        right: 'auto',
        transform: 'translateX(15%) scale(0.85)',
      }
    } else {
      // Previous card (left side) - symmetric with right
      return {
        zIndex: 2,
        opacity: 0.9,
        scale: 0.85,
        width: '60%',
        maxWidth: 'sm:w-[28rem]',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-115%) scale(0.85)',
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header - Linear Style: Fixed, Transparent with Blur */}
      <SiteNavbarSignedOut />
      {/* Hero Section - Linear Style */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/5 dark:via-violet-950/5 to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-sm">
              <span className="text-sm font-medium text-foreground/80">
                Introducing AI Brand Studio
              </span>
            </div>
          </div>

          {/* Main Heading - Gradient Text */}
          <h1 className="text-center mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.2] text-foreground font-geist-sans">
              Your AI Studio is here.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            From concept to on-brand visuals in minutes — consistent, fast, and collaborative.
          </p>

          {/* CTA Buttons - Smaller Size */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            {!user ? (
              <SignInButton mode="modal" signUpForceRedirectUrl="/dashboard">
                <Button
                  variant="ghost"
                  className="px-6 py-3 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all duration-200"
                  aria-label="Login"
                  tabIndex={0}
                >
                  Get Started
                </Button>
              </SignInButton>
            ) : (
              <Button
                onClick={() => {
                  if (!isLoaded) return
                  router.push('/dashboard')
                }}
                className="px-6 py-3 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all duration-200"
                aria-label="Get Started"
                tabIndex={0}
              >
                Get Started
              </Button>
            )}
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

          {/* Storyboard Cards - Carousel Style */}
          <div className="relative max-w-6xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="group relative flex items-center justify-center min-h-[350px] sm:min-h-[400px] perspective-1500 transform-style-3d">
              {heroCards.map((card, index) => {
                const position = getCardPosition(index)
                const isActive = index === activeCardIndex

                return (
                  <div
                    key={index}
                    onClick={() => setActiveCardIndex(index)}
                    className={`absolute rounded-xl sm:rounded-2xl overflow-hidden border bg-card/50 dark:bg-neutral-900/50 backdrop-blur-sm shadow-2xl cursor-pointer ${
                      isActive
                        ? 'border-border dark:border-white/20 shadow-violet-500/10'
                        : 'border-border/50 dark:border-white/10'
                    }`}
                    style={{
                      aspectRatio: '16/9',
                      zIndex: position.zIndex,
                      opacity: position.opacity,
                      transform: position.transform,
                      width: position.width,
                      maxWidth: position.maxWidth === 'max-w-2xl' ? '100%' : undefined,
                      left: position.left,
                      right: position.right,
                      transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1), opacity 800ms cubic-bezier(0.4, 0, 0.2, 1), width 800ms cubic-bezier(0.4, 0, 0.2, 1), left 800ms cubic-bezier(0.4, 0, 0.2, 1), right 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <Image
                      src={card.src}
                      alt={card.alt}
                      fill
                      className="object-cover transition-opacity duration-800 ease-in-out"
                      style={{
                        opacity: isActive ? 1 : 0.95,
                      }}
                      sizes={
                        isActive
                          ? '(max-width: 768px) 70vw, 640px'
                          : '(max-width: 768px) 60vw, 448px'
                      }
                      unoptimized={true}
                      priority={isActive}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground mb-2">Studio-ready workflows</p>
            <h3 className="text-3xl sm:text-4xl font-semibold text-foreground">Use cases that plug into any brand brief</h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-3">
              From campaign ideation to final assets, AI Studio keeps every visual aligned with brand DNA while letting teams experiment fast.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Launch hero visuals',
                description: 'Generate cinematic hero frames, product highlights, and cover art that match campaign guidelines.',
                detail: '16:9 / 4K / mood-driven lighting',
              },
              {
                title: 'Storyboard direction',
                description: 'Build multi-format narratives with consistent framing, angles, and talking points for every shot.',
                detail: 'Shot list + preset camera setups',
              },
              {
                title: 'Multi-format refresh',
                description: 'Deliver stills, banners, and vertical cuts from one prompt, with quick style swaps.',
                detail: 'Photo + stylized + minimalist variants',
              },
            ].map(useCase => (
              <div
                key={useCase.title}
                className="relative rounded-2xl border border-border/60 bg-card/80 dark:bg-neutral-900/40 p-6 shadow-sm shadow-violet-500/5 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20"
              >
                <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">{useCase.detail}</div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{useCase.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Linear Style */}
      <section id="features" className="relative py-32 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground mb-6">
              Built for brand teams
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to transform ideas into on-brand content
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent hover:border-border dark:hover:border-white/10 transition-all duration-300">
              <h3 className="text-xl font-semibold text-foreground mb-3">On‑Brand Consistency</h3>
              <p className="text-muted-foreground leading-relaxed">
                Define brand styles once. Generate visuals that always stay on brand.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent hover:border-border dark:hover:border-white/10 transition-all duration-300">
              <h3 className="text-xl font-semibold text-foreground mb-3">Multi‑format Studio</h3>
              <p className="text-muted-foreground leading-relaxed">
                Images, storyboards, and short clips — all from a single prompt.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent hover:border-border dark:hover:border-white/10 transition-all duration-300">
              <h3 className="text-xl font-semibold text-foreground mb-3">Lightning‑Fast Workflow</h3>
              <p className="text-muted-foreground leading-relaxed">
                Go from idea to production‑ready assets in minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PromptDock for Landing Page */}
      <PromptDock
        projectId="landing"
        onCreateFrame={handleCreateFrame}
        onBeforeSubmit={handleBeforeSubmit}
        mode="generate"
        className=""
      />

      <SiteFooter />
    </div>
  )
}
