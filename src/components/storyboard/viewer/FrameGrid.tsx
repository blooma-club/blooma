'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Play, Plus, Square, Video, XCircle } from 'lucide-react'
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
  onAddFrame: (insertIndex?: number, duplicateFrameId?: string) => void
  onImageUpload?: (frameId: string, file: File) => Promise<void>
  deletingFrameId?: string | null
  isAddingFrame?: boolean
  loading?: boolean
  cardsLength?: number
  aspectRatio?: StoryboardAspectRatio
  containerMaxWidth?: number
  cardWidth: number
  onReorder?: (fromIndex: number, toIndex: number) => void
  selectedFrameId?: string
  onBackgroundClick?: () => void
  mode?: 'generate' | 'edit' | 'video'
  selectedFrameIds?: string[]
  onCardSelect?: (id: string, options?: { multi?: boolean; toggle?: boolean; role?: 'start' | 'end' }) => void
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
      className={clsx(
        'absolute top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
        positionClass,
        'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto',
        'bg-background border border-border shadow-sm text-muted-foreground',
        'hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md',
        'active:scale-95',
        'focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-label={label}
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
    </button>
  )
}


export const FrameGrid: React.FC<FrameGridProps> = ({
  frames,
  onFrameOpen,
  onFrameEdit,
  onFrameDelete,
  onAddFrame,
  onImageUpload,
  deletingFrameId = null,
  isAddingFrame = false,
  loading = false,
  cardsLength = 0,
  aspectRatio = '16:9',
  containerMaxWidth,
  cardWidth,
  onReorder,
  selectedFrameId,
  onBackgroundClick,
  mode,
  selectedFrameIds,
  onCardSelect,
}) => {
  const aspectValue = RATIO_TO_CSS[aspectRatio]
  const normalizedCardWidth = useMemo(() => clampCardWidth(cardWidth), [cardWidth])
  const [activeId, setActiveId] = useState<string | null>(null)
  const gridTemplateColumns = useMemo(
    () => `repeat(auto-fit, minmax(${normalizedCardWidth}px, 1fr))`,
    [normalizedCardWidth]
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleOpenFrame = useCallback(
    (frameIndex: number) => {
      onFrameOpen(frameIndex)
    },
    [onFrameOpen]
  )

  const handleEditFrame = useCallback(
    (frameId: string) => {
      onFrameEdit(frameId)
    },
    [onFrameEdit]
  )

  const handleDeleteFrame = useCallback(
    (frameId: string) => {
      onFrameDelete(frameId)
    },
    [onFrameDelete]
  )

  const handleInsertFrame = useCallback(
    (insertIndex?: number, duplicateFrameId?: string) => {
      onAddFrame(insertIndex, duplicateFrameId)
    },
    [onAddFrame]
  )

  const handleImageUploadForFrame = useCallback(
    (frameId: string, file: File) => {
      if (!onImageUpload) {
        return Promise.resolve()
      }
      return onImageUpload(frameId, file)
    },
    [onImageUpload]
  )

  const handleCardSelectInternal = useCallback(
    (frameId: string, event: React.MouseEvent<HTMLButtonElement>) => {
      onCardSelect?.(frameId, { multi: event.shiftKey })
    },
    [onCardSelect]
  )

  const handleQuickSelect = useCallback(
    (frameId: string) => {
      onCardSelect?.(frameId, { multi: false, toggle: true })
    },
    [onCardSelect]
  )

  const handleQuickVideoSelect = useCallback(
    (frameId: string) => {
      onCardSelect?.(frameId, { multi: true, toggle: true })
    },
    [onCardSelect]
  )

  const handleSetAsStart = useCallback(
    (frameId: string) => {
      onCardSelect?.(frameId, { multi: true, role: 'start' })
    },
    [onCardSelect]
  )

  const handleSetAsEnd = useCallback(
    (frameId: string) => {
      onCardSelect?.(frameId, { multi: true, role: 'end' })
    },
    [onCardSelect]
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
        className="flex justify-center"
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
              const isVideoMode = mode === 'video'
              const isSelected =
                isVideoMode && Array.isArray(selectedFrameIds)
                  ? selectedFrameIds.includes(frame.id)
                  : selectedFrameId === frame.id
              
              // 비디오 모드에서 start/end 역할 확인
              const videoRole = (() => {
                if (!isVideoMode || !Array.isArray(selectedFrameIds)) return null
                const index = selectedFrameIds.indexOf(frame.id)
                if (index === 0) return 'start'
                if (index === 1) return 'end'
                return null
              })()
              
              const hoverActions = (() => {
                if (mode === 'video') {
                  const actions = []
                  
                  if (videoRole === 'start') {
                    // Start로 선택된 경우
                    actions.push({
                      id: 'remove-start',
                      label: 'Remove start',
                      icon: XCircle,
                      onClick: () => handleQuickVideoSelect(frame.id),
                    })
                    // End가 없으면 end로 변경 가능
                    if (selectedFrameIds?.length === 1) {
                      actions.push({
                        id: 'change-to-end',
                        label: 'Set as end',
                        icon: Square,
                        onClick: () => handleSetAsEnd(frame.id),
                      })
                    }
                  } else if (videoRole === 'end') {
                    // End로 선택된 경우
                    actions.push({
                      id: 'remove-end',
                      label: 'Remove end',
                      icon: XCircle,
                      onClick: () => handleQuickVideoSelect(frame.id),
                    })
                  } else {
                    // 선택되지 않은 경우
                    actions.push({
                      id: 'set-start',
                      label: 'Set as start',
                      icon: Play,
                      onClick: () => handleSetAsStart(frame.id),
                    })
                    actions.push({
                      id: 'set-end',
                      label: 'Set as end',
                      icon: Square,
                      onClick: () => handleSetAsEnd(frame.id),
                    })
                  }
                  
                  return actions
                }
                if (mode === 'generate' || mode === 'edit') {
                  return [
                    {
                      id: 'select',
                      label: isSelected ? 'Deselect' : 'Select',
                      icon: isSelected ? CheckCircle2 : Circle,
                      onClick: () => handleQuickSelect(frame.id),
                    },
                  ]
                }
                return []
              })()

              return (
                <SortableFrameCard
                  key={frame.id}
                  frame={frame}
                  index={index}
                  deleting={deletingFrameId === frame.id}
                  aspectRatio={aspectRatio}
                  cardWidth={frameWidth}
                  onOpen={handleOpenFrame}
                  onEdit={handleEditFrame}
                  onDelete={handleDeleteFrame}
                  onImageUpload={onImageUpload ? handleImageUploadForFrame : undefined}
                  onInsert={handleInsertFrame}
                  hoverActions={hoverActions}
                  highlight={
                    activeId === frame.id ||
                    (mode === 'video'
                      ? Array.isArray(selectedFrameIds) && selectedFrameIds.includes(frame.id)
                      : selectedFrameId === frame.id)
                  }
                  onCardSelect={onCardSelect ? handleCardSelectInternal : undefined}
                />
              )
            })}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // 이벤트 전파 방지
                if (!isAddingFrame) {
                  onAddFrame()
                }
              }}
              disabled={isAddingFrame}
              className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isAddingFrame
                  ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                  : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-black dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
              style={{ aspectRatio: aspectValue }}
              aria-label="Add new frame"
            >
              {isAddingFrame ? (
                <>
                  <div className="mb-1 h-7 w-7 border-2 border-neutral-400 dark:border-neutral-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Adding scene...</span>
                </>
              ) : (
                <>
                  <Plus className="mb-1 h-7 w-7 text-black dark:text-neutral-400" />
                  <span className="text-sm font-medium text-black dark:text-neutral-400">Add new scene</span>
                </>
              )}
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
              imageFit="contain"
              aspectRatio={aspectRatio}
              cardWidth={activeCardWidth}
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
  highlight: boolean
  onOpen: (frameIndex: number) => void
  onEdit: (frameId: string) => void
  onDelete: (frameId: string) => void
  onInsert: (insertIndex?: number, duplicateFrameId?: string) => void
  onImageUpload?: (frameId: string, file: File) => Promise<void>
  onCardSelect?: (frameId: string, event: React.MouseEvent<HTMLButtonElement>) => void
  hoverActions?: Array<{
    id: string
    label: string
    icon?: React.FC<{ className?: string }>
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  }>
}

const SortableFrameCardComponent: React.FC<SortableFrameCardProps> = ({
  frame,
  index,
  deleting,
  aspectRatio,
  cardWidth,
  highlight,
  onOpen,
  onEdit,
  onDelete,
  onInsert,
  onImageUpload,
  onCardSelect,
  hoverActions,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  })

  const handleOpenCard = useCallback(() => {
    onOpen(index)
  }, [index, onOpen])

  const handleEditCard = useCallback(() => {
    onEdit(frame.id)
  }, [frame.id, onEdit])

  const handleDeleteCard = useCallback(() => {
    onDelete(frame.id)
  }, [frame.id, onDelete])

  const handleAddBefore = useCallback(() => {
    onInsert(index, frame.id)
  }, [frame.id, index, onInsert])

  const handleAddAfter = useCallback(() => {
    onInsert(index + 1, frame.id)
  }, [frame.id, index, onInsert])

  const handleImageUpload = useCallback(
    (file: File) => {
      if (!onImageUpload) {
        return Promise.resolve()
      }
      return onImageUpload(frame.id, file)
    },
    [frame.id, onImageUpload]
  )

  const handleCardClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!onCardSelect) {
        return
      }
      event.stopPropagation()
      onCardSelect(frame.id, event)
    },
    [frame.id, onCardSelect]
  )

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 15 : undefined,
    touchAction: 'none',
    // 드래그 중에는 투명하게 만들어서 그리드 레이아웃 유지
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative w-full cursor-grab active:cursor-grabbing rounded-lg',
        isDragging && 'ring-2 ring-neutral-900/80 dark:ring-white/80 shadow-lg',
        highlight && !isDragging && 'ring-2 ring-neutral-900 dark:ring-white'
      )}
      {...attributes}
      {...listeners}
    >
      {index === 0 && (
        <SideInsertButton
          position="left"
          label="Add scene at the beginning"
          onClick={handleAddBefore}
        />
      )}

      <StoryboardCard
        sceneNumber={index + 1}
        imageUrl={frame.imageUrl}
        status={frame.status}
        imageFit="contain"
        deleting={deleting}
        onOpen={handleOpenCard}
        onEdit={handleEditCard}
        onDelete={handleDeleteCard}
        onImageUpload={onImageUpload ? handleImageUpload : undefined}
        onCardClick={onCardSelect ? handleCardClick : undefined}
        aspectRatio={aspectRatio}
        cardWidth={cardWidth}
        hoverActions={hoverActions}
      />

      <SideInsertButton
        position="right"
        label={`Add scene after scene ${index + 1}`}
        onClick={handleAddAfter}
      />
    </div>
  )
}

const SortableFrameCard = React.memo(SortableFrameCardComponent)
