'use client'

import React from 'react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { getImageGenerationModels, getModelInfo } from '@/lib/fal-ai'

type Character = {
  id: string
  imageUrl?: string
}

type Props = {
  script: string
  characters: Character[]
  // navigation/actions
  onBack?: () => void
  onEditScript?: () => void
  onEditCharacters?: () => void
  onGenerateStoryboard?: () => void
  generating?: boolean
  // visual settings
  selectedModel: string
  setSelectedModel: (s: string) => void
  ratio: '16:9' | '1:1' | '9:16'
  setRatio: (r: '16:9' | '1:1' | '9:16') => void
  visualStyle: string
  onOpenStyleGallery: () => void
}

export default function PreviewPanel({ script, characters, onBack, onEditScript, onEditCharacters, onGenerateStoryboard, generating, selectedModel, setSelectedModel, ratio, setRatio, visualStyle, onOpenStyleGallery }: Props) {
  const stylePresets: { id: string; label: string; img: string }[] = [
    { id: 'photo', label: 'Photo realistic', img: '/styles/photo.jpg' },
    { id: 'cinematic', label: 'Cinematic', img: '/styles/cinematic.jpg' },
    { id: 'watercolor', label: 'Watercolor', img: '/styles/watercolor.jpg' },
    { id: 'lineart', label: 'Line Art', img: '/styles/lineart.jpg' },
    { id: 'pixel', label: 'Pixel', img: '/styles/pixel.jpg' },
  ]

  const selectedStyle = stylePresets.find(s => s.id === visualStyle)

  return (
    <div className="space-y-6">
      {/* Top row: Left script preview + characters, Right visual settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Script Preview */}
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Script Preview</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onEditScript} className="text-xs text-neutral-300 underline">Edit Script</button>
              </div>
            </div>
            <div className="min-h-[420px] max-h-[60vh] overflow-auto p-3 border border-neutral-700 rounded-md bg-neutral-900 text-sm whitespace-pre-wrap text-white" aria-label="Script content" tabIndex={0}>
              {script?.trim() ? script : 'No script yet.'}
            </div>
          </div>

          {/* Characters */}
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Characters</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onEditCharacters} className="text-xs text-neutral-300 underline">Edit Characters</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {characters && characters.length > 0 ? (
                characters.map((ch, idx) => (
                  <div key={ch.id || idx} className="rounded-md border border-neutral-800 overflow-hidden bg-neutral-950">
                    <div className="relative w-full aspect-[2/3]">
                      {ch.imageUrl ? (
                        <Image src={ch.imageUrl} alt={`character-${idx}`} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">No image</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-xs text-neutral-400">No characters yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Visual Settings</h3>
          </div>
          <div className="space-y-6 text-[13px]">
            {/* Model */}
            <section>
              <div className="font-medium mb-2 flex items-center justify-between">
                <span className="text-neutral-300">AI Model</span>
                <span className="text-xs text-neutral-400 font-normal">{getModelInfo(selectedModel)?.cost || 0} credits</span>
              </div>
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
                  <DropdownMenuLabel className="text-xs font-semibold text-neutral-300 px-4 py-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">Select AI Model</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={selectedModel} onValueChange={setSelectedModel}>
                    {getImageGenerationModels().filter(model => !model.id.includes('imagen')).map((model) => (
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
            </section>

            {/* Aspect Ratio */}
            <section>
              <div className="font-medium mb-2 flex items-center justify-between">
                <span className="text-neutral-300">Aspect Ratio</span>
              </div>
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
                  <DropdownMenuLabel className="text-xs font-semibold text-neutral-300 px-4 py-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">Select Aspect Ratio</DropdownMenuLabel>
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
            </section>

            {/* Visual Style */}
            <section>
              <div className="font-medium mb-2 flex items-center justify-between">
                <span className="text-neutral-300">Visual Style</span>
                <button type="button" className="text-xs text-neutral-300 underline" onClick={onOpenStyleGallery}>Change</button>
              </div>
              <button type="button" onClick={onOpenStyleGallery} className="group relative flex flex-col rounded-lg overflow-hidden border border-neutral-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition w-full">
                <div className="aspect-[4/3] w-full bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-300">
                  <Image src={selectedStyle?.img || '/styles/photo.jpg'} alt={selectedStyle?.label || 'Selected style'} fill className="object-cover" />
                  <span className="relative z-10 bg-black/60 text-white px-1 rounded-sm">Selected</span>
                </div>
                <div className="px-2 py-1.5 text-xs font-medium flex items-center gap-1 bg-black text-white relative">{selectedStyle?.label || 'Photo realistic'}</div>
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="h-11 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-md px-4">Back</button>
        <button type="button" onClick={onGenerateStoryboard} disabled={generating || !script?.trim() || characters.length === 0} className="h-11 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 border border-neutral-700 text-white rounded-md px-4">{generating ? 'Generating Storyboard…' : 'Generate Storyboard'}</button>
      </div>
    </div>
  )
}
