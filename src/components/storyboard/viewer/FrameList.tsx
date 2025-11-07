"use client"

import React from 'react'
import { Plus, MessageSquare, Image as ImageIcon, Edit3, Trash2 } from 'lucide-react'
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
                className={`flex items-stretch gap-3 p-3 border rounded-md transition-colors ${
                  selectedFrameId === frame.id 
                    ? 'border-neutral-900/40 dark:border-white/40 bg-neutral-50/50 dark:bg-neutral-900/30' 
                    : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30'
                }`}
                style={{ backgroundColor: 'hsl(var(--card))' }}
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
                    onImageUpload={onImageUpload ? (file) => onImageUpload(frame.id, file) : undefined}
                    aspectRatio={aspectRatio}
                  />
                </div>

                {/* 오른쪽: 메타데이터 정보 */}
                <div className="flex-1 flex flex-col gap-2.5">
                  {/* Header: Scene Number & Status + inline actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Scene {i + 1}</span>
                      {statusInfo.show && (
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
                          <span className="text-[11px] font-medium">{statusInfo.label}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onFrameEditMetadata(frame.id)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                        aria-label="Edit metadata"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onFrameDelete(frame.id)}
                        disabled={deletingFrameId === frame.id}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                        aria-label="Delete scene"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed line-clamp-2 text-[hsl(var(--foreground))]">
                    {frame.shotDescription || 'No description available for this scene.'}
                  </p>

                  {/* Compact Metadata Grid */}
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
                    <div className="space-y-0.5">
                      <dt className="text-neutral-500 dark:text-neutral-400">Shot</dt>
                      <dd className="text-neutral-900 dark:text-neutral-100 truncate">{frame.shot || '-'}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-neutral-500 dark:text-neutral-400">Dialogue</dt>
                      <dd className="text-neutral-900 dark:text-neutral-100 truncate">{frame.dialogue || '-'}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-neutral-500 dark:text-neutral-400">Sound</dt>
                      <dd className="text-neutral-900 dark:text-neutral-100 truncate">{frame.sound || '-'}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-neutral-500 dark:text-neutral-400">Bg</dt>
                      <dd className="text-neutral-900 dark:text-neutral-100 truncate">{frame.background || '-'}</dd>
                    </div>
                    <div className="space-y-0.5 col-span-2 md:col-span-3">
                      <dt className="text-neutral-500 dark:text-neutral-400">Prompt</dt>
                      <dd className="text-neutral-900 dark:text-neutral-100 line-clamp-2">{frame.imagePrompt || '-'}</dd>
                    </div>
                  </dl>
                  {/* spacer to align heights */}
                  <div className="mt-auto" />
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
