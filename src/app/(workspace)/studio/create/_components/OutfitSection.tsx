'use client'

import React from 'react'
import Image from 'next/image'
import { Plus, X } from 'lucide-react'
import { AccordionContent, AccordionTrigger } from '@/components/ui/accordion'

interface OutfitSectionProps {
  referenceImages: string[]
  selectedModelsLength: number
  maxTotalImages: number
  outfitFileInputRef: React.RefObject<HTMLInputElement | null>
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  removeReferenceImage: (index: number) => void
  accordionCardClass: string
}

export function OutfitSection({
  referenceImages,
  selectedModelsLength,
  maxTotalImages,
  outfitFileInputRef,
  handleImageUpload,
  removeReferenceImage,
  accordionCardClass,
}: OutfitSectionProps) {
  return (
    <div className={accordionCardClass}>
      <AccordionTrigger className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline">
        Outfit
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4 pt-2 pb-6">
          <div className="flex gap-3 flex-wrap">
            {referenceImages.map((img, idx) => (
              <div
                key={idx}
                className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden group border border-border/50"
              >
                <Image
                  src={img}
                  alt={`Outfit ${idx + 1}`}
                  fill
                  className="object-cover object-center"
                  sizes="64px"
                  quality={60}
                  loading="lazy"
                  unoptimized
                />
                <button
                  onClick={() => removeReferenceImage(idx)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ))}

            {selectedModelsLength + referenceImages.length < maxTotalImages && (
              <button
                onClick={() => outfitFileInputRef.current?.click()}
                className="w-16 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Add</span>
              </button>
            )}

            <input
              ref={outfitFileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      </AccordionContent>
    </div>
  )
}
