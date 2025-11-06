"use client"

import React from 'react'
import { Plus, MessageSquare, Image as ImageIcon } from 'lucide-react'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import StoryboardCard from '@/components/storyboard/StoryboardCard'

const PORTRAIT_RATIOS: StoryboardAspectRatio[] = ['2:3', '3:4', '9:16']

interface FrameListProps {
  frames: StoryboardFrame[]
  onFrameEdit: (frameIndex: number) => void
  onFrameEditMetadata: (frameId: string) => void
  onFrameDelete: (frameId: string) => void
  onAddFrame: (insertIndex?: number, duplicateFrameId?: string) => void
  onImageUpload?: (frameId: string, file: File) => Promise<void>
  deletingFrameId?: string | null
  isAddingFrame?: boolean
  aspectRatio?: StoryboardAspectRatio
  selectedFrameId?: string
}

const BetweenInsertRow = ({
  onAdd,
  label,
}: {
  onAdd: () => void
  label: string
}) => (
  <div className="group relative h-10">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <span 
        className="w-full border-t border-dashed border-neutral-200/80 dark:border-neutral-700/50" 
      />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 rounded-full border border-dashed px-3 py-1 text-xs font-medium shadow-lg backdrop-blur-sm transition-all duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:focus-visible:outline-neutral-400 border-neutral-200/80 dark:border-neutral-700/50 bg-white/95 dark:bg-neutral-900/95 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 hover:border-neutral-900 dark:hover:border-white"
        aria-label={label}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add scene here</span>
      </button>
    </div>
  </div>
)

export const FrameList: React.FC<FrameListProps> = ({
  frames,
  onFrameEdit,
  onFrameEditMetadata,
  onFrameDelete,
  onAddFrame,
  onImageUpload,
  deletingFrameId = null,
  isAddingFrame = false,
  aspectRatio = '16:9',
  selectedFrameId,
}) => {
  const previewWidthClass = PORTRAIT_RATIOS.includes(aspectRatio) ? 'w-72' : 'w-96'
  const maxHeight = PORTRAIT_RATIOS.includes(aspectRatio) ? 520 : 360
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[2000px] space-y-4">
        {frames.length > 0 && (
          <BetweenInsertRow
            onAdd={() => onAddFrame(0, frames[0]?.id)}
            label="Add scene at the beginning"
          />
        )}
        {frames.map((frame, i) => {
          // Status 표시 정보 (ready는 표시 안함, error와 processing만)
          const getStatusInfo = (status: string) => {
            switch (status) {
              case 'error':
                return { color: 'hsl(0 84% 60%)', label: 'Error', show: true }
              case 'generating':
                return { color: 'hsl(48 96% 53%)', label: 'Generating', show: true }
              case 'enhancing':
                return { color: 'hsl(217 91% 60%)', label: 'Enhancing', show: true }
              case 'pending':
                return { color: 'hsl(var(--muted-foreground))', label: 'Pending', show: true }
              default:
                return { color: '', label: '', show: false }
            }
          }
          
          const statusInfo = getStatusInfo(frame.status)
          
          return (
            <React.Fragment key={frame.id}>
              <div 
                className={`flex items-stretch gap-4 p-4 border rounded-lg transition-all ${
                  selectedFrameId === frame.id 
                    ? 'ring-2 ring-neutral-900 dark:ring-white border-neutral-900/30 dark:border-white/30' 
                    : ''
                }`}
                style={{
                  backgroundColor: 'hsl(var(--card))',
                }}
              >
                {/* 왼쪽: StoryboardCard */}
                <div className={`${previewWidthClass} flex-shrink-0`}>
                  <StoryboardCard
                    sceneNumber={i + 1}
                    imageUrl={frame.imageUrl}
                    status={frame.status}
                    imageFit="cover"
                    deleting={deletingFrameId === frame.id}
                    onOpen={() => onFrameEdit(i)}
                    onEdit={() => onFrameEditMetadata(frame.id)}
                    onDelete={() => onFrameDelete(frame.id)}
                    onImageUpload={onImageUpload ? (file) => onImageUpload(frame.id, file) : undefined}
                    aspectRatio={aspectRatio}
                  />
                </div>

                {/* 오른쪽: 메타데이터 정보 */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* Header: Scene Number & Status */}
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs font-semibold tracking-wide"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      SCENE {i + 1}
                    </span>
                    {statusInfo.show && (
                      <>
                        <span style={{ color: 'hsl(var(--muted-foreground))' }}>·</span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusInfo.color }}
                          />
                          <span 
                            className="text-xs font-medium"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <p 
                    className="text-sm leading-relaxed line-clamp-4"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {frame.shotDescription || 'No description available for this scene.'}
                  </p>

                  {/* Metadata Badges - Compact Grid */}
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {frame.shot && (
                      <div 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))'
                        }}
                      >
                        <ImageIcon className="w-2.5 h-2.5" />
                        {frame.shot}
                      </div>
                    )}
                    {frame.dialogue && (
                      <div 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))'
                        }}
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        Dialogue
                      </div>
                    )}
                    {frame.angle && (
                      <div 
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))'
                        }}
                      >
                        {frame.angle}
                      </div>
                    )}
                    {frame.background && (
                      <div 
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))'
                        }}
                      >
                        📍 {frame.background}
                      </div>
                    )}
                    {frame.moodLighting && (
                      <div 
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))'
                        }}
                      >
                        💡 {frame.moodLighting}
                      </div>
                    )}
                    {frame.sound && (
                      <div 
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: 'hsl(var(--secondary))',
                          color: 'hsl(var(--secondary-foreground))'
                        }}
                      >
                        🔊 {frame.sound}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <BetweenInsertRow
                onAdd={() => onAddFrame(i + 1, frame.id)}
                label={`Add scene after scene ${i + 1}`}
              />
            </React.Fragment>
          )
        })}

        {/* Add new frame button */}
        <button
          onClick={() => {
            if (!isAddingFrame) {
              onAddFrame()
            }
          }}
          disabled={isAddingFrame}
          className={`w-full p-8 border-2 border-dashed rounded-lg flex items-center justify-center transition-all ${
            isAddingFrame
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-[1.01]'
          }`}
          style={{ 
            minHeight: maxHeight,
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'hsl(var(--muted) / 0.3)',
            color: 'hsl(var(--muted-foreground))'
          }}
          aria-label="Add new frame"
        >
          {isAddingFrame ? (
            <>
              <div className="w-8 h-8 mr-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-xl">Adding scene...</span>
            </>
          ) : (
            <>
              <Plus className="w-8 h-8 mr-4" />
              <span className="font-semibold text-xl">Add new scene</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default FrameList
