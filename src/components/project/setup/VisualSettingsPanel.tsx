'use client'

import React from 'react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { getImageGenerationModels, getModelInfo, type FalAIModel } from '@/lib/fal-ai'

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
  setVisualStyle?: (s: string) => void
}

export default function VisualSettingsPanel({ selectedModel, setSelectedModel, modelOptions, showModel = true, showAspect = true, showStyle = true, panelTitle = 'Visual Settings', modelSectionTitle = 'AI Model', modelDropdownTitle = 'Select AI Model', aspectSectionTitle = 'Aspect Ratio', aspectDropdownTitle = 'Select Aspect Ratio', styleSectionTitle = 'Visual Style', frameless = false, ratio, setRatio, visualStyle, setVisualStyle }: Props) {
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
              <span className="text-neutral-300">{modelSectionTitle}</span>
              <span className="text-xs text-neutral-400 font-normal">{getModelInfo(selectedModel)?.cost || 0} credits</span>
            </div>
            <div className="space-y-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200 inline-flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                      <span className="font-medium text-sm">{getModelInfo(selectedModel)?.name || 'Select Model'}</span>
                    </div>
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-300 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={4} className="w-64 border border-neutral-700 bg-neutral-900 shadow-xl rounded-lg">
                  <DropdownMenuLabel className="text-xs font-semibold text-neutral-300 px-4 py-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">{modelDropdownTitle}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={selectedModel} onValueChange={setSelectedModel}>
                  {models.map((model) => (
                    <DropdownMenuRadioItem key={model.id} value={model.id} className="px-4 py-3 hover:bg-neutral-800 cursor-pointer text-white border-b border-neutral-700 last:border-b-0 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                        <span className="font-medium text-sm">{model.name}</span>
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
              <span className="text-neutral-300">{aspectSectionTitle}</span>
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200 inline-flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                      <span className="font-medium text-sm">{ratio}</span>
                    </div>
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-300 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={4} className="w-48 border border-neutral-700 bg-neutral-900 shadow-xl rounded-lg">
                  <DropdownMenuLabel className="text-xs font-semibold text-neutral-300 px-4 py-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">{aspectDropdownTitle}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={ratio} onValueChange={(v) => setRatio(v as any)}>
                    {(['16:9','1:1','9:16'] as const).map(r => (
                      <DropdownMenuRadioItem key={r} value={r} className="px-4 py-3 hover:bg-neutral-800 cursor-pointer text-white border-b border-neutral-700 last:border-b-0 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                          <span className="font-medium text-sm">{r}</span>
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
            <div className="font-medium mb-2 flex items-center justify-between"><span className="text-neutral-300">{styleSectionTitle}</span></div>
            <button type="button" className="group relative flex flex-col rounded-lg overflow-hidden border border-neutral-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition w-full">
              <div className="aspect-[4/3] w-full bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-300">
                <Image src={stylePresets.find(s=>s.id===visualStyle)?.img || '/styles/photo.jpg'} alt={stylePresets.find(s=>s.id===visualStyle)?.label || 'Selected style'} fill className="object-cover" />
                <span className="relative z-10 bg-black/60 text-white px-1 rounded-sm">Selected</span>
              </div>
              <div className="px-2 py-1.5 text-xs font-medium flex items-center gap-1 bg-black text-white relative">{stylePresets.find(s=>s.id===visualStyle)?.label}</div>
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
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6 md:p-7 flex flex-col overflow-hidden">
        <h3 className="text-sm font-semibold text-white mb-4">{panelTitle}</h3>
        {inner}
      </div>
    </div>
  )
}


