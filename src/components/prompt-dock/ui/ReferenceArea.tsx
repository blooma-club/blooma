import React from 'react'
import { X, Image as ImageIcon } from 'lucide-react'
import type { useDockState } from '../hooks/useDockState'

type ReferenceAreaProps = {
    state: ReturnType<typeof useDockState>
}

export const ReferenceArea: React.FC<ReferenceAreaProps> = ({ state }) => {
    const { currentMode, referenceImages, handleRemoveReferenceImage } = state

    if (currentMode === 'video' || referenceImages.length === 0) {
        return null
    }

    return (
        <div className="flex items-center gap-2.5 px-1 pt-1">
            {referenceImages.map(img => {
                // Validate image URL before rendering
                const isValidUrl =
                    img.url &&
                    typeof img.url === 'string' &&
                    img.url.trim().length > 0 &&
                    (img.url.startsWith('http://') ||
                        img.url.startsWith('https://') ||
                        img.url.startsWith('data:image/') ||
                        img.url.startsWith('blob:'))

                return (
                    <div key={img.id} className="relative group overflow-hidden rounded-xl border border-border/20 bg-muted/20 shadow-sm hover:scale-105 transition-transform duration-300">
                        {isValidUrl ? (
                            <img
                                src={img.url}
                                alt={img.label || `Reference ${img.type}`}
                                className="h-14 w-14 md:h-16 md:w-16 object-cover"
                                onError={(e) => {
                                    // Hide broken image
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                }}
                            />
                        ) : (
                            <div className="h-14 w-14 md:h-16 md:w-16 flex items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                        )}
                        {img.label && (
                            <span className="absolute left-0 top-0 rounded-br-lg bg-black/50 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
                                {img.type === 'model'
                                    ? 'Model'
                                    : img.type === 'background'
                                        ? 'BG'
                                        : img.type === 'frame'
                                            ? 'Frame'
                                            : 'Ref'}
                            </span>
                        )}
                        {img.type !== 'frame' && (
                            <button
                                type="button"
                                onClick={() => handleRemoveReferenceImage(img.id)}
                                className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/90 hover:bg-black/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                aria-label={`Remove ${img.type} reference`}
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
