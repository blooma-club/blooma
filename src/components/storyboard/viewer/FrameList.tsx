"use client"

import React from 'react'
import { Plus } from 'lucide-react'
import type { StoryboardFrame } from '@/types/storyboard'
import StoryboardCard from '@/components/storyboard/StoryboardCard'

interface FrameListProps {
  frames: StoryboardFrame[]
  onFrameEdit: (frameIndex: number) => void
  onFrameEditMetadata: (frameId: string) => void
  onFrameDelete: (frameId: string) => void
  onAddFrame: () => void
  deletingFrameId?: string | null
  onGenerateVideo?: (frameId: string) => void
  onPlayVideo?: (frameId: string) => void
  generatingVideoId?: string | null
}

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
}) => {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[2000px] space-y-4">
        {frames.map((frame, i) => (
          <div key={frame.id} className="flex items-center gap-6 p-6 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors">
            {/* 왼쪽: StoryboardCard */}
            <div className="w-96 flex-shrink-0">
              <StoryboardCard
                sceneNumber={i + 1}
                imageUrl={frame.imageUrl}
                status={frame.status as any}
                imageFit="cover"
                deleting={deletingFrameId === frame.id}
                onOpen={() => onFrameEdit(i)}
                onEdit={() => onFrameEditMetadata(frame.id)}
                onDelete={() => onFrameDelete(frame.id)}
                videoUrl={frame.videoUrl}
                onGenerateVideo={onGenerateVideo ? () => onGenerateVideo(frame.id) : undefined}
                onPlayVideo={onPlayVideo ? () => onPlayVideo(frame.id) : undefined}
                isGeneratingVideo={generatingVideoId === frame.id}
              />
            </div>
            
            {/* 오른쪽: 메타데이터 정보 */}
            <div className="flex-1 min-h-[384px] flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-2xl font-bold text-white">
                  Scene {i + 1}
                </span>
                <div className={`w-4 h-4 rounded-full ${
                  frame.status === 'ready' ? 'bg-green-500' :
                  frame.status === 'error' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`} />
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
        ))}
        
        {/* Add new frame button */}
        <button 
          onClick={onAddFrame} 
          className="w-full p-8 border-2 border-dashed border-neutral-600 rounded-lg flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900/50 min-h-[384px]"
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
