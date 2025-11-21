'use client'

import React from 'react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { getImageGenerationModels, getModelInfo, type FalAIModel } from '@/lib/fal-ai'

const aspectOptions = ['16:9', '1:1', '9:16'] as const
type AspectRatioOption = (typeof aspectOptions)[number]

type Props = {
  // Model
  selectedModel: string
  setSelectedModel: (s: string) => void
  modelOptions?: FalAIModel[]
  // Optional sections
  showModel?: boolean
  showAspect?: boolean
  showStyle?: boolean
  // Titles / Labels
  panelTitle?: string
  modelSectionTitle?: string
  modelDropdownTitle?: string
  aspectSectionTitle?: string
  aspectDropdownTitle?: string
  styleSectionTitle?: string
  frameless?: boolean
  // Aspect
  ratio?: '16:9' | '1:1' | '9:16'
  setRatio?: (r: '16:9' | '1:1' | '9:16') => void
  // Style
  visualStyle?: string
}

export default function VisualSettingsPanel({ selectedModel, setSelectedModel, modelOptions, showModel = false, showAspect = true, showStyle = true, panelTitle = 'Visual Settings', modelSectionTitle = 'AI Model', modelDropdownTitle = 'Select AI Model', aspectSectionTitle = 'Aspect Ratio', aspectDropdownTitle = 'Select Aspect Ratio', styleSectionTitle = 'Visual Style', frameless = false, ratio, setRatio, visualStyle }: Props) {
  const stylePresets: { id: string; label: string; img: string; desc: string }[] = [
    { id: 'photo', label: 'Photo realistic', img: '/styles/photo.jpg', desc: 'Photorealistic imagery' },
    { id: 'cinematic', label: 'Cinematic', img: '/styles/cinematic.jpg', desc: 'Film-like lighting & depth' },
    { id: 'watercolor', label: 'Watercolor', img: '/styles/watercolor.jpg', desc: 'Soft pigment wash' },
    { id: 'lineart', label: 'Line Art', img: '/styles/lineart.jpg', desc: 'Clean monochrome lines' },
    { id: 'pixel', label: 'Pixel', img: '/styles/pixel.jpg', desc: 'Retro low-res charm' },
  ]
  const models = modelOptions && modelOptions.length > 0 ? modelOptions : getImageGenerationModels().filter(model => !model.id.includes('imagen'))

  const inner = (
    <div className="flex-1 pr-1 space-y-6 text-[13px]">
          {showModel && (
          <section>
            <div className="font-medium mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{modelSectionTitle}</span>
            </div>
            <div className="space-y-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-background/50 text-foreground hover:bg-violet-500/5 hover:border-violet-500/20 transition-all duration-200 inline-flex items-center justify-between group shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
                      <span className="font-medium text-sm">{getModelInfo(selectedModel)?.name || 'Select Model'}</span>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={4} className="w-64 border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl rounded-xl p-1">
                  <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-widest border-b border-border/30 mb-1">{modelDropdownTitle}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={selectedModel} onValueChange={setSelectedModel}>
                  {models.map((model) => (
                    <DropdownMenuRadioItem key={model.id} value={model.id} className="rounded-lg px-2.5 py-2 cursor-pointer text-foreground focus:bg-violet-500/10 focus:text-violet-600 dark:focus:text-violet-300 transition-colors my-0.5 border-0">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-1.5 h-1.5 rounded-full transition-colors", selectedModel === model.id ? "bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" : "bg-muted-foreground/30")}></div>
                        <span className={clsx("font-medium text-xs", selectedModel === model.id && "text-violet-600 dark:text-violet-300")}>{model.name}</span>
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>
          )}

          {showAspect && ratio && setRatio && (
          <section>
            <div className="font-medium mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{aspectSectionTitle}</span>
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-background/50 text-foreground hover:bg-violet-500/5 hover:border-violet-500/20 transition-all duration-200 inline-flex items-center justify-between group shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-violet-500/50"></div>
                      <span className="font-medium text-sm">{ratio}</span>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={4} className="w-48 border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl rounded-xl p-1">
                  <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-widest border-b border-border/30 mb-1">{aspectDropdownTitle}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={ratio}
                    onValueChange={value => {
                      const nextRatio = aspectOptions.find(option => option === value) as AspectRatioOption | undefined
                      if (nextRatio) {
                        setRatio(nextRatio)
                      }
                    }}
                  >
                    {aspectOptions.map(r => (
                      <DropdownMenuRadioItem key={r} value={r} className="rounded-lg px-2.5 py-2 cursor-pointer text-foreground focus:bg-violet-500/10 focus:text-violet-600 dark:focus:text-violet-300 transition-colors my-0.5 border-0">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-1.5 h-1.5 rounded-full transition-colors", ratio === r ? "bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" : "bg-muted-foreground/30")}></div>
                          <span className={clsx("font-medium text-xs", ratio === r && "text-violet-600 dark:text-violet-300")}>{r}</span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>
          )}

          {showStyle && visualStyle && (
          <section>
            <div className="font-medium mb-2 flex items-center justify-between"><span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{styleSectionTitle}</span></div>
            <button type="button" className="group relative flex flex-col rounded-xl overflow-hidden border border-border/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20 transition w-full shadow-sm hover:shadow-md hover:border-violet-500/30 hover:scale-[1.02] duration-300">
              <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground relative">
                <Image src={stylePresets.find(s=>s.id===visualStyle)?.img || '/styles/photo.jpg'} alt={stylePresets.find(s=>s.id===visualStyle)?.label || 'Selected style'} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <span className="absolute top-2 right-2 z-10 bg-violet-500/90 backdrop-blur-md text-white px-1.5 py-0.5 rounded text-[9px] font-semibold shadow-sm">Selected</span>
              </div>
              <div className="px-3 py-2 text-xs font-medium flex items-center gap-1.5 bg-background/80 backdrop-blur-md text-foreground border-t border-border/10">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                {stylePresets.find(s=>s.id===visualStyle)?.label}
              </div>
            </button>
          </section>
          )}
    </div>
  )

  if (frameless) {
    return inner
  }

  return (
    <div className="lg:col-span-1 flex flex-col gap-4">
      <div className="rounded-2xl bg-background/60 border border-border/40 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] backdrop-blur-xl p-5 md:p-6 flex flex-col overflow-hidden">
        <h3 className="text-sm font-bold text-foreground mb-5 uppercase tracking-wide">{panelTitle}</h3>
        {inner}
      </div>
    </div>
  )
}

