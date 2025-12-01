'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Trash2, Info, Upload } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import { RATIO_TO_CSS } from '@/lib/constants'

type CardStatus = 'ready' | 'processing' | 'enhancing' | 'error' | string

type HoverAction = {
  id: string
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  icon?: React.FC<{ className?: string }>
}

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
  onImageUpload?: (file: File) => Promise<void>
  deleting?: boolean
  aspectRatio?: StoryboardAspectRatio
  onCardClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  cardWidth?: number
  hoverActions?: HoverAction[]
  /** 비동기 이미지 생성 중 여부 */
  isGenerating?: boolean
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
  onImageUpload,
  deleting = false,
  aspectRatio = '16:9',
  onCardClick,
  cardWidth,
  hoverActions,
  isGenerating = false,
}) => {
  void description
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageContainerRef = useRef<HTMLDivElement | null>(null)
  const [hasEnteredViewport, setHasEnteredViewport] = useState(() => typeof window === 'undefined')
  
  const objectFitClass = imageFit === 'cover' ? 'object-cover' : 'object-contain'
  const imageBoxStyle: React.CSSProperties = {
    aspectRatio: RATIO_TO_CSS[aspectRatio],
  }

  useEffect(() => {
    if (hasEnteredViewport) {
      return
    }
    const target = imageContainerRef.current
    if (!target || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setHasEnteredViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setHasEnteredViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasEnteredViewport])

  const computedSizes =
    typeof cardWidth === 'number' && Number.isFinite(cardWidth)
      ? `(max-width: 768px) 100vw, ${Math.round(cardWidth)}px`
      : '(max-width: 768px) 100vw, 480px'

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onImageUpload && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if leaving the card entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!onImageUpload) return

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    setIsUploading(true)
    try {
      await onImageUpload(file)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageUpload) return

    setIsUploading(true)
    try {
      await onImageUpload(file)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="group relative flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black shadow-lg hover:shadow-xl transition-shadow overflow-hidden h-full">
      {typeof sceneNumber === 'number' && (
        <div className="absolute top-2 left-2 z-40 px-1.5 py-0.5 rounded-md bg-black/20 dark:bg-white/20 text-black dark:text-white text-[10px] font-medium tracking-wide select-none">
          Shot {sceneNumber}
        </div>
      )}
      {/* Hover actions (top-right) */}
      <div className="absolute top-2 right-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            onClick={e => {
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
            onClick={e => {
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

      {/* Hidden file input */}
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      )}

      {/* Image area */}
      <div
        ref={imageContainerRef}
        className={`relative w-full overflow-hidden ${
          !imageUrl && status === 'ready' 
            ? 'bg-neutral-200 dark:bg-neutral-900' 
            : 'bg-neutral-100 dark:bg-neutral-900'
        }`}
        style={imageBoxStyle}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {imageUrl && hasEnteredViewport ? (
          // Base64나 Blob URL은 native img 태그 사용, 그 외는 Next.js Image 사용
          imageUrl.startsWith('data:image/') || imageUrl.startsWith('blob:') ? (
            <img
              src={imageUrl}
              alt={title || 'card image'}
              className={clsx('w-full h-full', objectFitClass)}
              draggable={false}
              style={{ objectFit: imageFit }}
              onError={(e) => {
                console.error('Failed to load image:', imageUrl)
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <Image
              src={imageUrl}
              alt={title || 'card image'}
              fill
              className={objectFitClass}
              draggable={false}
              sizes={computedSizes}
              loading="lazy"
              quality={70}
              onError={() => {
                console.error('Failed to load image:', imageUrl)
              }}
            />
          )
        ) : status !== 'ready' && status !== 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none gap-3 bg-neutral-100 dark:bg-neutral-900 z-20">
             {/* Pulsing Overlay */}
             <div className="absolute inset-0 bg-white/50 dark:bg-black/50 animate-pulse z-0" />
             
             {/* Loading Spinner & Text */}
             <div className="z-10 flex flex-col items-center gap-3">
               <div className="relative w-10 h-10">
                  {/* Outer Ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                  {/* Spinning Segment */}
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  {/* Inner Dot */}
                  <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
               </div>
               
               <div className="flex flex-col items-center gap-1">
                 <span className="text-xs font-medium text-foreground animate-pulse capitalize">
                   {status === 'processing' ? 'Generating...' : 
                    status === 'enhancing' ? 'Enhancing...' : 
                    status}
                 </span>
                 <span className="text-[10px] text-muted-foreground">
                   This may take a moment
                 </span>
               </div>
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
        
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-indigo-500/90 backdrop-blur-sm border-2 border-dashed border-white/80">
            <Upload className="w-8 h-8 text-white mb-2" />
            <p className="text-white text-sm font-medium">Drop image here</p>
          </div>
        )}
        
        {/* Upload button (bottom-right, visible on hover) */}
        {onImageUpload && !isUploading && !isDragging && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/50 bg-white/95 dark:bg-neutral-900/95 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200"
            aria-label="Upload image"
          >
            <Upload className="w-3 h-3" />
            Upload
          </button>
        )}
        
        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-white text-sm font-medium">Uploading...</p>
          </div>
        )}
        
        {/* 비동기 이미지 생성 오버레이 */}
        {isGenerating && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="relative w-10 h-10 mb-3">
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
              {/* Spinning Segment */}
              <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              {/* Inner Dot */}
              <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            </div>
            <span className="text-xs font-medium text-foreground">Generating...</span>
            <span className="text-[10px] text-muted-foreground mt-1">You can continue working</span>
          </div>
        )}
        
        {onOpen && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation() // 이벤트 전파 방지
              if (onCardClick) {
                onCardClick(e)
                return
              }
              onOpen()
            }}
            className="absolute inset-0"
            aria-label="Open"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                // 키보드 접근성: onCardClick 우선
                if (onCardClick) {
                  onCardClick(e as unknown as React.MouseEvent<HTMLButtonElement>)
                  return
                }
                onOpen()
              }
            }}
          />
        )}

        {hoverActions?.length ? (
          <div className="pointer-events-none absolute inset-x-2 bottom-4 z-30 flex flex-wrap items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
            {hoverActions.map(action => {
              const ActionIcon = action.icon
              const isPrimary = action.id === 'select'
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={event => {
                    event.stopPropagation()
                    action.onClick(event)
                  }}
                  className={clsx(
                    "pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 shadow-sm backdrop-blur-md select-none",
                    isPrimary
                      ? "bg-white text-neutral-900 hover:bg-neutral-100 hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                      : "bg-black/60 text-white border border-white/10 hover:bg-black/70 hover:border-white/20 active:scale-95"
                  )}
                  aria-label={action.label}
                >
                  {ActionIcon ? <ActionIcon className={clsx("h-3.5 w-3.5", isPrimary ? "text-neutral-900" : "text-white/90")} /> : null}
                  <span>{action.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Content removed (title/description hidden for image-only cards) */}
    </div>
  )
}

export default StoryboardCard
