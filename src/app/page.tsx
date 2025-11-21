'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Sparkles, 
  Film, 
  Zap, 
  Share2, 
  Fingerprint,
  ArrowRight,
  Palette,
  Layers,
  Wand2
} from 'lucide-react'
import SiteFooter from '@/components/layout/footer'
import SiteNavbarSignedOut from '@/components/layout/SiteNavbarSignedOut'
import PromptDock from '@/components/storyboard/PromptDock'
import { useToast } from '@/components/ui/toast'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { openSignIn } = useClerk()
  const { push: showToast } = useToast()

  // Create a new project and navigate to its storyboard
  const createProjectAndNavigate = async (promptText?: string) => {
    if (!user?.id) {
      // This should be handled by handleBeforeSubmit, but double check
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
    if (!isLoaded) return false

    if (!user) {
      showToast({
        title: 'Sign in required',
        description: 'Please sign in to generate storyboard images.',
      })
      // Open sign in modal and redirect back to home (or dashboard after login)
      // Since we can't easily persist the prompt across redirect without URL params or local storage,
      // for now we just ask them to login.
      // Ideally: Redirect to dashboard or save prompt to localStorage.
      openSignIn({
        forceRedirectUrl: '/dashboard',
      })
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
        width: '65%',
        maxWidth: 'max-w-xl',
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
        width: '55%',
        maxWidth: 'sm:w-[24rem]',
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
        width: '55%',
        maxWidth: 'sm:w-[24rem]',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-115%) scale(0.85)',
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-violet-500/20">
      <SiteNavbarSignedOut />
      
      {/* 
        --- HERO SECTION ---
        Minimal, Impactful, Carousel focused
      */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/[0.03] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-violet-500/10 blur-[120px] rounded-full opacity-20 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-medium text-foreground/80 tracking-wide">
                AI Brand Studio
              </span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-center mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 max-w-4xl mx-auto">
            <span className="block text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight leading-[1.1] text-foreground font-geist-sans">
              Create on-brand visuals <br className="hidden sm:block"/> in seconds.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
            The first AI studio that understands your brand. <br className="hidden sm:block"/>
            Generate consistent storyboards, marketing assets, and concepts.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/dashboard">
              <Button size="lg" className="rounded-full px-8 py-6 text-base font-medium shadow-lg hover:shadow-violet-500/20 transition-all">
                Get Started 
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Storyboard Cards - Carousel Style */}
          <div className="relative max-w-6xl mx-auto px-4 mb-24 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <div className="group relative flex items-center justify-center min-h-[300px] sm:min-h-[400px] perspective-1500 transform-style-3d">
              {heroCards.map((card, index) => {
                const position = getCardPosition(index)
                const isActive = index === activeCardIndex

                return (
                  <div
                    key={index}
                    onClick={() => setActiveCardIndex(index)}
                    className={`absolute rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer ${
                      isActive
                        ? 'border-border dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/50'
                        : 'border-border/50 dark:border-white/5 opacity-50 hover:opacity-70'
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
                      transition: 'all 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
                    <Image
                      src={card.src}
                      alt={card.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 800px"
                      priority={isActive}
                    />
                    
                    {/* Optional: Card Overlay for inactive */}
                    {!isActive && <div className="absolute inset-0 bg-background/10 backdrop-blur-[1px]" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 
        --- VALUE PROP SECTION ---
        Why does this exist? Consistency.
      */}
      <section className="py-24 px-4 border-t border-border/40 bg-muted/30 dark:bg-neutral-950/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 text-violet-600 dark:text-violet-400 font-medium text-sm tracking-wide uppercase">
                <Fingerprint className="w-4 h-4" />
                <span>Brand Consistency</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-foreground mb-6 tracking-tight">
                Your brand DNA, <br/> embedded in AI.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Stop struggling with random, inconsistent AI generations. Blooma allows you to define your brand's look, feel, and characters once, and generate infinite on-brand assets.
              </p>
              
              <div className="flex flex-col gap-4">
                {[
                  { icon: Palette, text: "Consistent Color Grading & Style" },
                  { icon: Layers, text: "Recurring Characters & Consistency" },
                  { icon: Zap, text: "Instant Style Replication" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-foreground/80 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Visual Representation of Consistency */}
            <div className="relative rounded-3xl overflow-hidden border border-border/60 bg-card shadow-xl aspect-square sm:aspect-[4/3] group">
               {/* Background Grid */}
               <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
               
               <div className="absolute inset-0 p-8 flex flex-col">
                 {/* "Brand Kit" UI Simulation */}
                 <div className="w-full bg-background/80 backdrop-blur-md border border-border rounded-xl p-4 mb-6 shadow-sm z-10">
                   <div className="flex items-center justify-between mb-4">
                     <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Kit</span>
                     <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                   </div>
                   
                   <div className="space-y-3">
                     {/* Palette */}
                     <div className="flex items-center gap-3">
                       <span className="text-xs text-muted-foreground w-12">Palette</span>
                       <div className="flex gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#E8DCCA] ring-1 ring-black/5" title="Warm Beige" />
                          <div className="w-6 h-6 rounded-full bg-[#2A2A2A] ring-1 ring-white/10" title="Matte Black" />
                          <div className="w-6 h-6 rounded-full bg-[#C8553D] ring-1 ring-black/5" title="Burnt Orange" />
                       </div>
                     </div>
                     
                     {/* Style */}
                     <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12">Style</span>
                        <div className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-foreground">
                          Cinematic Minimalist
                        </div>
                     </div>
                   </div>
                 </div>

                 {/* Generated Images Grid Simulation */}
                 <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 w-full h-full relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 border border-border/50">
                      <Image src="/left card.webp" alt="Brand Asset 1" fill className="object-cover opacity-90 hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 w-full h-full relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 delay-75 border border-border/50">
                      <Image src="/middle card.webp" alt="Brand Asset 2" fill className="object-cover opacity-90 hover:opacity-100 transition-opacity" />
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        --- FEATURES BENTO GRID ---
        Minimal cards, clear benefits.
      */}
      <section className="py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium mb-6">Everything you need to create.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From simple idea exploration to final production assets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large Card - Storyboarding */}
          <div className="md:col-span-2 relative rounded-3xl overflow-hidden bg-neutral-50 dark:bg-neutral-900/50 border border-border/50 p-8 min-h-[320px] flex flex-col justify-between group hover:border-border/80 transition-colors">
             <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             
             <div className="relative z-10">
               <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center mb-6 text-foreground shadow-sm">
                 <Film className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-medium mb-3">AI Storyboarding</h3>
               <p className="text-muted-foreground max-w-md leading-relaxed">
                 Visualize video concepts scene by scene. Maintain character consistency across every shot.
               </p>
             </div>

             {/* Film Strip Visual */}
             <div className="mt-8 relative -mx-8 mb-[-2rem] overflow-hidden">
               <div className="flex gap-4 px-8 animate-in slide-in-from-right-10 duration-1000 fade-in">
                 {[
                   { img: '/left card.webp', num: '01' },
                   { img: '/middle card.webp', num: '02' },
                   { img: '/right card.webp', num: '03' }
                 ].map((item, i) => (
                   <div key={i} className="flex-shrink-0 w-48 aspect-video rounded-lg border border-border/50 bg-background relative overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                     <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] font-mono text-white">
                       SCENE {item.num}
                     </div>
                     <Image src={item.img} alt={`Scene ${item.num}`} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   </div>
                 ))}
               </div>
             </div>
          </div>

          {/* Tall Card - Assets */}
          <div className="md:row-span-2 relative rounded-3xl overflow-hidden bg-neutral-50 dark:bg-neutral-900/50 border border-border/50 p-8 flex flex-col group hover:border-border/80 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center mb-6 text-foreground shadow-sm">
                 <Wand2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-medium mb-3">Marketing Assets</h3>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Create high-converting visuals for social media, ads, and landing pages in any aspect ratio.
            </p>
            
            {/* Assets Stack Visual */}
            <div className="flex-1 relative w-full min-h-[200px]">
               {/* Portrait */}
               <div className="absolute bottom-0 right-0 w-32 h-48 bg-background border border-border rounded-lg shadow-lg rotate-6 z-10 overflow-hidden hover:rotate-0 hover:scale-105 transition-all duration-300 origin-bottom-right">
                 <Image src="/middle card.webp" alt="Portrait" fill className="object-cover" />
               </div>
               {/* Square */}
               <div className="absolute bottom-8 left-4 w-36 h-36 bg-background border border-border rounded-lg shadow-lg -rotate-3 z-20 overflow-hidden hover:rotate-0 hover:scale-105 transition-all duration-300 origin-bottom-left">
                 <Image src="/left card.webp" alt="Square" fill className="object-cover" />
               </div>
               {/* Landscape */}
               <div className="absolute top-8 right-8 w-40 h-24 bg-background border border-border rounded-lg shadow-lg rotate-2 z-0 overflow-hidden opacity-80">
                 <Image src="/right card.webp" alt="Landscape" fill className="object-cover" />
               </div>
            </div>
          </div>

           {/* Small Card - Speed */}
           <div className="relative rounded-3xl overflow-hidden bg-neutral-50 dark:bg-neutral-900/50 border border-border/50 p-8 flex flex-col justify-between group hover:border-border/80 transition-colors">
             <div>
               <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center mb-6 text-foreground shadow-sm">
                 <Zap className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-medium mb-2">Lightning Fast</h3>
               <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                 Generate assets in seconds, not hours.
               </p>
               {/* Speed Bar */}
               <div className="w-full h-1.5 bg-border/30 rounded-full overflow-hidden">
                 <div className="h-full bg-violet-500 w-3/4 rounded-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: '85%' }} />
               </div>
             </div>
          </div>

          {/* Small Card - Export */}
          <div className="relative rounded-3xl overflow-hidden bg-neutral-50 dark:bg-neutral-900/50 border border-border/50 p-8 flex flex-col justify-between group hover:border-border/80 transition-colors">
             <div>
               <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center mb-6 text-foreground shadow-sm">
                 <Share2 className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-medium mb-2">Easy Export</h3>
               <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                 Export directly to your favorite tools.
               </p>
               <div className="flex gap-2">
                 {['PNG', 'JPG', 'MP4'].map(ext => (
                   <div key={ext} className="px-2 py-1 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">
                     .{ext}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* 
        --- CTA / DEMO SECTION ---
        Try it yourself.
      */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-violet-500/5 pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-8">
            Ready to start?
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
            Enter a prompt below to generate your first storyboard frame. No credit card required to start.
          </p>

          {/* Integrated PromptDock */}
          <div className="relative w-full max-w-2xl mx-auto min-h-[200px]">
             <PromptDock
                projectId="landing"
                onCreateFrame={handleCreateFrame}
                onBeforeSubmit={handleBeforeSubmit}
                mode="generate"
                className="!relative !bottom-auto !left-auto !translate-x-0 !w-full !max-w-full shadow-2xl rounded-2xl"
              />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
