'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import type { Card, Storyboard } from '@/types'
import { useParams, useRouter } from 'next/navigation'
import type { Character } from '@/types'
import { useHydratedUIStore } from '@/store/ui'
import { useAuth } from '@clerk/nextjs'
import FrameEditModal from '@/components/storyboard/FrameEditModal'
import FrameGrid from '@/components/storyboard/viewer/FrameGrid'
import FrameList from '@/components/storyboard/viewer/FrameList'
import ViewModeToggle from '@/components/storyboard/ViewModeToggle'
import FloatingHeader from '@/components/storyboard/FloatingHeader'
import PromptDock from '@/components/storyboard/PromptDock'
import ThemeToggle from '@/components/ui/theme-toggle'
import { ArrowLeft } from 'lucide-react'
import { cardToFrame } from '@/lib/utils'
import { createAndLinkCard } from '@/lib/cards'
import { buildPromptWithCharacterMentions, resolveCharacterMentions } from '@/lib/characterMentions'
import StoryboardWidthControls from '@/components/storyboard/StoryboardWidthControls'
import EmptyStoryboardState from '@/components/storyboard/EmptyStoryboardState'
import VideoPreviewModal from '@/components/storyboard/VideoPreviewModal'
import LoadingGrid from '@/components/storyboard/LoadingGrid'
import { useCardWidth } from '@/hooks/useCardWidth'
import { useStoryboardNavigation } from '@/hooks/useStoryboardNavigation'
import { useFrameManagement } from '@/hooks/useFrameManagement'
import { useCards, useProjects } from '@/lib/api'
import {
  DEFAULT_RATIO,
  CARD_WIDTH_MIN,
  CARD_WIDTH_MAX,
  DEFAULT_CARD_WIDTH,
  clampCardWidth,
} from '@/lib/constants'
import { loadProjectRatio, saveProjectRatio } from '@/lib/localStorage'
import { useBackgroundStore } from '@/store/backgrounds'

// Removed legacy local caches; SWR가 카드 데이터를 관리합니다.
type CardImageUpdate = Partial<
  Pick<
    Card,
    'image_url' | 'image_urls' | 'selected_image_url' | 'image_key' | 'image_size' | 'image_type'
  >
>

export default function StoryboardPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id
  const { userId, isLoaded } = useAuth()

  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null)
  // Initialize with DEFAULT_RATIO to avoid hydration mismatch
  const [ratio, setRatioState] = useState<StoryboardAspectRatio>(DEFAULT_RATIO)

  // Load saved ratio from localStorage after mount (client-side only)
  useEffect(() => {
    if (projectId) {
      const savedRatio = loadProjectRatio(projectId)
      if (savedRatio && ['16:9', '4:3', '3:2', '2:3', '3:4', '9:16'].includes(savedRatio)) {
        setRatioState(savedRatio as StoryboardAspectRatio)
      }
    }
  }, [projectId])

  // Wrapper to also save to localStorage when ratio changes
  const setRatio = useCallback(
    (newRatio: StoryboardAspectRatio) => {
      setRatioState(newRatio)
      if (projectId) {
        saveProjectRatio(projectId, newRatio)
      }
    },
    [projectId]
  )
  // 컨테이너 폭 제어 제거 (DND 정렬 + 자동 래핑 사용)
  const [showWidthControls, setShowWidthControls] = useState(false)
  const [projectCharacters, setProjectCharacters] = useState<Character[]>([])
  const [promptDockMode, setPromptDockMode] = useState<'generate' | 'edit'>('generate')

  // View mode 상태: 'storyboard' | 'models'
  const [viewMode, setViewMode] = useState<'storyboard' | 'models'>('storyboard')
  // UI Store 연결 - 뷰 모드 관리 (hydration 안전)
  const { storyboardViewMode, setStoryboardViewMode, isClient } = useHydratedUIStore()

  // Background store
  const { initializeBackgrounds, setProjectId } = useBackgroundStore()

  // Set project ID for background store
  useEffect(() => {
    if (projectId) {
      setProjectId(projectId)
    }
  }, [projectId, setProjectId])

  // SWR cards first (used by downstream hooks)
  const { cards: queryCards, updateCards, isLoading: cardsLoading } = useCards(projectId!)

  // Custom hooks
  const {
    cardWidth,
    setCardWidth,
    latestCardWidthRef,
    persistCardWidthTimeout,
    handleCardWidthChange,
    readStoredCardWidth,
    persistCardWidthLocally,
    schedulePersistCardWidth,
  } = useCardWidth(projectId, undefined, { cards: queryCards, updateCards })
  const { handleNavigateToStoryboard, handleNavigateToCharacters, handleOpenFrame } =
    useStoryboardNavigation(projectId, index, setViewMode)
  const {
    deletingFrameId,
    generatingVideoId,
    videoPreview,
    setVideoPreview,
    framesRef,
    handleAddFrame,
    handleDeleteFrame,
    handleReorderFrames,
    handleGenerateVideo,
    handlePlayVideo,
  } = useFrameManagement(projectId, userId ?? null, latestCardWidthRef)

  // SWR 훅 사용 moved above
  const { projects } = useProjects()

  // 안정적인 이미지 업데이트 콜백
  // 통일된 카드 패치 함수
  const patchCards = useCallback(
    async (patches: Partial<Card>[]) => {
      await updateCards(patches)
    },
    [updateCards]
  )

  const handleImageUpdated = useCallback(
    async (
      frameId: string,
      newUrl: string,
      metadata?: { key?: string; size?: number; type?: string }
    ) => {
      if (newUrl.startsWith('blob:') || newUrl.startsWith('data:')) return

      const updateData: CardImageUpdate = {
        image_url: newUrl,
        image_urls: [newUrl],
        selected_image_url: 0,
      }
      if (metadata?.key) updateData.image_key = metadata.key
      if (metadata?.size) updateData.image_size = metadata.size
      if (metadata?.type) updateData.image_type = metadata.type

      try {
        await patchCards([{ id: frameId, ...updateData } as Partial<Card>])
      } catch (error) {
        console.error('Failed to save image URL to database:', error)
      }
    },
    [patchCards]
  )

  // framesRef는 derived.frames 기준으로만 유지 (상단 effect에서 처리)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && persistCardWidthTimeout.current !== null) {
        window.clearTimeout(persistCardWidthTimeout.current)
      }
    }
  }, [])

  // 파생 데이터 파이프라인: 카드 폭 + 프레임/타이틀
  const resolvedCardWidth = useMemo(() => {
    const firstWithWidth = queryCards.find(
      (c: Card) => typeof c.card_width === 'number' && Number.isFinite(c.card_width)
    )
    const widthFromCards = firstWithWidth?.card_width as number | undefined
    const storedWidth = readStoredCardWidth()
    return clampCardWidth(widthFromCards ?? storedWidth ?? DEFAULT_CARD_WIDTH)
  }, [queryCards, readStoredCardWidth])

  // 현재 프로젝트 제목 (derived 생성 후 계산)
  // 대시보드의 프로젝트 타이틀을 우선 사용, 없으면 derived.title 사용
  // 위치를 derived 선언 이후로 옮겨 참조 에러 방지

  useEffect(() => {
    latestCardWidthRef.current = resolvedCardWidth
    setCardWidth(resolvedCardWidth)
    persistCardWidthLocally(resolvedCardWidth)
  }, [resolvedCardWidth, setCardWidth, persistCardWidthLocally])

  const derived = useMemo(() => {
    const orderedCards = [...queryCards].sort(
      (a: Card, b: Card) => (a.order_index ?? 0) - (b.order_index ?? 0)
    )
    const frames = orderedCards.map((card, idx) => {
      const baseFrame = cardToFrame(card, idx)
      const normalizedWidth =
        typeof baseFrame.cardWidth === 'number' && Number.isFinite(baseFrame.cardWidth)
          ? clampCardWidth(baseFrame.cardWidth)
          : resolvedCardWidth
      return { ...baseFrame, cardWidth: normalizedWidth }
    })
    const title =
      orderedCards.length > 0
        ? `Storyboard: ${(orderedCards[0].title ?? '').replace(/^Scene \d+:?\s*/, '') || 'Untitled'}`
        : 'New Storyboard'
    return { frames, title }
  }, [queryCards, resolvedCardWidth])

  // 현재 프로젝트 제목 (대시보드와 동기화)
  const currentProjectTitle = useMemo(() => {
    const fromProjects = projects.find((p: any) => p.id === projectId)?.title
    if (typeof fromProjects === 'string' && fromProjects.trim().length > 0) {
      return fromProjects
    }
    return derived?.title
  }, [projects, projectId, derived?.title])

  useEffect(() => {
    framesRef.current = derived.frames
  }, [derived.frames])

  // 별도 loading state 제거: cardsLoading 직접 사용

  useEffect(() => {
    if (!projectId || !userId) {
      setProjectCharacters([])
      return
    }

    let cancelled = false

    const loadCharacters = async () => {
      try {
        const response = await fetch(
          `/api/characters?project_id=${encodeURIComponent(projectId)}`,
          {
            credentials: 'include',
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to load characters: ${response.status}`)
        }

        const payload = await response.json().catch(() => ({}))
        const characters = Array.isArray(payload?.characters) ? payload.characters : []

        if (!cancelled) {
          setProjectCharacters(characters)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[StoryboardPage] Failed to load project characters:', error)
          setProjectCharacters([])
        }
      }
    }

    loadCharacters()

    return () => {
      cancelled = true
    }
  }, [projectId, userId])

  // 시그니처 기반 동기화 제거: derived 파이프라인으로 대체됨

  // viewportWidth 제거에 따라 resize 리스너도 제거

  // 쿼리 결과 동기화는 derived 파이프라인으로 대체

  // 네비게이션 핸들러 (커스텀 훅에서 가져옴)

  // 프레임 관리 핸들러 (커스텀 훅에서 가져옴)

  const handleGenerateSceneFromPrompt = useCallback(
    async (promptText: string) => {
      if (!userId || !projectId) {
        throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
      }

      const trimmedPrompt = promptText.trim()
      if (!trimmedPrompt) {
        throw new Error('생성할 씬에 대한 설명을 입력해 주세요.')
      }

      const mentionMatches = resolveCharacterMentions(trimmedPrompt, projectCharacters)
      const requestPrompt = buildPromptWithCharacterMentions(trimmedPrompt, mentionMatches)
      const mentionImageUrls = Array.from(new Set(mentionMatches.flatMap(match => match.imageUrls)))

      const currentCardsSnapshot = queryCards || []
      let inserted: Card | null = null

      try {
        inserted = await createAndLinkCard(
          {
            userId,
            projectId: projectId,
            currentCards: currentCardsSnapshot,
            cardWidth: latestCardWidthRef.current,
          },
          'TIMELINE_GENERATE'
        )
      } catch (error) {
        throw error instanceof Error
          ? new Error(error.message)
          : new Error('씬을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      }

      if (!inserted) {
        throw new Error('새로운 씬이 정상적으로 생성되지 않았습니다.')
      }

      const normalizedWidth = clampCardWidth(latestCardWidthRef.current)
      const insertedWithPrompt: Card = {
        ...inserted,
        card_width:
          typeof inserted.card_width === 'number' && Number.isFinite(inserted.card_width)
            ? clampCardWidth(inserted.card_width)
            : normalizedWidth,
        shot_description: trimmedPrompt,
        image_prompt: trimmedPrompt,
        storyboard_status: 'generating',
      }

      const cardsAfterInsert = [...currentCardsSnapshot, insertedWithPrompt]

      try {
        const generationPayload: Record<string, unknown> = {
          prompt: requestPrompt,
          aspectRatio: ratio,
        }
        if (mentionImageUrls.length > 0) {
          generationPayload.imageUrls = mentionImageUrls
        }

        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generationPayload),
        })

        const payload = (await response.json().catch(() => ({}))) as {
          imageUrl?: string
          error?: string
        }

        if (!response.ok || !payload?.imageUrl) {
          throw new Error(payload?.error || '이미지를 생성할 수 없습니다.')
        }

        const generatedImageUrl = payload.imageUrl

        const updateResponse = await fetch('/api/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cards: [
              {
                id: insertedWithPrompt.id,
                image_url: generatedImageUrl,
                image_prompt: trimmedPrompt,
                shot_description: trimmedPrompt,
                storyboard_status: 'ready',
              },
            ],
          }),
        })

        const updatePayload = (await updateResponse.json().catch(() => ({}))) as {
          error?: string
        }

        if (!updateResponse.ok) {
          throw new Error(updatePayload?.error || '생성된 이미지를 저장하지 못했습니다.')
        }

        // SWR로 카드가 업데이트되면 derived를 통해 반영됨
      } catch (error) {
        // 오류 상태는 카드 업데이트 후 SWR을 통해 반영됨
        throw error instanceof Error
          ? error
          : new Error('씬 생성 중 문제가 발생했습니다. 나중에 다시 시도해 주세요.')
      }
    },
    [userId, projectId, ratio, projectCharacters]
  )

  // 비디오 관련 핸들러 (커스텀 훅에서 가져옴)

  useEffect(() => {
    if (!videoPreview) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVideoPreview(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [videoPreview])

  // 현재 프레임 안정적 참조
  const currentFrame = useMemo(() => derived.frames[index] || null, [derived.frames, index])

  // 공통 프레임 조작 핸들러
  const handleFrameDeleteLocal = useCallback(
    async (frameId: string) => {
      try {
        const newFrames = await handleDeleteFrame(frameId)
        if (newFrames) {
          setIndex(prev => (newFrames.length === 0 ? 0 : Math.min(prev, newFrames.length - 1)))
        }
      } catch (error) {
        console.error('Failed to delete frame:', error)
      }
    },
    [handleDeleteFrame]
  )

  const handleFrameAddLocal = useCallback(
    async (insertIndex?: number, duplicateFrameId?: string) => {
      try {
        const newFrames = await handleAddFrame(insertIndex, duplicateFrameId)
        if (newFrames) {
          setIndex(insertIndex ?? newFrames.length - 1)
        }
      } catch (error) {
        console.error('Failed to add frame:', error)
      }
    },
    [handleAddFrame]
  )

  const canShowWidthControlsPanel =
    viewMode === 'storyboard' && (!isClient || storyboardViewMode === 'grid')

  // 카드 선택 취소 함수
  const handleDeselectCard = useCallback(() => {
    setIndex(-1) // 선택 해제
  }, [])

  return (
    <div>
      <div className="w-full px-4">
        {/* Header 라인: Dashboard 버튼 + FloatingHeader + ViewModeToggle */}
        <div className="relative mx-auto mb-6 w-full max-w-[1920px] flex items-center gap-4">
          {/* Dashboard 버튼 */}
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg shadow-lg transition-all flex-shrink-0 h-[48px]"
            style={{ 
              color: 'hsl(var(--foreground))'
            }}
            title="돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          {/* FloatingHeader */}
          <div className="flex-1 flex justify-center min-w-0 relative">
            <div className="relative w-full max-w-[1600px]">
              <FloatingHeader
                title={currentProjectTitle}
                index={index}
                total={derived.frames.length}
                currentView={viewMode}
                onNavigateToStoryboard={handleNavigateToStoryboard}
                onNavigateToCharacters={handleNavigateToCharacters}
                isWidthPanelOpen={showWidthControls}
                onToggleWidthPanel={() => setShowWidthControls(prev => !prev)}
                layout="inline"
                containerClassName="w-full"
                className="w-full max-w-[1600px]"
                projectId={projectId}
              />
              
              {/* Width Controls Panel - FloatingHeader 바로 아래, SlidersHorizontal 버튼 위치 기준 */}
              {canShowWidthControlsPanel && (
                <div className="absolute top-full left-0 mt-2 z-[60]" style={{ left: '16px' }}>
                  <div className="hidden sm:block">
                    <StoryboardWidthControls
                      visible={showWidthControls}
                      cardWidthMin={CARD_WIDTH_MIN}
                      cardWidthMax={CARD_WIDTH_MAX}
                      normalizedCardWidth={clampCardWidth(cardWidth)}
                      onCardWidthChange={handleCardWidthChange}
                      aspectRatio={ratio}
                      onAspectRatioChange={setRatio}
                      onClose={() => setShowWidthControls(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Width Controls */}
          {canShowWidthControlsPanel && showWidthControls && (
            <div className="mt-4 sm:hidden w-full">
              <StoryboardWidthControls
                visible={showWidthControls}
                cardWidthMin={CARD_WIDTH_MIN}
                cardWidthMax={CARD_WIDTH_MAX}
                normalizedCardWidth={clampCardWidth(cardWidth)}
                onCardWidthChange={handleCardWidthChange}
                aspectRatio={ratio}
                onAspectRatioChange={setRatio}
                onClose={() => setShowWidthControls(false)}
              />
            </div>
          )}

          {/* 우측 컨트롤: ViewModeToggle + ThemeToggle */}
          <div className="flex-shrink-0 flex items-center gap-3 z-50">
            {/* ThemeToggle */}
            <ThemeToggle />
            
            {/* ViewModeToggle - 스토리보드 뷰에서만 표시, 클라이언트에서만 실제 상태 표시 */}
            {viewMode === 'storyboard' && (
              <ViewModeToggle
                viewMode={isClient ? storyboardViewMode : 'grid'}
                onSetGrid={() => setStoryboardViewMode('grid')}
                onSetList={() => setStoryboardViewMode('list')}
              />
            )}
          </div>
        </div>

        {/* 스토리보드 뷰 */}
        {viewMode === 'storyboard' && (
          <>
            {/* Error message */}
            {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

            {/* 콘텐츠 렌더링 */}
            {derived.frames.length === 0 && cardsLoading && (
              <LoadingGrid cardsLength={0} aspectRatio={ratio} cardWidth={cardWidth} />
            )}

            {derived.frames.length === 0 && !cardsLoading && (
              <EmptyStoryboardState
                onCreateFirstCard={async () => {
                  try {
                    const newFrames = await handleAddFrame()
                    if (newFrames) {
                      setIndex(0)
                    }
                  } catch (error) {
                    console.error('Failed to create first card:', error)
                  }
                }}
              />
            )}

            {derived.frames.length > 0 && (!isClient || storyboardViewMode === 'grid') && (
              <FrameGrid
                frames={derived.frames}
                onFrameOpen={frameIndex => {
                  setIndex(frameIndex)
                }}
                onFrameEdit={frameId => {
                  const frameData = derived.frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={handleFrameDeleteLocal}
                onAddFrame={handleFrameAddLocal}
                deletingFrameId={deletingFrameId}
                loading={cardsLoading}
                cardsLength={queryCards.length}
                onGenerateVideo={async frameId => {
                  try {
                    await handleGenerateVideo(frameId, derived.frames)
                    // Update frames with video data
                    // derived 기반이라 setFrames 필요 없음
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to generate video')
                  }
                }}
                onPlayVideo={frameId => {
                  try {
                    handlePlayVideo(frameId, derived.frames)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'No video available')
                  }
                }}
                generatingVideoId={generatingVideoId}
                aspectRatio={ratio}
                cardWidth={cardWidth}
                selectedFrameId={index >= 0 ? derived.frames[index]?.id : undefined}
                onBackgroundClick={handleDeselectCard}
                onReorder={(fromIndex, toIndex) => {
                  const result = handleReorderFrames(fromIndex, toIndex)
                  if (result) {
                    setIndex(result.newIndex)
                  }
                }}
              />
            )}

            {derived.frames.length > 0 && isClient && storyboardViewMode === 'list' && (
              <FrameList
                frames={derived.frames}
                onFrameEdit={frameIndex => {
                  setIndex(frameIndex)
                }}
                onFrameEditMetadata={frameId => {
                  const frameData = derived.frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={handleFrameDeleteLocal}
                onAddFrame={handleFrameAddLocal}
                deletingFrameId={deletingFrameId}
                onGenerateVideo={async frameId => {
                  try {
                    await handleGenerateVideo(frameId, derived.frames)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to generate video')
                  }
                }}
                onPlayVideo={frameId => {
                  try {
                    handlePlayVideo(frameId, derived.frames)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'No video available')
                  }
                }}
                generatingVideoId={generatingVideoId}
                aspectRatio={ratio}
                selectedFrameId={index >= 0 ? derived.frames[index]?.id : undefined}
              />
            )}
          </>
        )}

        {/* 프레임 편집 모달 */}
        {editingFrame && (
          <FrameEditModal
            frame={editingFrame}
            projectId={projectId}
            onClose={() => setEditingFrame(null)}
            onSaved={() => {
              // SWR에 의해 자동 반영되므로 모달만 닫음
              setEditingFrame(null)
            }}
          />
        )}
      </div>

      {/* 하단 고정 프롬프트 입력 바 */}
      {!editingFrame && (
        <PromptDock
          projectId={projectId}
          aspectRatio={ratio}
          onAspectRatioChange={setRatio}
          selectedShotNumber={
            index >= 0 && derived.frames[index]
              ? derived.frames[index].scene || index + 1
              : undefined
          }
          onClearSelectedShot={() => setIndex(-1)}
          mode={promptDockMode}
          onModeChange={setPromptDockMode}
          referenceImageUrl={
            index >= 0 && derived.frames[index] ? derived.frames[index].imageUrl : undefined
          }
          onCreateFrame={async (imageUrl: string) => {
            try {
              const hasSelection = index >= 0 && Boolean(derived.frames[index])
              if (hasSelection) {
                const targetFrame = derived.frames[index]
                const targetCardId = targetFrame.id
                const targetCard = (queryCards || []).find((c: Card) => c.id === targetCardId)

                const prevImage = targetCard?.image_url || targetFrame.imageUrl
                const existingHistory = Array.isArray(targetCard?.image_urls)
                  ? targetCard!.image_urls!
                  : []
                const newHistory = prevImage ? [...existingHistory, prevImage] : existingHistory

                await patchCards([
                  {
                    id: targetCardId,
                    image_url: imageUrl,
                    image_urls: newHistory,
                    selected_image_url: 0,
                    storyboard_status: 'ready',
                  } as Partial<Card>,
                ])
                return
              }

              const newFrames = await handleAddFrame()
              if (newFrames && newFrames.length) {
                // derived로 반영됨
              }
            } catch (e) {
              console.error('Failed to apply generated image:', e)
            }
          }}
        />
      )}

      {videoPreview && (
        <VideoPreviewModal url={videoPreview.url} onClose={() => setVideoPreview(null)} />
      )}
    </div>
  )
}
