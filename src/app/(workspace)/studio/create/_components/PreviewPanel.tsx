'use client'

import React from 'react'
import Image from 'next/image'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface PreviewPanelProps {
  isGenerating: boolean
  previewImage: string | null
  generatedImages: string[]
  setPreviewImage: (url: string) => void
}

export function PreviewPanel({
  isGenerating,
  previewImage,
  generatedImages,
  setPreviewImage,
}: PreviewPanelProps) {
  return (
    <div className="w-full lg:flex-1 flex flex-col items-center">
      <Card
        className={cn(
          'w-full max-w-[520px] aspect-[3/4] rounded-3xl overflow-hidden flex flex-col items-center justify-center relative transition-all duration-500',
          'backdrop-blur-sm',
          isGenerating && 'border-primary/20 bg-white/80 shadow-lg ring-4 ring-primary/5'
        )}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-white border border-border/50 flex items-center justify-center shadow-sm relative z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">
                Creating Masterpiece
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                This usually takes about 10s
              </p>
            </div>
          </div>
        ) : previewImage ? (
          <div className="relative w-full h-full group">
            <Image
              src={previewImage}
              alt="Generated"
              fill
              className="object-contain transition-transform duration-700 hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 600px"
              quality={95}
              priority
              unoptimized
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 opacity-40 hover:opacity-100 transition-opacity duration-500">
            <div className="w-20 h-20 rounded-[2rem] bg-secondary/30 border border-border/20 flex items-center justify-center rotate-3 transition-transform duration-500 hover:rotate-6 hover:scale-110">
              <ImageIcon className="w-8 h-8 text-neutral-400" strokeWidth={1} />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-[0.2em]">
                Studio Canvas
              </p>
              <p className="text-[10px] text-neutral-400 font-normal">Select assets to begin</p>
            </div>
          </div>
        )}
      </Card>

      {generatedImages.length > 0 && (
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {generatedImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setPreviewImage(img)}
                className={cn(
                  'w-16 aspect-[3/4] shrink-0 rounded-lg overflow-hidden transition-all relative',
                  previewImage === img
                    ? 'opacity-100 after:absolute after:inset-0 after:rounded-lg after:border-2 after:border-foreground after:pointer-events-none'
                    : 'opacity-60 hover:opacity-100'
                )}
              >
                <Image
                  src={img}
                  alt={`Generated ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  quality={50}
                  loading="lazy"
                  unoptimized
                />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {generatedImages.length} image{generatedImages.length > 1 ? 's' : ''} generated
          </p>
        </div>
      )}
    </div>
  )
}
