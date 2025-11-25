'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImagePreviewModalProps {
  images: string[]
  onApply: (imageUrl: string) => Promise<void>
  onClose: () => void
}

// Base64 이미지인지 확인
const isBase64Image = (src: string) => src?.startsWith('data:')

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ images, onApply, onClose }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [isApplying, setIsApplying] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const hasMultiple = images.length > 1
  const currentImage = images[selectedIndex] || ''

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset loaded state when image changes
  React.useEffect(() => {
    setImageLoaded(false)
  }, [selectedIndex])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'Enter' && !isApplying) {
        handleApply()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasMultiple, images.length, isApplying, onClose])

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

  const handlePrev = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }

  if (!mounted || !currentImage) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-4xl flex flex-col bg-background/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-border/10">
          <h2 className="text-sm font-semibold text-foreground/90">
            {hasMultiple ? 'Select Image' : 'Preview Image'}
          </h2>
          <div className="flex items-center gap-2">
            {hasMultiple && (
              <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                {selectedIndex + 1} / {images.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Image Area */}
          <div className="relative flex-1 min-h-[300px] max-h-[60vh] bg-muted/5 flex items-center justify-center p-6">
            {/* Loading State */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            )}

            {/* Main Image - Base64는 img 태그, URL은 Next Image */}
            {isBase64Image(currentImage) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={currentImage.slice(0, 50)}
                src={currentImage}
                alt={`Generated preview ${selectedIndex + 1}`}
                className={cn(
                  "max-w-full max-h-full object-contain transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  key={currentImage}
                  src={currentImage}
                  alt={`Generated preview ${selectedIndex + 1}`}
                  fill
                  className={cn(
                    "object-contain transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  sizes="(max-width: 1024px) 90vw, 1024px"
                  priority
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </div>
            )}

            {/* Navigation Arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 border border-border/20 text-foreground/80 hover:text-foreground hover:bg-background shadow-sm backdrop-blur-sm transition-all z-20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 border border-border/20 text-foreground/80 hover:text-foreground hover:bg-background shadow-sm backdrop-blur-sm transition-all z-20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails & Actions */}
          <div className="p-4 border-t border-border/10 bg-background/50">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Thumbnails or Empty space */}
              <div className="flex-1 min-w-0">
                {hasMultiple && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={cn(
                          "relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border transition-all",
                          selectedIndex === idx
                            ? "border-primary ring-2 ring-primary/20 opacity-100"
                            : "border-border/20 opacity-50 hover:opacity-80"
                        )}
                      >
                        {isBase64Image(img) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm"
                >
                  {isApplying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Apply Image
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ImagePreviewModal
