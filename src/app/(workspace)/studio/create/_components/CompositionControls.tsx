'use client'

import Image from 'next/image'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccordionContent, AccordionTrigger } from '@/components/ui/accordion'

interface CompositionPreset {
  id: string
  label: string
  title: string
  prompt: string
  image?: string
}

interface CompositionControlsProps {
  presets: CompositionPreset[]
  selectedPreset: CompositionPreset
  setSelectedPreset: (preset: CompositionPreset) => void
  shotSize: string
  setShotSize: (size: string) => void
  accordionCardClass: string
}

const SHOT_SIZE_OPTIONS = [
  { id: 'extreme-close-up', label: 'Extreme Close Up' },
  { id: 'close-up', label: 'Close Up' },
  { id: 'medium-shot', label: 'Medium Shot' },
  { id: 'full-body', label: 'Full Body' },
] as const

export function CompositionControls({
  presets,
  selectedPreset,
  setSelectedPreset,
  shotSize,
  setShotSize,
  accordionCardClass,
}: CompositionControlsProps) {
  return (
    <div className={accordionCardClass}>
      <AccordionTrigger className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline">
        Composition
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4 pt-2 pb-6 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              View
            </p>
            <div className="flex gap-2">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={cn(
                    'relative w-16 aspect-[3/4] rounded-xl overflow-hidden transition-all',
                    selectedPreset.id === preset.id
                      ? 'border border-foreground/40 bg-foreground/5 shadow-sm'
                      : 'border border-transparent hover:bg-muted/40'
                  )}
                >
                  {selectedPreset.id === preset.id && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-foreground/70" />
                  )}
                  {preset.image ? (
                    <Image
                      src={preset.image}
                      alt={preset.title}
                      fill
                      className="object-cover object-center"
                      sizes="64px"
                      quality={60}
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/30">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <span className="text-[10px] font-medium text-white">{preset.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Shot
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SHOT_SIZE_OPTIONS.map(shot => (
                <button
                  key={shot.id}
                  onClick={() => setShotSize(shot.id)}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-medium rounded-lg transition-colors border',
                    shotSize === shot.id
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-background text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {shot.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionContent>
    </div>
  )
}
