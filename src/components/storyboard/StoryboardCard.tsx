'use client'

import React from 'react'
import { Trash2, Info } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faSpinner } from '@fortawesome/free-solid-svg-icons'
import Image from 'next/image'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import { RATIO_TO_CSS } from '@/lib/constants'

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
  aspectRatio?: StoryboardAspectRatio
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
  aspectRatio = '16:9',
}) => {
  void description
  const objectFitClass = imageFit === 'cover' ? 'object-cover' : 'object-contain'
  const statusDotClass =
    status === 'ready'
      ? 'bg-green-500'
      : status === 'processing'
        ? 'bg-blue-500'
        : status === 'enhancing'
          ? 'bg-amber-500'
          : status === 'error'
            ? 'bg-red-500'
            : 'bg-neutral-600'
  const imageBoxStyle: React.CSSProperties = {
    aspectRatio: RATIO_TO_CSS[aspectRatio],
  }
  return (
    <div className="group relative flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black shadow-lg hover:shadow-xl transition-shadow overflow-hidden h-full">
      {typeof sceneNumber === 'number' && (
        <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-black/20 dark:bg-white/20 text-black dark:text-white text-[10px] font-medium tracking-wide select-none">
          Shot {sceneNumber}
        </div>
      )}
      <div
        className={`absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full ${statusDotClass} ring-2 ring-neutral-200 dark:ring-neutral-700`}
        aria-hidden="true"
      />
      {/* Hover actions (top-right) */}
      <div className="absolute top-2 right-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation() // 이벤트 전파 방지
              onEdit()
            }}
            aria-label="Show Info"
            className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-100/80 dark:bg-black/70 text-neutral-700 dark:text-white hover:bg-neutral-200/80 dark:hover:bg-black/80"
          >
            <Info className="w-3 h-3" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation() // 이벤트 전파 방지
              onDelete()
            }}
            aria-label="Delete"
            disabled={deleting}
            className={`px-2 py-1 text-[11px] rounded-md inline-flex items-center gap-1 ${deleting ? 'bg-neutral-400 dark:bg-neutral-400 cursor-not-allowed' : 'bg-red-600/90 dark:bg-red-600/90 text-white hover:bg-red-600 dark:hover:bg-red-600'}`}
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
      <div className="relative w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden" style={imageBoxStyle}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title || 'card image'}
            fill
            className={objectFitClass}
            draggable={false}
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
        ) : status !== 'ready' && status !== 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center select-none">
            <div className="w-full h-full bg-[linear-gradient(110deg,#e5e7eb_8%,#d1d5db_18%,#e5e7eb_33%)] dark:bg-[linear-gradient(110deg,#374151_8%,#4b5563_18%,#374151_33%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
            <style jsx>{`
              @keyframes shimmer {
                0% {
                  background-position: 0% 0;
                }
                100% {
                  background-position: -200% 0;
                }
              }
            `}</style>
            <div
              className="absolute bottom-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded bg-white/20 text-white capitalize tracking-wide"
              aria-live="polite"
            >
              {status}
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-red-500 text-[11px] bg-neutral-200 dark:bg-neutral-800">
            <span>Image Error</span>
            <span className="text-[10px] text-red-400 dark:text-red-300">Retry Later</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-400 dark:text-neutral-300 text-xs">
            No image
          </div>
        )}
        {sceneLabel && (
          <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-semibold select-none">
            {sceneLabel}
          </div>
        )}
        {onOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation() // 이벤트 전파 방지
              onOpen()
            }}
            className="absolute inset-0"
            aria-label="Open"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                onOpen()
              }
            }}
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
                onClick={(e) => {
                  e.stopPropagation() // 이벤트 전파 방지
                  onPlayVideo()
                }}
                className="flex-1 px-3 py-2 rounded-md bg-white/90 text-black text-xs font-semibold uppercase tracking-wide shadow pointer-events-auto hover:bg-white"
              >
                Play Video
              </button>
            ) : null}

            {!videoUrl && onGenerateVideo ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation() // 이벤트 전파 방지
                  onGenerateVideo()
                }}
                disabled={isGeneratingVideo}
                className={`absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100 ${
                  isGeneratingVideo
                    ? 'bg-neutral-700 text-neutral-300 cursor-not-allowed'
                    : 'bg-black/70 text-white border border-white/40 hover:bg-white hover:text-black'
                }`}
              >
                {isGeneratingVideo ? (
                  <FontAwesomeIcon icon={faSpinner} fade />
                ) : (
                  <FontAwesomeIcon icon={faPlay} />
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
