"use client"

import React from 'react'
import { Plus } from 'lucide-react'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import StoryboardCard from '@/components/storyboard/StoryboardCard'

const PORTRAIT_RATIOS: StoryboardAspectRatio[] = ['2:3', '3:4', '9:16']

interface FrameListProps {
  frames: StoryboardFrame[]
  onFrameEdit: (frameIndex: number) => void
  onFrameEditMetadata: (frameId: string) => void
  onFrameDelete: (frameId: string) => void
  onAddFrame: (insertIndex?: number) => void
  deletingFrameId?: string | null
  onGenerateVideo?: (frameId: string) => void
  onPlayVideo?: (frameId: string) => void
  generatingVideoId?: string | null
  aspectRatio?: StoryboardAspectRatio
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
      <span className="w-full border-t border-dashed border-neutral-700" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 rounded-full border border-dashed border-neutral-600 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300 shadow transition-all duration-150 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 hover:border-neutral-500 hover:text-neutral-100"
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
  deletingFrameId = null,
  onGenerateVideo,
  onPlayVideo,
  generatingVideoId = null,
  aspectRatio = '16:9',
}) => {
  const previewWidthClass = PORTRAIT_RATIOS.includes(aspectRatio) ? 'w-72' : 'w-96'
  const maxHeight = PORTRAIT_RATIOS.includes(aspectRatio) ? 520 : 360
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[2000px] space-y-4">
        {frames.length > 0 && (
          <BetweenInsertRow
            onAdd={() => onAddFrame(0)}
            label="Add scene at the beginning"
          />
        )}
        {frames.map((frame, i) => (
          <React.Fragment key={frame.id}>
            <div className="flex items-center gap-6 p-6 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors">
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
                  videoUrl={frame.videoUrl}
                  onGenerateVideo={onGenerateVideo ? () => onGenerateVideo(frame.id) : undefined}
                  onPlayVideo={onPlayVideo ? () => onPlayVideo(frame.id) : undefined}
                  isGeneratingVideo={generatingVideoId === frame.id}
                  aspectRatio={aspectRatio}
                />
              </div>

              {/* 오른쪽: 메타데이터 정보 */}
              <div className="flex-1 min-h-[384px] flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-bold text-white">
                    Scene {i + 1}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full ${
                      frame.status === 'ready'
                        ? 'bg-green-500'
                        : frame.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                </div>

                <p className="text-neutral-200 text-lg line-clamp-4 leading-relaxed mb-4">
                  {frame.shotDescription || 'No description available for this scene.'}
                </p>

                {/* 추가 메타데이터 표시 */}
                {(frame.shot || frame.dialogue) && (
                  <div className="flex flex-wrap gap-3">
                    {frame.shot && (
                      <span className="px-3 py-2 bg-neutral-800 text-neutral-200 text-base rounded-lg font-medium">
                        {frame.shot}
                      </span>
                    )}
                    {frame.dialogue && (
                      <span className="px-3 py-2 bg-blue-900/40 text-blue-200 text-base rounded-lg font-medium">
                        Dialogue
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <BetweenInsertRow
              onAdd={() => onAddFrame(i + 1)}
              label={`Add scene after scene ${i + 1}`}
            />
          </React.Fragment>
        ))}

        {/* Add new frame button */}
        <button
          onClick={() => onAddFrame()}
          className="w-full p-8 border-2 border-dashed border-neutral-600 rounded-lg flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900/50"
          style={{ minHeight: maxHeight }}
          aria-label="Add new frame"
        >
          <Plus className="w-8 h-8 mr-4" />
          <span className="font-semibold text-xl">Add new scene</span>
        </button>
      </div>
    </div>
  )
}

export default FrameList
