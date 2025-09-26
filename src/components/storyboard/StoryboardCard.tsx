"use client"

import React from 'react'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'

type CardStatus = 'ready' | 'processing' | 'enhancing' | 'error' | string

interface StoryboardCardProps {
  title?: string // kept for compatibility but hidden visually
  description?: string // no longer shown
  sceneLabel?: string
  sceneNumber?: number
  imageUrl?: string
  status?: CardStatus
  imageFit?: 'contain' | 'cover'
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  deleting?: boolean
  videoUrl?: string
  onGenerateVideo?: () => void
  onPlayVideo?: () => void
  isGeneratingVideo?: boolean
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({
  title,
  description,
  sceneLabel,
  sceneNumber,
  imageUrl,
  status = 'ready',
  imageFit = 'contain',
  onOpen,
  onEdit,
  onDelete,
  deleting = false,
  videoUrl,
  onGenerateVideo,
  onPlayVideo,
  isGeneratingVideo = false,
}) => {
  const objectFitClass = imageFit === 'cover' ? 'object-cover' : 'object-contain'
  const statusDotClass =
    status === 'ready' ? 'bg-green-500' :
    status === 'processing' ? 'bg-blue-500' :
    status === 'enhancing' ? 'bg-amber-500' :
    status === 'error' ? 'bg-red-500' : 'bg-neutral-600'
  return (
  <div className="group relative flex flex-col rounded-lg border border-neutral-700 bg-black shadow-lg hover:shadow-xl transition-shadow overflow-hidden h-full">
      {typeof sceneNumber === 'number' && (
        <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-medium tracking-wide select-none">
          Shot {sceneNumber}
        </div>
      )}
      <div className={`absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full ${statusDotClass} ring-2 ring-neutral-700`} aria-hidden="true" />
      {/* Hover actions (top-right) */}
      <div className="absolute top-2 right-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="px-2 py-1 text-[11px] rounded-md bg-black/70 text-white hover:bg-black/80"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            disabled={deleting}
            className={`px-2 py-1 text-[11px] rounded-md inline-flex items-center gap-1 ${deleting ? 'bg-neutral-400 cursor-not-allowed' : 'bg-red-600/90 text-white hover:bg-red-600'}`}
          >
            {deleting ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3" /> Delete
              </>
            )}
          </button>
        )}
      </div>

      {/* Image area */}
  <div className="relative w-full h-96 bg-neutral-900">
  {imageUrl ? (
          <Image src={imageUrl} alt={title || 'card image'} fill className="object-cover" draggable={false} />
        ) : status !== 'ready' && status !== 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center select-none">
            <div className="w-full h-full bg-[linear-gradient(110deg,#374151_8%,#4b5563_18%,#374151_33%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
            <style jsx>{`@keyframes shimmer {0%{background-position:0% 0}100%{background-position:-200% 0}}`}</style>
            <div className="absolute bottom-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded bg-white/20 text-white capitalize tracking-wide" aria-live="polite">{status}</div>
          </div>
        ) : status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-red-400 text-[11px] bg-neutral-800">
            <span>Image Error</span>
            <span className="text-[10px] text-red-300">Retry Later</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs">No image</div>
        )}
        {sceneLabel && (
          <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-semibold select-none">
            {sceneLabel}
          </div>
        )}
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="absolute inset-0"
            aria-label="Open"
            tabIndex={0}
            onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ onOpen() } }}
          />
        )}
      </div>

  {/* Content removed (title/description hidden for image-only cards) */}
    {(onGenerateVideo || onPlayVideo) && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 pointer-events-none">
          <div className="flex gap-2">
            {videoUrl && onPlayVideo ? (
              <button
                type="button"
                onClick={onPlayVideo}
                className="flex-1 px-3 py-2 rounded-md bg-white/90 text-black text-xs font-semibold uppercase tracking-wide shadow pointer-events-auto hover:bg-white"
              >
                Play Video
              </button>
            ) : null}

            {!videoUrl && onGenerateVideo ? (
              <button
                type="button"
                onClick={onGenerateVideo}
                disabled={isGeneratingVideo}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wide pointer-events-auto transition-colors ${
                  isGeneratingVideo
                    ? 'bg-neutral-700 text-neutral-300 cursor-not-allowed'
                    : 'bg-black/70 text-white border border-white/40 hover:bg-black/80'
                }`}
              >
                {isGeneratingVideo ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-white/70 border-t-transparent rounded-full animate-spin" />
                    Generating…
                  </span>
                ) : (
                  'Create Video'
                )}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryboardCard

