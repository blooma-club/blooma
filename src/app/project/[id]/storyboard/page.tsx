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
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { cardToFrame } from '@/lib/utils'
import { createAndLinkCard } from '@/lib/cards'
import { buildPromptWithCharacterMentions, resolveCharacterMentions } from '@/lib/characterMentions'
import StoryboardWidthControls from '@/components/storyboard/StoryboardWidthControls'
import EmptyStoryboardState from '@/components/storyboard/EmptyStoryboardState'
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
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'

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
  const [promptDockMode, setPromptDockMode] = useState<'generate' | 'edit' | 'video'>('generate')
  const [isPromptDockVisible, setIsPromptDockVisible] = useState(true)

  // 비디오 모드 전용: 멀티 선택 상태(최대 2개)
  const [videoSelectedIds, setVideoSelectedIds] = useState<string[]>([])

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

  // 현재 프레임 안정적 참조
  const currentFrame = useMemo(() => derived.frames[index] || null, [derived.frames, index])

  // 비디오 모드에서 선택된 카드들의 상세 정보 매핑
  const videoSelection = useMemo(
    () =>
      videoSelectedIds
        .map(id => {
          const f = derived.frames.find(fr => fr.id === id)
          if (!f) return null
          return {
            id: f.id,
            shotNumber: typeof f.scene === 'number' ? f.scene : derived.frames.indexOf(f) + 1,
            imageUrl: f.imageUrl ?? null,
          }
        })
        .filter(Boolean) as Array<{ id: string; shotNumber?: number; imageUrl?: string | null }>,
    [videoSelectedIds, derived.frames]
  )

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
    setVideoSelectedIds([])
  }, [])

  // 모드 전환 시 비디오 선택 초기화
  useEffect(() => {
    if (promptDockMode !== 'video' && videoSelectedIds.length > 0) {
      setVideoSelectedIds([])
    }
  }, [promptDockMode, videoSelectedIds.length])

  // Grid에서 카드 클릭(Shift 멀티선택 포함) 처리
  const handleGridCardSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (promptDockMode !== 'video') {
        // 비디오 모드가 아니면 단일 선택만 유지
        setIndex(derived.frames.findIndex(fr => fr.id === id))
        return
      }

      const isShift = e.shiftKey === true
      // Shift가 아니면 단일 선택으로 전환
      if (!isShift) {
        setVideoSelectedIds([id])
        setIndex(derived.frames.findIndex(fr => fr.id === id))
        return
      }

      // Shift인 경우 토글 + 최대 2 제한
      setVideoSelectedIds(prev => {
        const exists = prev.includes(id)
        if (exists) {
          const next = prev.filter(x => x !== id)
          return next
        }
        if (prev.length >= 2) {
          // 2개 초과 금지: 유지
          return prev
        }
        return [...prev, id]
      })
    },
    [promptDockMode, derived.frames]
  )

  return (
    <div>
      <div className="w-full">
        {/* Header Container */}
        <div className="relative mx-auto mb-6 w-full max-w-[1920px] flex items-center justify-between gap-4">
          {/* 좌측: 프로젝트 제목 헤더 */}
          <div className="flex-shrink-0 z-10">
            <FloatingHeader
              title={currentProjectTitle}
              index={index}
              total={derived.frames.length}
              currentView={viewMode}
              onNavigateToStoryboard={handleNavigateToStoryboard}
              onNavigateToCharacters={handleNavigateToCharacters}
              layout="inline"
              containerClassName=""
              className=""
              projectId={projectId}
            />
          </div>

          {/* 중앙: 뷰 전환 탭 (Storyboard/Models) */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10">
            <div className="h-[48px] flex items-center rounded-lg border border-neutral-200/80 dark:border-neutral-700/50 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-neutral-900/95 p-1">
              <button
                onClick={handleNavigateToStoryboard}
                className={`h-[36px] px-5 rounded-md transition-all duration-200 text-sm font-medium ${
                  viewMode === 'storyboard'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
                }`}
              >
                Storyboard
              </button>
              <button
                onClick={handleNavigateToCharacters}
                className={`h-[36px] px-5 rounded-md transition-all duration-200 text-sm font-medium ${
                  viewMode === 'models'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
                }`}
              >
                Models
              </button>
            </div>
          </div>
          
          {/* 우측: 통합 설정 헤더 그룹 */}
          <div className="flex-shrink-0 z-10">
            <div className="h-[48px] rounded-lg border border-neutral-200/80 dark:border-neutral-700/50 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-neutral-900/95 flex items-center gap-1 px-2">
              {/* View Mode Toggle - 스토리보드 뷰에서만 표시 */}
              {viewMode === 'storyboard' && (
                <>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setStoryboardViewMode('grid')}
                      className={`h-[32px] w-[32px] rounded-md transition-all duration-200 flex items-center justify-center ${
                        (isClient ? storyboardViewMode : 'grid') === 'grid'
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
                      }`}
                      aria-label="Grid view"
                      title="Grid view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setStoryboardViewMode('list')}
                      className={`h-[32px] w-[32px] rounded-md transition-all duration-200 flex items-center justify-center ${
                        (isClient ? storyboardViewMode : 'grid') === 'list'
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
                      }`}
                      aria-label="List view"
                      title="List view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>

                  {/* 구분선 */}
                  <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
                </>
              )}

              {/* Theme Toggle */}
              <div className="flex items-center">
                <ThemeToggle />
              </div>

              {/* 구분선 */}
              <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

              {/* Card Width 조절 버튼 */}
              {canShowWidthControlsPanel && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowWidthControls(prev => !prev)}
                    className={`h-[32px] w-[32px] flex items-center justify-center rounded-md transition-all duration-200 ${
                      showWidthControls
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
                    }`}
                    aria-label={showWidthControls ? 'Hide layout controls' : 'Show layout controls'}
                    title="Card size"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>

                  {/* Width Controls Panel */}
                  {showWidthControls && (
                    <div className="absolute top-full right-0 mt-2 z-[60]">
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
              )}

              {/* 구분선 */}
              <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

              {/* PromptDock 숨기기 버튼 */}
              <button
                type="button"
                onClick={() => setIsPromptDockVisible(prev => !prev)}
                className={`h-[32px] w-[32px] flex items-center justify-center rounded-md transition-all duration-200 ${
                  !isPromptDockVisible
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
                }`}
                aria-label={isPromptDockVisible ? 'Hide PromptDock' : 'Show PromptDock'}
                title={isPromptDockVisible ? 'Hide prompt dock' : 'Show prompt dock'}
              >
                {isPromptDockVisible ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
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
                mode={promptDockMode}
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
                onStopVideo={frameId => {
                  if (videoPreview?.frameId === frameId) {
                    setVideoPreview(null)
                  }
                }}
                activeVideoFrameId={videoPreview?.frameId}
                activeVideoUrl={videoPreview?.url}
                generatingVideoId={generatingVideoId}
                aspectRatio={ratio}
                cardWidth={cardWidth}
                selectedFrameId={index >= 0 ? derived.frames[index]?.id : undefined}
                onBackgroundClick={handleDeselectCard}
                selectedFrameIds={videoSelectedIds}
                onCardSelect={handleGridCardSelect}
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
                onStopVideo={frameId => {
                  if (videoPreview?.frameId === frameId) {
                    setVideoPreview(null)
                  }
                }}
                activeVideoFrameId={videoPreview?.frameId}
                activeVideoUrl={videoPreview?.url}
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
      {!editingFrame && isPromptDockVisible && (
        <PromptDock
          projectId={projectId}
          aspectRatio={ratio}
          onAspectRatioChange={setRatio}
          selectedShotNumber={
            index >= 0 && derived.frames[index]
              ? derived.frames[index].scene || index + 1
              : undefined
          }
          selectedFrameId={
            index >= 0 && derived.frames[index] ? derived.frames[index].id : undefined
          }
          onClearSelectedShot={() => setIndex(-1)}
          mode={promptDockMode}
          onModeChange={setPromptDockMode}
          referenceImageUrl={
            index >= 0 && derived.frames[index] ? derived.frames[index].imageUrl : undefined
          }
          videoSelection={videoSelection}
          onGenerateVideo={async ({
            modelId,
            prompt: videoPromptOverride,
            startFrameId,
            endFrameId,
            startImageUrl,
            endImageUrl,
          }) => {
            if (!startFrameId) {
              setError('Select a start frame before generating a video.')
              return
            }
            try {
              await handleGenerateVideo(startFrameId, derived.frames, {
                modelId,
                startFrameId,
                endFrameId,
                startImageUrl,
                endImageUrl,
                prompt: videoPromptOverride,
              })
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Failed to generate video')
            }
          }}
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
    </div>
  )
}
