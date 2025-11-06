'use client'

import React, { useState, useRef } from 'react'
import { Trash2, Info, Upload } from 'lucide-react'
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
  onImageUpload?: (file: File) => Promise<void>
  deleting?: boolean
  aspectRatio?: StoryboardAspectRatio
  onCardClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
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
}) => {
  void description
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const objectFitClass = imageFit === 'cover' ? 'object-cover' : 'object-contain'
  const imageBoxStyle: React.CSSProperties = {
    aspectRatio: RATIO_TO_CSS[aspectRatio],
  }

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
        className="relative w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden"
        style={imageBoxStyle}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title || 'card image'}
            fill
            className={objectFitClass}
            draggable={false}
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="lazy"
            quality={70}
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
      </div>

      {/* Content removed (title/description hidden for image-only cards) */}
    </div>
  )
}

export default StoryboardCard
