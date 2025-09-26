"use client"

import React from 'react'
import { Plus } from 'lucide-react'
import type { StoryboardFrame } from '@/types/storyboard'
import StoryboardCard from '@/components/storyboard/StoryboardCard'

interface FrameGridProps {
  frames: StoryboardFrame[]
  onFrameOpen: (frameIndex: number) => void
  onFrameEdit: (frameId: string) => void
  onFrameDelete: (frameId: string) => void
  onAddFrame: () => void
  deletingFrameId?: string | null
  loading?: boolean
  cardsLength?: number
  onGenerateVideo?: (frameId: string) => void
  onPlayVideo?: (frameId: string) => void
  generatingVideoId?: string | null
}

export const FrameGrid: React.FC<FrameGridProps> = ({
  frames,
  onFrameOpen,
  onFrameEdit,
  onFrameDelete,
  onAddFrame,
  deletingFrameId = null,
  loading = false,
  cardsLength = 0,
  onGenerateVideo,
  onPlayVideo,
  generatingVideoId = null,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center">
        <div className="grid grid-cols-4 gap-6 w-full max-w-[2000px]">
          {Array.from({ length: Math.max(cardsLength, 8) }).map((_, idx) => (
            <div key={idx} className="group relative flex flex-col rounded-lg border border-neutral-700 bg-black shadow-lg overflow-hidden h-96">
              <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-neutral-800 w-16 h-4 animate-pulse" />
              <div className="absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full bg-neutral-700 ring-2 ring-neutral-700 animate-pulse" />
              <div className="relative w-full h-96 bg-neutral-900">
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-4 gap-6 w-full max-w-[2000px]">
        {frames.map((frame, i) => (
          <StoryboardCard
            key={frame.id}
            sceneNumber={i + 1}
            imageUrl={frame.imageUrl}
            status={frame.status as any}
            imageFit="cover"
            deleting={deletingFrameId === frame.id}
            onOpen={() => onFrameOpen(i)}
            onEdit={() => onFrameEdit(frame.id)}
            onDelete={() => onFrameDelete(frame.id)}
            videoUrl={frame.videoUrl}
            onGenerateVideo={onGenerateVideo ? () => onGenerateVideo(frame.id) : undefined}
            onPlayVideo={onPlayVideo ? () => onPlayVideo(frame.id) : undefined}
            isGeneratingVideo={generatingVideoId === frame.id}
          />
        ))}
        
        {/* Add new frame button */}
        <button 
          type="button" 
          onClick={onAddFrame} 
          className="w-full h-96 border-2 border-dashed border-neutral-600 rounded-lg flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900/50" 
          aria-label="Add new frame"
        >
          <Plus className="w-7 h-7 mb-1" />
          <span className="text-sm font-medium">Add new scene</span>
        </button>
      </div>
    </div>
  )
}

export default FrameGrid
