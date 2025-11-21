'use client'

import React from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface ImagePreviewModalProps {
  images: string[]
  onApply: (imageUrl: string) => Promise<void>
  onClose: () => void
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ images, onApply, onClose }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [isApplying, setIsApplying] = React.useState(false)
  const hasMultiple = images.length > 1

  const handleApply = async () => {
    if (isApplying) return
    const selected = images[selectedIndex]
    if (!selected) return
    setIsApplying(true)
    try {
      await onApply(selected)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 text-sm font-medium text-white/80">
          {hasMultiple ? 'Select the best image to apply to your storyboard.' : 'Preview generated image.'}
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
          <Image
            key={images[selectedIndex]}
            src={images[selectedIndex]}
            alt={`Generated preview ${selectedIndex + 1}`}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 90vw, 1024px"
            priority
          />
        </div>

        {hasMultiple && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {images.map((image, idx) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border transition ${
                  selectedIndex === idx
                    ? 'border-white ring-2 ring-white/60'
                    : 'border-white/15 hover:border-white/40'
                }`}
                aria-label={`Preview option ${idx + 1}`}
              >
                <Image src={image} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isApplying ? 'Applying…' : 'Apply to storyboard'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImagePreviewModal

