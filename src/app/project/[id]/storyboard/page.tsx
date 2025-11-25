'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import type { Card } from '@/types'
import { useParams } from 'next/navigation'
import { useHydratedUIStore } from '@/store/ui'
import { useAuth } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import FrameGrid from '@/components/storyboard/viewer/FrameGrid'
import FrameList from '@/components/storyboard/viewer/FrameList'
import FloatingHeader from '@/components/storyboard/FloatingHeader'
import ThemeToggle from '@/components/ui/theme-toggle'
import VideoPreviewModal from '@/components/storyboard/VideoPreviewModal'
import { SlidersHorizontal } from 'lucide-react'
import { createCard } from '@/lib/cards'
import { buildPromptWithCharacterMentions, resolveCharacterMentions } from '@/lib/characterMentions'
import StoryboardWidthControls from '@/components/storyboard/StoryboardWidthControls'
import EmptyStoryboardState from '@/components/storyboard/EmptyStoryboardState'
import LoadingGrid from '@/components/storyboard/LoadingGrid'
import { useCardWidth } from '@/hooks/useCardWidth'
import { useStoryboardNavigation } from '@/hooks/useStoryboardNavigation'
import { useFrameManagement } from '@/hooks/useFrameManagement'
import { useProjectCharacters } from '@/hooks/useProjectCharacters'
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
import {
  getOrCreateFrameFromCard,
  pruneFrameCache,
  type FrameCache,
} from '@/lib/storyboard/frameCache'
import { useHandleCreditError } from '@/hooks/useHandleCreditError'

const FrameInfoModal = dynamic(() => import('@/components/storyboard/FrameInfoModal'), {
  loading: () => null,
  ssr: false,
})

const PromptDock = dynamic(() => import('@/components/storyboard/PromptDock'), {
  loading: () => null,
  ssr: false,
})

export default function StoryboardPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id
  const { userId } = useAuth()

  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // editingFrameId만 저장하고, 실제 데이터는 derived.frames에서 가져옴
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null)
  const [ratio, setRatioState] = useState<StoryboardAspectRatio>(DEFAULT_RATIO)
  const [showWidthControls, setShowWidthControls] = useState(false)
  const [promptDockMode, setPromptDockMode] = useState<'generate' | 'edit' | 'video'>('generate')
  const [isPromptDockVisible, setIsPromptDockVisible] = useState(true)
  const [videoSelectedIds, setVideoSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'storyboard' | 'models'>('storyboard')
  const [isAddingFrame, setIsAddingFrame] = useState(false)
  const [initialLoadState, setInitialLoadState] = useState<'pending' | 'done'>('pending')

  const { characters: projectCharacters } = useProjectCharacters(projectId, userId)

  const { storyboardViewMode, setStoryboardViewMode, isClient } = useHydratedUIStore()
  const { initializeBackgrounds, setProjectId } = useBackgroundStore()

  // Load saved ratio from localStorage after mount (client-side only)
  useEffect(() => {
    if (projectId) {
      const savedRatio = loadProjectRatio(projectId)
      if (savedRatio && ['16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16'].includes(savedRatio)) {
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

  // Set project ID for background store
  useEffect(() => {
    if (projectId) {
      setProjectId(projectId)
    }
  }, [projectId, setProjectId])

  // SWR cards first (used by downstream hooks)
  const {
    cards: queryCards,
    updateCards,
    isLoading: cardsLoading,
    isInitialLoading: cardsInitialLoading,
  } = useCards(projectId!)

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
  const { handleNavigateToStoryboard, handleNavigateToCharacters } = useStoryboardNavigation(
    projectId,
    index,
    setViewMode
  )
  const {
    deletingFrameId,
    framesRef,
    handleAddFrame,
    handleDeleteFrame,
    handleReorderFrames,
    handleGenerateVideo,
    videoPreview,
    setVideoPreview,
  } = useFrameManagement(projectId, userId ?? null, latestCardWidthRef)
  const frameCacheRef = useRef<FrameCache>(new Map())

  // SWR 훅 사용 moved above
  const { projects } = useProjects()

  const isInitialLoadPending = initialLoadState === 'pending'

  useEffect(() => {
    if (!userId || cardsInitialLoading || cardsLoading) {
      setInitialLoadState('pending')
      return
    }
    setInitialLoadState('done')
  }, [userId, cardsInitialLoading, cardsLoading])

  const { handleCreditError } = useHandleCreditError()

  // 안정적인 이미지 업데이트 콜백
  // 통일된 카드 패치 함수
  const patchCards = useCallback(
    async (patches: Partial<Card>[]) => {
      await updateCards(patches)
    },
    [updateCards]
  )

  const updateCardImages = useCallback(
    async (
      cardId: string,
      imageUrl: string,
      options?: {
        metadata?: { key?: string; size?: number; type?: string }
        status?: Card['storyboard_status']
      }
    ) => {
      const currentCard = Array.isArray(queryCards)
        ? queryCards.find((card: Card) => card.id === cardId)
        : undefined
      const existingHistory: string[] = Array.isArray(currentCard?.image_urls)
        ? currentCard.image_urls.filter((url: unknown): url is string => typeof url === 'string')
        : []
      const previousUrl = currentCard?.image_url

      const sanitizedHistory = existingHistory.filter(
        (url: string) => url !== imageUrl && url !== previousUrl
      )
      const historyWithPrevious = previousUrl
        ? [previousUrl, ...sanitizedHistory]
        : sanitizedHistory

      const patch: Partial<Card> = {
        id: cardId,
        image_url: imageUrl,
        image_urls: [imageUrl, ...historyWithPrevious].slice(0, 20),
        selected_image_url: 0,
        storyboard_status: options?.status ?? 'ready',
      }

      if (options?.metadata?.key) {
        patch.image_key = options.metadata.key
      }
      if (typeof options?.metadata?.size === 'number') {
        patch.image_size = options.metadata.size
      }
      if (options?.metadata?.type) {
        patch.image_type = options.metadata.type
      }

      console.log('[updateCardImages] Updating card with patch:', {
        cardId,
        imageUrl: imageUrl.substring(0, 100),
        image_urls: patch.image_urls?.length || 0,
      })

      await patchCards([patch])
      
      console.log('[updateCardImages] Card patch completed for:', cardId)
    },
    [patchCards, queryCards]
  )

  const handleImageUpload = useCallback(
    async (frameId: string, file: File) => {
      if (!userId || !projectId) {
        setError('Authentication required')
        return
      }

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)
        formData.append('frameId', frameId)
        formData.append('isUpdate', 'true')

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to upload image')
        }

        const uploadedUrl = result.publicUrl || result.signedUrl

        if (!uploadedUrl) {
          throw new Error('No image URL returned from server')
        }

        console.log('[ImageUpload] Uploaded image URL:', {
          frameId,
          uploadedUrl: uploadedUrl.substring(0, 100),
          hasPublicUrl: !!result.publicUrl,
          hasSignedUrl: !!result.signedUrl,
        })

        await updateCardImages(frameId, uploadedUrl, {
          metadata: {
            key: result.key || undefined,
            size: typeof result.size === 'number' ? result.size : undefined,
            type: result.type || undefined,
          },
        })

        console.log('[ImageUpload] Card images updated, frameId:', frameId)

        setError(null)
      } catch (error) {
        console.error('Failed to upload image:', error)
        setError(error instanceof Error ? error.message : 'Failed to upload image')
        throw error
      }
    },
    [userId, projectId, updateCardImages]
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
    const cache = frameCacheRef.current
    const frames = orderedCards.map((card, idx) => {
      const normalizedWidth =
        typeof card.card_width === 'number' && Number.isFinite(card.card_width)
          ? clampCardWidth(card.card_width)
          : resolvedCardWidth
      return getOrCreateFrameFromCard(card, idx, normalizedWidth, cache)
    })
    pruneFrameCache(
      cache,
      orderedCards.map(card => card.id)
    )
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
        inserted = await createCard(
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
          success?: boolean
          data?: { imageUrl?: string; error?: string }
          imageUrl?: string
          error?: string
        }

        // Check if the response indicates insufficient credits
        if (!response.ok) {
          // Try to handle credit errors - if it returns true, a popup was shown
          if (handleCreditError(payload)) {
            return // Popup was shown, no need to show additional error
          }

          const errorMsg = payload?.data?.error || payload?.error || '이미지를 생성할 수 없습니다.'
          throw new Error(errorMsg)
        }

        // API 응답 형식: { success: true, data: { imageUrl: ... } }
        const imageUrl = payload?.data?.imageUrl || payload?.imageUrl

        if (!payload?.success || !imageUrl) {
          throw new Error(payload?.data?.error || payload?.error || '이미지를 생성할 수 없습니다.')
        }

        const generatedImageUrl = imageUrl

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
        // Try to handle credit errors - if it returns true, a popup was shown
        if (handleCreditError(error)) {
          return // Popup was shown, no need to show additional error
        }

        // 오류 상태는 카드 업데이트 후 SWR을 통해 반영됨
        throw error instanceof Error
          ? error
          : new Error('씬 생성 중 문제가 발생했습니다. 나중에 다시 시도해 주세요.')
      }
    },
    [userId, projectId, ratio, projectCharacters]
  )

  // 비디오 관련 핸들러 (커스텀 훅에서 가져옴)

  // 선택된 프레임 ID 계산 (여러 곳에서 사용)
  const selectedFrameId = useMemo(
    () => (index >= 0 ? derived.frames[index]?.id : undefined),
    [index, derived.frames]
  )

  // 비디오 모드 동기화용 정규화된 selectedFrameId (dependency array 일관성 유지)
  const normalizedSelectedFrameId = useMemo(() => selectedFrameId ?? '', [selectedFrameId])

  // 현재 선택된 프레임 데이터 (정보 모달 등에서 사용)
  const selectedFrame = useMemo(
    () => (index >= 0 ? derived.frames[index] : null),
    [index, derived.frames]
  )

  // editingFrame: derived.frames에서 항상 최신 데이터를 가져옴
  const editingFrame = useMemo(
    () => (editingFrameId ? derived.frames.find(f => f.id === editingFrameId) ?? null : null),
    [editingFrameId, derived.frames]
  )

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
      // 중복 요청 방지
      if (isAddingFrame) {
        console.warn('Frame addition already in progress, ignoring duplicate request')
        return
      }

      setIsAddingFrame(true)
      try {
        const newFrames = await handleAddFrame(insertIndex, duplicateFrameId)
        if (newFrames) {
          setIndex(insertIndex ?? newFrames.length - 1)
          setError(null)
        }
      } catch (error) {
        console.error('Failed to add frame:', error)
        setError(error instanceof Error ? error.message : 'Failed to add frame')
      } finally {
        setIsAddingFrame(false)
      }
    },
    [handleAddFrame, isAddingFrame]
  )

  const canShowWidthControlsPanel =
    viewMode === 'storyboard' && (!isClient || storyboardViewMode === 'grid')

  // 카드 선택 취소 함수
  const handleDeselectCard = useCallback(() => {
    setIndex(-1) // 선택 해제
    setVideoSelectedIds([])
  }, [])

  // 모드 전환 시 비디오 선택 동기화
  useEffect(() => {
    if (promptDockMode !== 'video') {
      // 비디오 모드가 아니면 비디오 선택 초기화
      setVideoSelectedIds(prev => (prev.length > 0 ? [] : prev))
    } else {
      // 비디오 모드로 변경될 때, 이미 선택된 프레임이 있으면 videoSelectedIds에 추가
      if (selectedFrameId) {
        setVideoSelectedIds(prev => {
          if (!prev.includes(selectedFrameId)) {
            return [selectedFrameId]
          }
          return prev
        })
      }
    }
  }, [promptDockMode, normalizedSelectedFrameId])

  // Grid에서 카드 선택 처리 (Shift/버튼 멀티선택 포함)
  const handleGridCardSelect = useCallback(
    (id: string, options?: { multi?: boolean; toggle?: boolean; role?: 'start' | 'end' }) => {
      const framesSnapshot = framesRef.current ?? []
      const targetIndex = framesSnapshot.findIndex(fr => fr.id === id)

      // 비디오 모드가 아니거나 단일 선택 모드
      if (promptDockMode !== 'video' || !options?.multi) {
        // Toggle 옵션이 있고 이미 선택된 경우 해제
        if (options?.toggle && selectedFrameId === id) {
          setIndex(-1)
          setVideoSelectedIds([])
          return
        }
        // 일반 선택
        setVideoSelectedIds(promptDockMode === 'video' ? [id] : [])
        if (targetIndex >= 0) {
          setIndex(targetIndex)
        }
        return
      }

      // 비디오 모드 멀티 선택
      setVideoSelectedIds(prev => {
        const exists = prev.includes(id)
        const existsIndex = exists ? prev.indexOf(id) : -1

        // Role 기반 선택 (start 또는 end로 명시적 설정)
        if (options?.role) {
          if (options.role === 'start') {
            // Start로 설정: 기존 start가 있으면 제거하고 새로 추가
            const withoutCurrent = prev.filter(item => item !== id)
            return [id, ...withoutCurrent].slice(0, 2)
          } else if (options.role === 'end') {
            // End로 설정: 기존 end가 있으면 제거하고 새로 추가
            const withoutCurrent = prev.filter(item => item !== id)
            if (withoutCurrent.length === 0) {
              // Start가 없으면 start로 설정
              return [id]
            }
            return [withoutCurrent[0], id].slice(0, 2)
          }
        }

        // Toggle 로직 (기존 동작)
        if (exists) {
          if (options?.toggle === false) {
            return prev
          }
          const next = prev.filter(item => item !== id)
          if (!next.length) {
            setIndex(-1)
          }
          return next
        }

        // 새로 추가
        if (prev.length >= 2) {
          const next = [...prev.slice(1), id]
          if (targetIndex >= 0) {
            setIndex(targetIndex)
          }
          return next
        }

        if (targetIndex >= 0) {
          setIndex(targetIndex)
        }
        return [...prev, id]
      })
    },
    [promptDockMode, selectedFrameId]
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
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                        />
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
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
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
            {isInitialLoadPending && (
              <LoadingGrid cardsLength={0} aspectRatio={ratio} cardWidth={cardWidth} />
            )}

            {!isInitialLoadPending && derived.frames.length === 0 && (
              <EmptyStoryboardState
                onCreateFirstCard={async () => {
                  if (!isAddingFrame) {
                    await handleFrameAddLocal()
                  }
                }}
              />
            )}

            {!isInitialLoadPending &&
              derived.frames.length > 0 &&
              (!isClient || storyboardViewMode === 'grid') && (
                <div style={{ pointerEvents: showWidthControls ? 'none' : 'auto' }}>
                  <FrameGrid
                    frames={derived.frames}
                    mode={promptDockMode}
                    onFrameOpen={frameIndex => {
                      setIndex(frameIndex)
                    }}
                    onFrameEdit={frameId => {
                      setEditingFrameId(frameId)
                    }}
                    onFrameDelete={handleFrameDeleteLocal}
                    onAddFrame={handleFrameAddLocal}
                    onImageUpload={handleImageUpload}
                    deletingFrameId={deletingFrameId}
                    isAddingFrame={isAddingFrame}
                    loading={cardsLoading}
                    cardsLength={queryCards.length}
                    aspectRatio={ratio}
                    cardWidth={cardWidth}
                    selectedFrameId={selectedFrameId}
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
                </div>
              )}

            {!isInitialLoadPending &&
              derived.frames.length > 0 &&
              isClient &&
              storyboardViewMode === 'list' && (
                <div style={{ pointerEvents: showWidthControls ? 'none' : 'auto' }}>
                  <FrameList
                    frames={derived.frames}
                    onFrameEdit={frameIndex => {
                      setIndex(frameIndex)
                    }}
                    onFrameEditMetadata={frameId => {
                      setEditingFrameId(frameId)
                    }}
                    onFrameDelete={handleFrameDeleteLocal}
                    onAddFrame={handleFrameAddLocal}
                    onImageUpload={handleImageUpload}
                    deletingFrameId={deletingFrameId}
                    isAddingFrame={isAddingFrame}
                    aspectRatio={ratio}
                    selectedFrameId={selectedFrameId}
                  />
                </div>
              )}
          </>
        )}

        {/* 프레임 정보 모달 */}
        {editingFrame && (
          <FrameInfoModal
            frame={editingFrame}
            projectId={projectId}
            aspectRatio={ratio}
            onClose={() => setEditingFrameId(null)}
            onSaved={() => {
              // SWR에 의해 자동 반영되므로 모달만 닫음
              setEditingFrameId(null)
            }}
            onDeleteHistoryImage={async (imageUrl: string) => {
              if (!editingFrameId) return
              
              // 현재 카드 찾기
              const currentCard = queryCards.find((card: Card) => card.id === editingFrameId)
              if (!currentCard) return
              
              // image_urls에서 해당 URL 제거
              const currentUrls = Array.isArray(currentCard.image_urls) 
                ? currentCard.image_urls.filter((url: string) => typeof url === 'string')
                : []
              const updatedUrls = currentUrls.filter((url: string) => url !== imageUrl)
              
              // 카드 업데이트
              await patchCards([{
                id: editingFrameId,
                image_urls: updatedUrls,
              }])
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
          selectedFrameId={selectedFrameId}
          onClearSelectedShot={handleDeselectCard}
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
            duration,
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
                duration,
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

                await updateCardImages(targetCardId, imageUrl)
                setError(null)
                return
              }

              await handleFrameAddLocal()
              setError(null)
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
