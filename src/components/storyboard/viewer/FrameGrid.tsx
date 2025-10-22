'use client'

import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import StoryboardCard from '@/components/storyboard/StoryboardCard'
import { RATIO_TO_CSS, CARD_WIDTH_MIN, CARD_WIDTH_MAX, clampCardWidth } from '@/lib/constants'

interface FrameGridProps {
  frames: StoryboardFrame[]
  onFrameOpen: (frameIndex: number) => void
  onFrameEdit: (frameId: string) => void
  onFrameDelete: (frameId: string) => void
  onAddFrame: (insertIndex?: number) => void
  deletingFrameId?: string | null
  loading?: boolean
  cardsLength?: number
  onGenerateVideo?: (frameId: string) => void
  onPlayVideo?: (frameId: string) => void
  generatingVideoId?: string | null
  aspectRatio?: StoryboardAspectRatio
  containerMaxWidth?: number
  cardWidth: number
  onReorder?: (fromIndex: number, toIndex: number) => void
  selectedFrameId?: string
  onBackgroundClick?: () => void
}

const SideInsertButton = ({
  position,
  onClick,
  label,
}: {
  position: 'left' | 'right'
  onClick: () => void
  label: string
}) => {
  const positionClass = position === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      className={`absolute top-1/2 -translate-y-1/2 ${positionClass} z-30 flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-neutral-600 bg-neutral-900 text-neutral-200 shadow transition-all duration-150 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 hover:border-neutral-400 hover:text-neutral-100`}
      aria-label={label}
    >
      <Plus className="h-4 w-4" />
    </button>
  )
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
  aspectRatio = '16:9',
  containerMaxWidth,
  cardWidth,
  onReorder,
  selectedFrameId,
  onBackgroundClick,
}) => {
  const aspectValue = RATIO_TO_CSS[aspectRatio]
  const normalizedCardWidth = useMemo(() => clampCardWidth(cardWidth), [cardWidth])
  const gridTemplateColumns = `repeat(auto-fit, minmax(${normalizedCardWidth}px, ${normalizedCardWidth}px))`
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const activeFrame = useMemo(
    () => frames.find(frame => frame.id === activeId) ?? null,
    [activeId, frames]
  )
  const activeCardWidth = useMemo(() => {
    if (!activeFrame) {
      return normalizedCardWidth
    }
    if (typeof activeFrame.cardWidth === 'number' && Number.isFinite(activeFrame.cardWidth)) {
      return clampCardWidth(activeFrame.cardWidth)
    }
    return normalizedCardWidth
  }, [activeFrame, normalizedCardWidth])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = frames.findIndex(frame => frame.id === active.id)
    const newIndex = frames.findIndex(frame => frame.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    if (onReorder) {
      onReorder(oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => setActiveId(null)

  if (loading) {
    return (
      <div className="flex justify-center">
        <div
          className="grid gap-6 justify-center"
          style={{
            gridTemplateColumns,
            maxWidth: '100%',
            width: 'fit-content'
          }}
        >
          {Array.from({ length: Math.max(cardsLength, 8) }).map((_, idx) => (
            <div
              key={idx}
              className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-700 bg-black shadow-lg"
            >
              <div className="absolute left-2 top-2 z-20 h-4 w-16 animate-pulse rounded-md bg-neutral-800 px-1.5 py-0.5" />
              <div className="absolute right-2 top-2 z-20 h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-700 ring-2 ring-neutral-700" />
              <div className="relative w-full bg-neutral-900" style={{ aspectRatio: aspectValue }}>
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[]}
    >
      <div 
        className="flex justify-center pt-10"
        onClick={(e) => {
          // 카드나 버튼이 아닌 배경 영역을 클릭했을 때만 실행
          if (e.target === e.currentTarget) {
            onBackgroundClick?.()
          }
        }}
      >
        <SortableContext items={frames.map(frame => frame.id)} strategy={rectSortingStrategy}>
          <div
            className="grid gap-6 justify-center"
            style={{
              gridTemplateColumns,
              maxWidth: '100%',
              width: 'fit-content'
            }}
          >
            {frames.map((frame, index) => {
              const frameWidth =
                typeof frame.cardWidth === 'number' && Number.isFinite(frame.cardWidth)
                  ? clampCardWidth(frame.cardWidth)
                  : normalizedCardWidth

              return (
                <SortableFrameCard
                  key={frame.id}
                  frame={frame}
                  index={index}
                  deleting={deletingFrameId === frame.id}
                  aspectRatio={aspectRatio}
                  cardWidth={frameWidth}
                  onOpen={() => onFrameOpen(index)}
                  onEdit={() => onFrameEdit(frame.id)}
                  onDelete={() => onFrameDelete(frame.id)}
                  onAddBefore={() => onAddFrame(index)}
                  onAddAfter={() => onAddFrame(index + 1)}
                  onGenerateVideo={onGenerateVideo ? () => onGenerateVideo(frame.id) : undefined}
                  onPlayVideo={onPlayVideo ? () => onPlayVideo(frame.id) : undefined}
                  isGeneratingVideo={generatingVideoId === frame.id}
                  highlight={activeId === frame.id || selectedFrameId === frame.id}
                />
              )
            })}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // 이벤트 전파 방지
                onAddFrame()
              }}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-600 bg-neutral-900/50 text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-300"
              style={{ aspectRatio: aspectValue }}
              aria-label="Add new frame"
            >
              <Plus className="mb-1 h-7 w-7" />
              <span className="text-sm font-medium">Add new scene</span>
            </button>
          </div>
        </SortableContext>
      </div>

      <DragOverlay adjustScale={false}>
        {activeFrame ? (
          <div
            className="pointer-events-none w-full"
            style={{
              width: `${activeCardWidth}px`,
              maxWidth: `${activeCardWidth}px`,
              minWidth: `${activeCardWidth}px`,
            }}
          >
            <StoryboardCard
              sceneNumber={frames.findIndex(frame => frame.id === activeFrame.id) + 1}
              imageUrl={activeFrame.imageUrl}
              status={activeFrame.status}
              imageFit="cover"
              aspectRatio={aspectRatio}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default FrameGrid

type SortableFrameCardProps = {
  frame: StoryboardFrame
  index: number
  deleting: boolean
  aspectRatio: StoryboardAspectRatio
  cardWidth: number
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onAddBefore: () => void
  onAddAfter: () => void
  onGenerateVideo?: () => void
  onPlayVideo?: () => void
  isGeneratingVideo: boolean
  highlight: boolean
}

const SortableFrameCard: React.FC<SortableFrameCardProps> = ({
  frame,
  index,
  deleting,
  aspectRatio,
  cardWidth,
  onOpen,
  onEdit,
  onDelete,
  onAddBefore,
  onAddAfter,
  onGenerateVideo,
  onPlayVideo,
  isGeneratingVideo,
  highlight,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 15 : undefined,
    touchAction: 'none',
    width: `${cardWidth}px`,
    maxWidth: `${cardWidth}px`,
    minWidth: `${cardWidth}px`,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative w-full cursor-grab active:cursor-grabbing rounded-lg',
        isDragging && 'ring-2 ring-blue-500/80 shadow-lg',
        highlight && !isDragging && 'ring-2 ring-blue-400/60'
      )}
      {...attributes}
      {...listeners}
    >
      {index === 0 && (
        <SideInsertButton
          position="left"
          label="Add scene at the beginning"
          onClick={onAddBefore}
        />
      )}

      <StoryboardCard
        sceneNumber={index + 1}
        imageUrl={frame.imageUrl}
        status={frame.status}
        imageFit="cover"
        deleting={deleting}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        videoUrl={frame.videoUrl}
        onGenerateVideo={onGenerateVideo}
        onPlayVideo={onPlayVideo}
        isGeneratingVideo={isGeneratingVideo}
        aspectRatio={aspectRatio}
      />

      <SideInsertButton
        position="right"
        label={`Add scene after scene ${index + 1}`}
        onClick={onAddAfter}
      />
    </div>
  )
}
