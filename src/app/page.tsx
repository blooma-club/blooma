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
  Wand2,
  Plus,
  X,
  Upload,
  FolderOpen
} from 'lucide-react'
import SiteFooter from '@/components/layout/footer'
import SiteNavbarSignedOut from '@/components/layout/SiteNavbarSignedOut'
import { useToast } from '@/components/ui/toast'
import { useUserCredits } from '@/hooks/useUserCredits'
import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ModelLibraryDropdown, { ModelLibraryAsset } from '@/components/storyboard/libraries/ModelLibraryDropdown'

export default function Home() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { openSignIn } = useClerk()
  const { push: showToast } = useToast()
  const { remaining: creditsRemaining, isLoading: creditsLoading } = useUserCredits()

  // Landing page interactive state
  const [modelImage, setModelImage] = useState<string | null>('/system-models/default_model_01.jpg')
  const [selectedModel, setSelectedModel] = useState<ModelLibraryAsset | null>({
    id: 'model-247',
    name: 'Model 247',
    subtitle: 'Virtual Face',
    imageUrl: '/system-models/default_model_01.jpg'
  })
  const [outfitImages, setOutfitImages] = useState<string[]>(['/bomber_jacket.png', '/pants.png'])
  const [detail, setDetail] = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const [isModelLibraryOpen, setIsModelLibraryOpen] = useState(false)
  const modelInputRef = useRef<HTMLInputElement>(null)
  const outfitInputRef = useRef<HTMLInputElement>(null)

  // Showcase Viewer State
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const views = [
    { label: 'Front', src: '/front-view-v2.png' },
    { label: 'Side', src: '/side-view-v2.png' },
    { label: '45° Angle', src: '/front-side-view-v2.png' },
    { label: 'Back', src: '/behind-view-v2.png' }
  ]

  // Auto-rotate viewer (optional, pauses on hover could be added later)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentViewIndex(prev => (prev + 1) % views.length)
    }, 4000) // Slower rotation for viewer
    return () => clearInterval(interval)
  }, [views.length])

  const handleModelSelect = (asset: ModelLibraryAsset) => {
    setSelectedModel(asset)
    setModelImage(asset.imageUrl)
    setIsModelLibraryOpen(false)
  }

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setModelImage(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const newUrl = URL.createObjectURL(file)
      setOutfitImages(prev => [...prev, newUrl])
    }
    e.target.value = ''
  }

  // Handle Get Started button click
  const handleGetStarted = () => {
    if (!isLoaded) return

    // Not logged in -> open sign in modal
    if (!user) {
      openSignIn({
        forceRedirectUrl: '/studio/create',
      })
      return
    }

    // Logged in but no credits -> redirect to pricing
    if (!creditsLoading && creditsRemaining <= 0) {
      router.push('/pricing')
      return
    }

    // Logged in with credits -> go to studio
    router.push('/studio/create')
  }

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
      // Since we can&apos;t easily persist the prompt across redirect without URL params or local storage,
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

  const handleCreateFrame = async () => { }



  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-neutral-500/20">
      <SiteNavbarSignedOut />

      {/* 
        --- HERO SECTION ---
        Minimal, Impactful, Carousel focused
      */}
      <section className="relative pt-20 pb-12 px-4 overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/[0.03] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-black/5 blur-[120px] rounded-full opacity-20 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-center mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 max-w-4xl mx-auto">
            <span className="block text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] text-foreground font-geist-sans">
              Create on-brand visuals.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
            Generate on-brand lookbooks with your models and outfits.
          </p>

          {/* Single Lookbook Image & Details */}
          <div className="relative max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            {/* Image */}
            <div className="relative aspect-[3/4] w-full rounded-sm overflow-hidden mb-8">
              <Image
                src="/front-view-v2.png"
                alt="Fashion Lookbook Style"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>

            {/* Details - Studio Style Horizontal */}
            <div className="flex items-start gap-10 justify-center">
              {/* Model */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">Model</p>
                {modelImage ? (
                  <div className="group relative">
                    <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-border/50">
                      <Image src={modelImage} alt="Model" fill className="object-cover" sizes="64px" />
                      <button
                        onClick={() => { setModelImage(null); setSelectedModel(null); }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <Popover open={isModelMenuOpen} onOpenChange={setIsModelMenuOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-16 aspect-[3/4] rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-1.5" align="start" sideOffset={8}>
                      <button
                        onClick={() => {
                          modelInputRef.current?.click()
                          setIsModelMenuOpen(false)
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                      >
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span>Upload</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsModelLibraryOpen(true)
                          setIsModelMenuOpen(false)
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                      >
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        <span>Library</span>
                      </button>
                    </PopoverContent>
                  </Popover>
                )}
                <input
                  ref={modelInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleModelUpload}
                />
                <div className="hidden">
                  <ModelLibraryDropdown
                    selectedAsset={selectedModel}
                    onSelect={handleModelSelect}
                    onClear={() => { setSelectedModel(null); setModelImage(null); }}
                    open={isModelLibraryOpen}
                    onOpenChange={setIsModelLibraryOpen}
                  />
                </div>
              </div>

              {/* Outfit */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">Outfit</p>
                <div className="flex gap-2">
                  {outfitImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden group ring-1 ring-border/50">
                      <Image src={img} alt={`Outfit ${idx + 1}`} fill className="object-cover" sizes="64px" />
                      <button
                        onClick={() => {
                          setOutfitImages(prev => prev.filter((_, i) => i !== idx))
                        }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ))}
                  {outfitImages.length < 2 && (
                    <label className="w-16 aspect-[3/4] rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                      <input
                        ref={outfitInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOutfitUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Detail */}
              <div className="flex-1 max-w-[160px]">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">Detail</p>
                {!isDetailOpen && !detail ? (
                  <button
                    onClick={() => setIsDetailOpen(true)}
                    className="w-full h-10 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all px-4"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add</span>
                  </button>
                ) : (
                  <Textarea
                    placeholder="Describe the style..."
                    className="min-h-[80px] resize-none bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-lg text-xs placeholder:text-muted-foreground/50"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    autoFocus
                    onBlur={() => !detail && setIsDetailOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center mt-10">
              <Button
                onClick={handleGetStarted}
                className="group relative h-10 px-6 pr-6 rounded-lg bg-foreground text-background font-medium transition-all duration-300 hover:bg-foreground/90 hover:scale-[1.02] hover:pr-10 overflow-hidden"
              >
                <span className="relative z-10 text-sm">Generate</span>
                <ArrowRight className="absolute right-3 w-4 h-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 
        --- VALUE PROP SECTION ---
        Why does this exist? Consistency.
      */}


      {/* 
        --- SHOWCASE SECTION ---
        1. Multi-view consistency
        2. Visual Hook / Editorial
      */}
      {/* 
        --- SHOWCASE SECTION ---
        Left: Thumbnails/Navigation, Right: Main Viewer
      */}
      <section className="py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-medium mb-6">Unlimited creative possibilities.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From technical product shots to high-end editorial campaigns.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 - Consistent Views (Navigation) */}
          <div className="relative rounded-3xl bg-white border border-neutral-200/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] p-8 flex flex-col transition-all duration-500 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)]">
            <div className="mb-8">
              <h3 className="text-2xl font-medium mb-3 text-neutral-900 font-geist-sans">Consistent Views</h3>
              <p className="text-neutral-500 leading-relaxed">
                Generate perfect front, side, and 45° angles. Maintain total consistency across every shot for your PDPs.
              </p>
            </div>

            {/* View Grid Visual (Clickable) */}
            <div className="flex-1 grid grid-cols-2 gap-4 relative">
              {views.map((view, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentViewIndex(index)}
                  className={`relative rounded-2xl overflow-hidden border aspect-[3/4] group/item transition-all duration-300 ${index === currentViewIndex
                    ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-md'
                    : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                >
                  <div className={`absolute top-3 left-3 z-10 px-2.5 py-1 backdrop-blur-md rounded-md text-[10px] font-medium transition-colors ${index === currentViewIndex
                    ? 'bg-neutral-900/90 text-white'
                    : 'bg-black/40 text-white'
                    }`}>
                    {view.label}
                  </div>
                  <Image
                    src={view.src}
                    alt={view.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/item:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {/* Active Indicator Overlay */}
                  {index !== currentViewIndex && (
                    <div className="absolute inset-0 bg-white/10 group-hover/item:bg-transparent transition-colors" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Card 2 - Main Viewer (Dynamic Image) */}
          <div className="relative rounded-3xl bg-white border border-neutral-200/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] p-3 flex flex-col group transition-all duration-500 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)]">

            {/* Image Container with Padding */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100">
              {views.map((view, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentViewIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <Image
                    src={view.src}
                    alt={view.label}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              ))}
            </div>

            {/* Viewer Info */}
            <div className="flex flex-col justify-between flex-1 px-5 pt-8 pb-6">
              <div>
                <h3 className="text-3xl font-medium mb-3 text-neutral-900 tracking-tight font-geist-sans">
                  {views[currentViewIndex].label}
                </h3>
                <p className="text-neutral-500 leading-relaxed text-base">
                  High-resolution, detail-rich generation ready for your catalog.
                </p>
              </div>

              <div className="flex gap-2 mt-8">
                {views.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentViewIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ease-out ${i === currentViewIndex
                      ? 'bg-neutral-900 w-12'
                      : 'bg-neutral-200 w-2 hover:bg-neutral-400'
                      }`}
                    aria-label={`Go to view ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        --- CTA SECTION ---
        Final push to start.
      */}
      <section className="relative py-32 px-4 overflow-hidden border-t border-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-8">
            Start your collection today.
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
            Join the fashion revolution. Create professional, on-brand lookbooks in minutes.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={handleGetStarted}
              className="h-12 px-8 rounded-xl bg-foreground text-background font-medium text-base transition-all duration-300 hover:bg-foreground/90 hover:scale-[1.02]"
            >
              Get Started for Free
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
