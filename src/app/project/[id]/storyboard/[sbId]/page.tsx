'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import type { Card, Storyboard } from '@/types'
import { useParams, useRouter } from 'next/navigation'
import type { SupabaseCharacter } from '@/lib/supabase'
import { useStoryboardStore } from '@/store/storyboard'
import { useHydratedUIStore } from '@/store/ui'
import { useUserStore } from '@/store/user'
import FrameEditModal from '@/components/storyboard/FrameEditModal'
import FrameGrid from '@/components/storyboard/viewer/FrameGrid'
import FrameList from '@/components/storyboard/viewer/FrameList'
import ViewModeToggle from '@/components/storyboard/ViewModeToggle'
import SingleEditorLayout from '@/components/storyboard/editor/SingleEditorLayout'
import SequencePanel from '@/components/storyboard/editor/SequencePanel'
import ImageStage from '@/components/storyboard/editor/ImageStage'
import ImageEditPanel from '@/components/storyboard/editor/ImageEditPanel'
import FloatingHeader from '@/components/storyboard/FloatingHeader'
import ProfessionalVideoTimeline from '@/components/storyboard/ProfessionalVideoTimeline'
import PromptDock from '@/components/storyboard/PromptDock'
import { cardToFrame, verifyProjectOwnership } from '@/lib/utils'
import { createAndLinkCard } from '@/lib/cards'
import { buildPromptWithCharacterMentions, resolveCharacterMentions } from '@/lib/characterMentions'
import StoryboardWidthControls from '@/components/storyboard/StoryboardWidthControls'
import EmptyStoryboardState from '@/components/storyboard/EmptyStoryboardState'
import VideoPreviewModal from '@/components/storyboard/VideoPreviewModal'
import LoadingGrid from '@/components/storyboard/LoadingGrid'
import { useCardWidth } from '@/hooks/useCardWidth'
import { useStoryboardNavigation } from '@/hooks/useStoryboardNavigation'
import { useFrameManagement } from '@/hooks/useFrameManagement'
import { DEFAULT_RATIO, CARD_WIDTH_MIN, CARD_WIDTH_MAX, DEFAULT_CARD_WIDTH, clampCardWidth } from '@/lib/constants'

// Stable empty array to avoid creating new [] in selectors (prevents getSnapshot loop warnings)
const EMPTY_CARDS: Card[] = []
// Removed: StoryboardStatusState (status UI 미사용)
type CardImageUpdate = Partial<
  Pick<
    Card,
    'image_url' | 'image_urls' | 'selected_image_url' | 'image_key' | 'image_size' | 'image_type'
  >
>

export default function StoryboardPage() {
  const params = useParams<{ id: string; sbId: string }>()
  const router = useRouter()
  const projectId = params.id
  const sbId = params.sbId
  const { userId, isLoaded } = useUserStore()

  // URL에서 frame 파라미터 및 view 파라미터 확인 (Editor 모드 진입 여부)
  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  )
  const frameParam = searchParams.get('frame')
  const viewParam = searchParams.get('view')
  const initialFrameMode = !!frameParam || viewParam === 'editor'
  const initialIndex = frameParam ? Math.max(0, parseInt(frameParam) - 1) : 0

  const [frames, setFrames] = useState<StoryboardFrame[]>([])
  const [index, setIndex] = useState(initialIndex) // current frame in single view mode
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sbTitle, setSbTitle] = useState<string>('Storyboard')
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null)
  const [ratio, setRatio] = useState<StoryboardAspectRatio>(DEFAULT_RATIO)
  // 컨테이너 폭 제어 제거 (DND 정렬 + 자동 래핑 사용)
  const [showWidthControls, setShowWidthControls] = useState(false)
  const [projectCharacters, setProjectCharacters] = useState<SupabaseCharacter[]>([])

  // View mode 상태: 'storyboard' | 'editor' | 'timeline' | 'models'
  const [viewMode, setViewMode] = useState<'storyboard' | 'editor' | 'timeline' | 'models'>(
    initialFrameMode ? 'editor' : 'storyboard'
  )
  // UI Store 연결 - 뷰 모드 관리 (hydration 안전)
  const { storyboardViewMode, setStoryboardViewMode, isClient } = useHydratedUIStore()

  // Custom hooks
  const { cardWidth, setCardWidth, latestCardWidthRef, persistCardWidthTimeout, handleCardWidthChange, readStoredCardWidth, persistCardWidthLocally, schedulePersistCardWidth } = useCardWidth(projectId, setFrames)
  const { handleNavigateToStoryboard, handleNavigateToEditor, handleNavigateToTimeline, handleNavigateToCharacters, handleOpenFrame } = useStoryboardNavigation(projectId, index, setViewMode)
  const { deletingFrameId, generatingVideoId, videoPreview, setVideoPreview, framesRef, handleAddFrame, handleDeleteFrame, handleReorderFrames, handleGenerateVideo, handlePlayVideo } = useFrameManagement(projectId, userId, latestCardWidthRef)

  // Zustand store 연결
  const setStoryboard = useStoryboardStore(s => s.setStoryboard)
  const cards = useStoryboardStore(s => s.cards[projectId] || EMPTY_CARDS)
  const setCards = useStoryboardStore(s => s.setCards)


  // 안정적인 이미지 업데이트 콜백
  const handleImageUpdated = useCallback(
    async (
      frameId: string,
      newUrl: string,
      metadata?: { key?: string; size?: number; type?: string }
    ) => {
      // 로컬 상태 즉시 업데이트
      setFrames(prev =>
        prev.map(f => (f.id === frameId ? { ...f, imageUrl: newUrl, status: 'ready' } : f))
      )

      // 로컬 미리보기 URL은 DB에 저장하지 않음
      if (newUrl.startsWith('blob:') || newUrl.startsWith('data:')) {
        return
      }

      // 데이터베이스에 저장
      try {
        const card = cards.find(c => c.id === frameId)
        if (!card) return

        // 단일 이미지 URL 방식으로 저장
        const updateData: CardImageUpdate = {
          image_url: newUrl,
          image_urls: [newUrl], // 하위 호환성을 위해 배열도 유지
          selected_image_url: 0, // 첫 번째 이미지 선택
        }

        // 메타데이터가 있으면 추가
        if (metadata) {
          if (metadata.key) updateData.image_key = metadata.key
          if (metadata.size) updateData.image_size = metadata.size
          if (metadata.type) updateData.image_type = metadata.type
        }

        const response = await fetch('/api/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cards: [
              {
                id: frameId,
                ...updateData,
              },
            ],
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save image URL to database')
        }
      } catch (error) {
        console.error('Failed to save image URL to database:', error)
      }
    },
    [cards]
  )

  useEffect(() => {
    framesRef.current = frames
  }, [frames])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && persistCardWidthTimeout.current !== null) {
        window.clearTimeout(persistCardWidthTimeout.current)
      }
    }
  }, [])

  // 근본적 해결: 실제 데이터 변경 시그니처 기반 동기화
  const lastSyncSignatureRef = useRef<string>('')

  useEffect(() => {
    if (!projectId) {
      setProjectCharacters([])
      return
    }

    if (!isLoaded) {
      return
    }

    if (!userId) {
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
  }, [projectId, userId, isLoaded])

  useEffect(() => {
    if (!projectId) return

    // 실제 데이터 변경 시그니처 생성 (ID, 제목, 씬 번호 기반)
    const currentSignature = cards
      .map(card => `${card.id}:${card.order_index ?? ''}`)
      .sort()
      .join('|')

    // 동일한 데이터면 동기화 스킵
    if (lastSyncSignatureRef.current === currentSignature) {
      return
    }

    // order_index 기준 정렬 후 프레임으로 변환 (타이틀 기반 중복 제거 제거)
    const orderedCards = [...cards].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

    // cards를 frames로 변환 - 메타데이터 완전 통합
    const normalizedWidth = clampCardWidth(latestCardWidthRef.current)
    const syncedFrames = orderedCards.map((card, index) => {
      const frame = cardToFrame(card, index)
      if (typeof frame.cardWidth === 'number' && Number.isFinite(frame.cardWidth)) {
        frame.cardWidth = clampCardWidth(frame.cardWidth)
        return frame
      }
      return { ...frame, cardWidth: normalizedWidth }
    })

    setFrames(syncedFrames)
    lastSyncSignatureRef.current = currentSignature
  }, [cards, projectId])

  // viewportWidth 제거에 따라 resize 리스너도 제거

  // Initial data load from Cloudflare D1
  useEffect(() => {
    if (!sbId || !projectId) {

      return
    }

    if (!isLoaded) {
      return
    }

    if (!userId) {
      setFrames([])
      // status UI 제거
      setError('로그인이 필요합니다. 다시 로그인해 주세요.')
      setLoading(false)
      return
    }



    // Verify that sbId matches projectId in the new architecture
    if (sbId !== projectId) {
      console.warn('[STORYBOARD] Warning: sbId does not match projectId', { sbId, projectId })
    }

    const loadStoryboardData = async () => {
      setLoading(true)
      setError(null) // Clear any previous errors

      try {

        const ownershipResult = await verifyProjectOwnership(projectId, userId)

        if (!ownershipResult.isOwner) {
          console.error(
            '[STORYBOARD] Project ownership verification failed:',
            ownershipResult.error
          )
          throw new Error(ownershipResult.error || 'You do not have access to this project')
        }



        const cardsResponse = await fetch(
          `/api/cards?project_id=${encodeURIComponent(projectId)}`,
          {
            credentials: 'include',
          }
        )

        const cardsResult = (await cardsResponse.json().catch(() => ({}))) as {
          data?: Card[]
          error?: string
        }

        if (!cardsResponse.ok) {
          const message =
            typeof cardsResult?.error === 'string'
              ? cardsResult.error
              : 'Failed to fetch cards for project'
          throw new Error(message)
        }

        const cardsData = Array.isArray(cardsResult?.data) ? (cardsResult.data as Card[]) : []



        if (cardsData.length > 0) {
          const widthFromCards = cardsData.reduce<number | null>((acc, card) => {
            if (acc !== null) return acc
            if (typeof card.card_width === 'number' && Number.isFinite(card.card_width)) {
              return clampCardWidth(card.card_width)
            }
            return acc
          }, null)

          const storedWidth = readStoredCardWidth()
          const resolvedCardWidth = clampCardWidth(
            widthFromCards ?? storedWidth ?? DEFAULT_CARD_WIDTH
          )
          latestCardWidthRef.current = resolvedCardWidth
          setCardWidth(resolvedCardWidth)
          persistCardWidthLocally(resolvedCardWidth)

          const cardsWithWidth = cardsData.map(card => {
            if (typeof card.card_width === 'number' && Number.isFinite(card.card_width)) {
              const normalized = clampCardWidth(card.card_width)
              return normalized === card.card_width ? card : { ...card, card_width: normalized }
            }
            return { ...card, card_width: resolvedCardWidth }
          })

          setCards(projectId, cardsWithWidth)

          const initialFrames = cardsWithWidth.map((card, index) => cardToFrame(card, index))
          setFrames(initialFrames)


          const derivedTitle = cardsData[0]?.title
            ? `Storyboard: ${cardsData[0].title.replace(/^Scene \d+:?\s*/, '')}`
            : 'Storyboard'
          setSbTitle(derivedTitle)

          const readyCount = cardsData.filter(card => card.storyboard_status === 'ready').length
          // status UI 제거

          try {
            const storyboardPayload: Storyboard = {
              id: sbId,
              user_id: userId,
              project_id: projectId,
              title: derivedTitle,
              description: undefined,
              is_public: false,
              created_at: cardsData[0]?.created_at || new Date().toISOString(),
              updated_at: cardsData[0]?.updated_at || new Date().toISOString(),
            }
            setStoryboard(storyboardPayload)
          } catch (storeError) {
            console.warn('[STORYBOARD] Failed to update storyboard store:', storeError)
          }
        } else {

          const storedWidth = readStoredCardWidth() ?? DEFAULT_CARD_WIDTH
          const normalizedWidth = clampCardWidth(storedWidth)
          latestCardWidthRef.current = normalizedWidth
          setCardWidth(normalizedWidth)
          persistCardWidthLocally(normalizedWidth)
          setCards(projectId, [])
          setFrames([])
          setSbTitle('New Storyboard')
          // status UI 제거

          try {
            const storyboardPayload: Storyboard = {
              id: sbId,
              user_id: userId,
              project_id: projectId,
              title: 'New Storyboard',
              description: undefined,
              is_public: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            setStoryboard(storyboardPayload)
          } catch (storeError) {
            console.warn('[STORYBOARD] Failed to update storyboard store:', storeError)
          }
        }

        setLoading(false)

      } catch (error) {
        console.error('[STORYBOARD] Failed to load storyboard:', error)

        let errorMessage = '스토리보드를 불러올 수 없습니다.'

        if (error && typeof error === 'object') {
          if ('message' in error && error.message && typeof error.message === 'string') {
            errorMessage = error.message
          }
          if ('code' in error && error.code) {
            errorMessage += ` [코드: ${error.code}]`
          }
          if ('details' in error && error.details) {
            errorMessage += ` [세부사항: ${error.details}]`
          }
          if ('hint' in error && error.hint) {
            errorMessage += ` [힌트: ${error.hint}]`
          }
        }

        if (typeof errorMessage === 'string' && errorMessage.includes('Failed to fetch')) {
          errorMessage =
            '스토리보드 데이터를 불러오는 동안 네트워크 오류가 발생했습니다. 연결을 확인한 후 다시 시도해 주세요.'
        }

        const serialisedError =
          error instanceof Error
            ? { message: error.message, name: error.name, stack: error.stack }
            : error
        console.error('[STORYBOARD] Full error object:', serialisedError)

        setError(errorMessage)
        setLoading(false)
      }
    }

    loadStoryboardData()
  }, [
    sbId,
    projectId,
    userId,
    isLoaded,
    setStoryboard,
    setCards,
    readStoredCardWidth,
    persistCardWidthLocally,
  ])



  // 네비게이션 핸들러 (커스텀 훅에서 가져옴)

  // Timeline frame update handler
  const handleUpdateFrame = useCallback(
    async (frameId: string, updates: Partial<StoryboardFrame>) => {
      setFrames(prev =>
        prev.map(frame => (frame.id === frameId ? { ...frame, ...updates } : frame))
      )

      // Also update cards in the store
      const card = cards.find(c => c.id === frameId)
      if (card) {
        // Update card with timeline data
        const updatedCard = { ...card }
        // Store timeline data in a way that can be persisted
        if (updates.duration !== undefined) updatedCard.duration = updates.duration
        if (updates.audioUrl !== undefined) updatedCard.audioUrl = updates.audioUrl
        if (updates.voiceOverUrl !== undefined) updatedCard.voiceOverUrl = updates.voiceOverUrl
        if (updates.voiceOverText !== undefined) updatedCard.voiceOverText = updates.voiceOverText

        setCards(
          projectId,
          cards.map(c => (c.id === frameId ? updatedCard : c))
        )
      }

      // Save to API
      try {
        const response = await fetch('/api/timeline', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameId,
            duration: updates.duration,
            audioUrl: updates.audioUrl,
            voiceOverUrl: updates.voiceOverUrl,
            voiceOverText: updates.voiceOverText,
          }),
        })

        if (!response.ok) {
          console.error('Failed to save timeline data')
        }
      } catch (error) {
        console.error('Error saving timeline data:', error)
      }
    },
    [cards, projectId, setCards]
  )


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

      const currentCardsSnapshot = useStoryboardStore.getState().cards[projectId] || []
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
      setCards(projectId, cardsAfterInsert)
      setFrames(prev => [...prev, cardToFrame(insertedWithPrompt, prev.length)])

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

        const refreshedCards = useStoryboardStore.getState().cards[projectId] || cardsAfterInsert
        const mergedCards = refreshedCards.map(card =>
          card.id === insertedWithPrompt.id
            ? {
                ...card,
                image_url: generatedImageUrl,
                image_prompt: trimmedPrompt,
                shot_description: trimmedPrompt,
                storyboard_status: 'ready',
              }
            : card
        )
        setCards(projectId, mergedCards)
        setFrames(prev =>
          prev.map(frame =>
            frame.id === insertedWithPrompt.id
              ? {
                  ...frame,
                  imageUrl: generatedImageUrl,
                  imagePrompt: trimmedPrompt,
                  shotDescription: trimmedPrompt,
                  status: 'ready',
                }
              : frame
          )
        )
      } catch (error) {
        const refreshedCards = useStoryboardStore.getState().cards[projectId] || cardsAfterInsert
        const erroredCards = refreshedCards.map(card =>
          card.id === insertedWithPrompt.id
            ? {
                ...card,
                storyboard_status: 'error',
              }
            : card
        )
        setCards(projectId, erroredCards)
        setFrames(prev =>
          prev.map(frame =>
            frame.id === insertedWithPrompt.id
              ? {
                  ...frame,
                  status: 'error',
                }
              : frame
          )
        )
        throw error instanceof Error
          ? error
          : new Error('씬 생성 중 문제가 발생했습니다. 나중에 다시 시도해 주세요.')
      }
    },
    [userId, projectId, setCards, ratio, projectCharacters]
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
  const currentFrame = useMemo(() => frames[index] || null, [frames, index])
  
  const canShowWidthControlsPanel =
    viewMode === 'storyboard' && (!isClient || storyboardViewMode === 'grid')

  return (
    <div>
      <div className="w-full px-4">
        {/* Header 라인: FloatingHeader + ViewModeToggle */}
        <div className="relative mx-auto mb-6 w-full max-w-[1280px]">
          {/* FloatingHeader */}
          <FloatingHeader
            title={sbTitle || 'Storyboard'}
            index={index}
            total={frames.length}
            currentView={viewMode}
            onNavigateToStoryboard={handleNavigateToStoryboard}
            onNavigateToEditor={handleNavigateToEditor}
            onNavigateToTimeline={handleNavigateToTimeline}
            onNavigateToCharacters={handleNavigateToCharacters}
            isWidthPanelOpen={showWidthControls}
            onToggleWidthPanel={() => setShowWidthControls(prev => !prev)}
            layout="inline"
            containerClassName="mx-auto w-full sm:w-auto"
            className="mx-auto w-full max-w-[1040px] sm:pr-16"
          />

          {canShowWidthControlsPanel && (
            <>
              <div
                className="hidden sm:absolute sm:block sm:-translate-y-1/2 relative z-[60]"
                style={{ top: '80px', left: 'calc(50% - min(100%, 65rem) / 2 - 13.5rem)' }}
              >
                <StoryboardWidthControls
                  visible={showWidthControls}
                  cardWidthMin={CARD_WIDTH_MIN}
                  cardWidthMax={CARD_WIDTH_MAX}
                  normalizedCardWidth={clampCardWidth(cardWidth)}
                  onCardWidthChange={handleCardWidthChange}
                  aspectRatio={ratio}
                  onAspectRatioChange={setRatio}
                  onClose={() => setShowWidthControls(false)}
                  className="mx-auto sm:mx-0"
                />
              </div>
              {showWidthControls ? (
                <div className="mt-4 sm:hidden">
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
              ) : null}
            </>
          )}

          {/* ViewModeToggle - 스토리보드 뷰에서만 표시, 클라이언트에서만 실제 상태 표시 */}
          {viewMode === 'storyboard' && (
            <div className="absolute top-0 right-0 pointer-events-auto">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg px-3 py-3">
                <ViewModeToggle
                  viewMode={isClient ? storyboardViewMode : 'grid'}
                  onSetGrid={() => setStoryboardViewMode('grid')}
                  onSetList={() => setStoryboardViewMode('list')}
                />
              </div>
            </div>
          )}
        </div>

        {/* 스토리보드 뷰 */}
        {viewMode === 'storyboard' && (
          <>
            {/* Error message */}
            {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

            {/* 콘텐츠 렌더링 */}
            {loading && (
              <LoadingGrid 
                cardsLength={frames.length} 
                aspectRatio={ratio}
                cardWidth={cardWidth}
              />
            )}

            {!loading && frames.length === 0 && (
              <EmptyStoryboardState 
                onCreateFirstCard={async () => {
                  try {
                    const newFrames = await handleAddFrame()
                    if (newFrames) {
                      setFrames(newFrames)
                      setIndex(0)
                    }
                  } catch (error) {
                    console.error('Failed to create first card:', error)
                  }
                }} 
              />
            )}

            {!loading && frames.length > 0 && (!isClient || storyboardViewMode === 'grid') && (
              <FrameGrid
                frames={frames}
                onFrameOpen={(frameIndex) => {
                  setIndex(frameIndex)
                }}
                onFrameEdit={frameId => {
                  const frameData = frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={async (frameId) => {
                  try {
                    const newFrames = await handleDeleteFrame(frameId)
                    if (newFrames) {
                      setFrames(newFrames)
                      setIndex(prev => {
                        const newLen = newFrames.length
                        if (newLen === 0) return 0
                        return Math.min(prev, newLen - 1)
                      })
                    }
                  } catch (error) {
                    console.error('Failed to delete frame:', error)
                  }
                }}
                onAddFrame={async (insertIndex) => {
                  try {
                    const newFrames = await handleAddFrame(insertIndex)
                    if (newFrames) {
                      setFrames(newFrames)
                      setIndex(insertIndex ?? newFrames.length - 1)
                    }
                  } catch (error) {
                    console.error('Failed to add frame:', error)
                  }
                }}
                deletingFrameId={deletingFrameId}
                loading={loading}
                cardsLength={cards.length}
                onGenerateVideo={async (frameId) => {
                  try {
                    await handleGenerateVideo(frameId, frames)
                    // Update frames with video data
                    setFrames(prev =>
                      prev.map(f =>
                        f.id === frameId
                          ? { ...f, videoUrl: videoPreview?.url, status: 'ready' }
                          : f
                      )
                    )
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to generate video')
                  }
                }}
                onPlayVideo={(frameId) => {
                  try {
                    handlePlayVideo(frameId, frames)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'No video available')
                  }
                }}
                generatingVideoId={generatingVideoId}
                aspectRatio={ratio}
                cardWidth={cardWidth}
                selectedFrameId={frames[index]?.id}
                onReorder={(fromIndex, toIndex) => {
                  const result = handleReorderFrames(fromIndex, toIndex)
                  if (result) {
                    setFrames(result.reorderedFrames)
                    setIndex(result.newIndex)
                  }
                }}
              />
            )}

            {!loading && frames.length > 0 && isClient && storyboardViewMode === 'list' && (
              <FrameList
                frames={frames}
                onFrameEdit={(frameIndex) => {
                  setIndex(frameIndex)
                }}
                onFrameEditMetadata={frameId => {
                  const frameData = frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={async (frameId) => {
                  try {
                    const newFrames = await handleDeleteFrame(frameId)
                    if (newFrames) {
                      setFrames(newFrames)
                      setIndex(prev => {
                        const newLen = newFrames.length
                        if (newLen === 0) return 0
                        return Math.min(prev, newLen - 1)
                      })
                    }
                  } catch (error) {
                    console.error('Failed to delete frame:', error)
                  }
                }}
                onAddFrame={async (insertIndex) => {
                  try {
                    const newFrames = await handleAddFrame(insertIndex)
                    if (newFrames) {
                      setFrames(newFrames)
                      setIndex(insertIndex ?? newFrames.length - 1)
                    }
                  } catch (error) {
                    console.error('Failed to add frame:', error)
                  }
                }}
                deletingFrameId={deletingFrameId}
                onGenerateVideo={async (frameId) => {
                  try {
                    await handleGenerateVideo(frameId, frames)
                    setFrames(prev =>
                      prev.map(f =>
                        f.id === frameId
                          ? { ...f, videoUrl: videoPreview?.url, status: 'ready' }
                          : f
                      )
                    )
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to generate video')
                  }
                }}
                onPlayVideo={(frameId) => {
                  try {
                    handlePlayVideo(frameId, frames)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'No video available')
                  }
                }}
                generatingVideoId={generatingVideoId}
                aspectRatio={ratio}
                selectedFrameId={frames[index]?.id}
              />
            )}
          </>
        )}

        {/* 에디터 뷰 (Frame 모드) */}
        {/* Timeline 뷰 */}
        {false && (
          <div className="w-full h-[calc(100vh-120px)]">
            <ProfessionalVideoTimeline
              frames={frames}
              onUpdateFrame={handleUpdateFrame}
              onSave={async () => {
                try {
                  const framesToSave = frames.map(frame => ({
                    id: frame.id,
                    duration: frame.duration || 3,
                    audioUrl: frame.audioUrl,
                    voiceOverUrl: frame.voiceOverUrl,
                    voiceOverText: frame.voiceOverText,
                    startTime: frame.startTime,
                  }))

                  const response = await fetch('/api/timeline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frames: framesToSave }),
                  })

                  if (response.ok) {
                    const result = await response.json()
                  } else {
                    console.error('Failed to save timeline')
                  }
                } catch (error) {
                  console.error('Error saving timeline:', error)
                }
              }}
              onAddFrame={async () => {
                try {
                  const newFrames = await handleAddFrame()
                  if (newFrames) {
                    setFrames(newFrames)
                  }
                } catch (error) {
                  console.error('Error creating new frame:', error)
                }
              }}
              projectId={projectId}
              onGenerateScene={handleGenerateSceneFromPrompt}
            />
          </div>
        )}

        {/* Frame Editor 뷰 */}
        {viewMode === 'editor' && frames.length > 0 && currentFrame && (
          <SingleEditorLayout
            header={null}
            left={
              <SequencePanel
                frames={frames}
                currentIndex={index}
                onSelect={newIndex => {
                  setIndex(newIndex)
                  const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${newIndex + 1}`
                  router.replace(newUrl, { scroll: false })
                }}
                onAddFrame={async (insertIndex) => {
                  try {
                    const newFrames = await handleAddFrame(insertIndex)
                    if (newFrames) {
                      setFrames(newFrames)
                      setIndex(insertIndex ?? newFrames.length - 1)
                    }
                  } catch (error) {
                    console.error('Failed to add frame:', error)
                  }
                }}
              />
            }
            center={
              <ImageStage
                frame={currentFrame}
                hasPrev={index > 0}
                hasNext={index < frames.length - 1}
                onPrev={() => {
                  const newIndex = Math.max(0, index - 1)
                  setIndex(newIndex)
                  const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${newIndex + 1}`
                  router.replace(newUrl, { scroll: false })
                }}
                onNext={() => {
                  const newIndex = Math.min(frames.length - 1, index + 1)
                  setIndex(newIndex)
                  const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${newIndex + 1}`
                  router.replace(newUrl, { scroll: false })
                }}
                onGenerateVideo={async (frame) => {
                  try {
                    await handleGenerateVideo(frame.id, frames)
                    setFrames(prev =>
                      prev.map(f =>
                        f.id === frame.id
                          ? { ...f, videoUrl: videoPreview?.url, status: 'ready' }
                          : f
                      )
                    )
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to generate video')
                  }
                }}
                onPlayVideo={(frame) => {
                  try {
                    handlePlayVideo(frame.id, frames)
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'No video available')
                  }
                }}
                isGeneratingVideo={generatingVideoId === currentFrame.id}
              />
            }
            right={
              <ImageEditPanel
                projectId={projectId}
                frameId={currentFrame.id}
                currentImageUrl={currentFrame.imageUrl}
                imagePrompt={currentFrame.imagePrompt}
                characters={projectCharacters}
                onImageUpdated={url => handleImageUpdated(currentFrame.id, url)}
              />
            }
            footer={null}
          />
        )}

        {/* 프레임 편집 모달 */}
        {editingFrame && (
          <FrameEditModal
            frame={editingFrame}
            projectId={projectId}
            onClose={() => setEditingFrame(null)}
            onSaved={updated => {
              setFrames(prev => prev.map(f => (f.id === updated.id ? updated : f)))
              setEditingFrame(null)
            }}
          />
        )}
      </div>

      {/* 하단 고정 프롬프트 입력 바 */}
      <PromptDock
        projectId={projectId}
        aspectRatio={ratio}
        onAspectRatioChange={setRatio}
        selectedShotNumber={frames[index] ? frames[index].scene || index + 1 : undefined}
        onCreateFrame={async (imageUrl: string) => {
          try {
            const newFrames = await handleAddFrame()
            if (newFrames && newFrames.length) {
              setFrames(newFrames)
            }
          } catch (e) {
            console.error('Failed to add frame after generation:', e)
          }
        }}
      />


      {videoPreview && (
        <VideoPreviewModal 
          url={videoPreview.url} 
          onClose={() => setVideoPreview(null)} 
        />
      )}
    </div>
  )
}
