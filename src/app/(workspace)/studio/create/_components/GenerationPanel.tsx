'use client'

import React from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface GenerationPanelProps {
  modelTier: 'standard' | 'pro'
  setModelTier: (tier: 'standard' | 'pro') => void
  numImages: 1 | 2 | 4
  setNumImages: (count: 1 | 2 | 4) => void
  resolution: '1K' | '2K' | '4K'
  setResolution: (res: '1K' | '2K' | '4K') => void
  availableProResolutions: string[]
  estimatedCredits: number
  isGenerating: boolean
  isDisabled: boolean
  onGenerate: () => void
  accordionCardClass: string
}

export function GenerationPanel({
  modelTier,
  setModelTier,
  numImages,
  setNumImages,
  resolution,
  setResolution,
  availableProResolutions,
  estimatedCredits,
  isGenerating,
  isDisabled,
  onGenerate,
  accordionCardClass,
}: GenerationPanelProps) {
  const handleModelTierChange = (tier: 'standard' | 'pro') => {
    setModelTier(tier)
    if (tier === 'standard') {
      setResolution('1K')
      setNumImages(2)
    } else {
      setNumImages(1)
      if (availableProResolutions.length === 1) {
        setResolution('2K')
      }
    }
  }

  return (
    <Card className="bg-white/60 backdrop-blur-md overflow-hidden p-4 flex flex-col gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Mode
          </span>
          <div className="inline-flex rounded-xl bg-muted/60 p-1">
            <button
              onClick={() => handleModelTierChange('standard')}
              className={cn(
                'px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                modelTier === 'standard'
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              Standard
            </button>
            <button
              onClick={() => handleModelTierChange('pro')}
              className={cn(
                'px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                modelTier === 'pro'
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              Pro
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            {modelTier === 'standard' ? 'Images' : 'Resolution'}
          </span>
          <div className="inline-flex rounded-xl bg-muted/60 p-1">
            {modelTier === 'standard'
              ? [2, 4].map(count => (
                  <button
                    key={count}
                    onClick={() => setNumImages(count as 2 | 4)}
                    className={cn(
                      'px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                      numImages === count
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/40'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                  >
                    {count}
                  </button>
                ))
              : availableProResolutions.map(res => (
                  <button
                    key={res}
                    onClick={() => setResolution(res as '2K' | '4K')}
                    className={cn(
                      'px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                      resolution === res
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/40'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                  >
                    {res}
                  </button>
                ))}
          </div>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating || isDisabled}
        className={cn(
          'w-full py-6 rounded-xl text-sm font-medium relative overflow-hidden transition-all duration-300',
          isGenerating || isDisabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl hover:scale-[1.02]'
        )}
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="relative z-10">Generate</span>
            <span className="relative z-10 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-semibold">
              {estimatedCredits}
            </span>
          </div>
        )}
        {!isGenerating && !isDisabled && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
        )}
      </Button>
    </Card>
  )
}
