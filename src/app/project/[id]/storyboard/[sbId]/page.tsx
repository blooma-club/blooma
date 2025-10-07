'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { StoryboardFrame } from '@/types/storyboard'
import type { Card } from '@/types'
import { useParams, useRouter } from 'next/navigation'
import { supabase, type SupabaseCharacter } from '@/lib/supabase'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useStoryboardStore } from '@/store/storyboard'
import { useHydratedUIStore } from '@/store/ui'
import FrameEditModal from '@/components/storyboard/FrameEditModal'
import FrameGrid from '@/components/storyboard/viewer/FrameGrid'
import FrameList from '@/components/storyboard/viewer/FrameList'
import ViewModeToggle from '@/components/storyboard/ViewModeToggle'
import { createAndLinkCard } from '@/lib/cards'
import SingleEditorLayout from '@/components/storyboard/editor/SingleEditorLayout'
import SequencePanel from '@/components/storyboard/editor/SequencePanel'
import ImageStage from '@/components/storyboard/editor/ImageStage'
import ImageEditPanel from '@/components/storyboard/editor/ImageEditPanel'
import FloatingHeader from '@/components/storyboard/FloatingHeader'
import ProfessionalVideoTimeline from '@/components/storyboard/ProfessionalVideoTimeline'
import { cardToFrame, verifyProjectOwnership } from '@/lib/utils'
import { buildPromptWithCharacterMentions, resolveCharacterMentions } from '@/lib/characterMentions'

// Empty state component for projects with no cards
const EmptyStoryboardState = ({
  onCreateFirstCard,
}: {
  onCreateFirstCard: () => Promise<void>
}) => {
  const [isCreating, setIsCreating] = React.useState(false)

  const handleCreateFirstCard = async () => {
    try {
      setIsCreating(true)
      await onCreateFirstCard()
    } catch (error) {
      console.error('Failed to create first card:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white">No scenes yet</h3>
        <p className="text-neutral-400 leading-relaxed">
          This project doesn't have any storyboard scenes yet. Create your first scene to get
          started with your storyboard.
        </p>

        <button
          onClick={handleCreateFirstCard}
          disabled={isCreating}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {isCreating ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Scene...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create First Scene
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Stable empty array to avoid creating new [] in selectors (prevents getSnapshot loop warnings)
const EMPTY_CARDS: Card[] = []

export default function StoryboardPage() {
  const params = useParams() as any
  const router = useRouter()
  const projectId = params.id
  const sbId = params.sbId
  const { user, session } = useSupabase()

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
  const [status, setStatus] = useState<any>(null)
  const [sbTitle, setSbTitle] = useState<string>('Storyboard')
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null)
  const [deletingFrameId, setDeletingFrameId] = useState<string | null>(null)
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<{ frameId: string; url: string } | null>(null)
  // aspect ratio is selected at build time; not yet sent back in API payload. Placeholder for future.
  const [ratio] = useState<'16:9' | '1:1' | '9:16' | '4:3' | '3:4'>('3:4')
  const [projectCharacters, setProjectCharacters] = useState<SupabaseCharacter[]>([])

  // View mode 상태: 'storyboard' | 'editor' | 'timeline'
  const [viewMode, setViewMode] = useState<'storyboard' | 'editor' | 'models'>(
    initialFrameMode ? 'editor' : 'storyboard'
  )
  // Frame editor 모드 상태 (backward compatibility)
  const isFrameMode = viewMode === 'editor'
  // UI Store 연결 - 뷰 모드 관리 (hydration 안전)
  const { storyboardViewMode, setStoryboardViewMode, isClient } = useHydratedUIStore()

  // Zustand store 연결
  const storyboard = useStoryboardStore(s => s.storyboard)
  const setStoryboard = useStoryboardStore(s => s.setStoryboard)
  const cards = useStoryboardStore(s => s.cards[projectId] || EMPTY_CARDS)
  const setCards = useStoryboardStore(s => s.setCards)
  const deleteCard = useStoryboardStore(s => s.deleteCard)
  const selectCard = useStoryboardStore(s => s.selectCard)
  const sseRef = React.useRef<EventSource | null>(null)

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
        if (!card || !session) return

        // 단일 이미지 URL 방식으로 저장
        const updateData: any = {
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
            Authorization: `Bearer ${session.access_token}`,
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
    [cards, session]
  )

  // 현재 프레임 안정적 참조

  // 근본적 해결: 실제 데이터 변경 시그니처 기반 동기화
  const lastSyncSignatureRef = useRef<string>('')

  useEffect(() => {
    if (!projectId || !user?.id) {
      setProjectCharacters([])
      return
    }

    let isMounted = true

    const loadCharacters = async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        console.warn('[StoryboardPage] Failed to load project characters:', error)
        setProjectCharacters([])
        return
      }

      setProjectCharacters(data ?? [])
    }

    loadCharacters().catch(err => {
      if (!isMounted) return
      console.warn('[StoryboardPage] Unexpected error loading characters:', err)
      setProjectCharacters([])
    })

    return () => {
      isMounted = false
    }
  }, [projectId, user?.id])

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
    const syncedFrames = orderedCards.map((card, index) => cardToFrame(card, index))

    setFrames(syncedFrames)
    lastSyncSignatureRef.current = currentSignature
  }, [cards, projectId])

  // viewportWidth 제거에 따라 resize 리스너도 제거

  // Initial data load from Supabase (immediate, no SSE waiting)
  useEffect(() => {
    if (!sbId || !projectId) {
      console.log('[STORYBOARD] No sbId or projectId provided', { sbId, projectId })
      return
    }
    if (!user) {
      console.log('[STORYBOARD] User not authenticated yet, waiting...')
      return
    }

    console.log(
      '[STORYBOARD] Starting data load for sbId:',
      sbId,
      'projectId:',
      projectId,
      'user:',
      user.id
    )

    // Verify that sbId matches projectId in the new architecture
    if (sbId !== projectId) {
      console.warn('[STORYBOARD] Warning: sbId does not match projectId', { sbId, projectId })
    }

    const loadStoryboardData = async () => {
      setLoading(true)
      setError(null) // Clear any previous errors

      try {
        console.log('[STORYBOARD] Loading storyboard data for sbId:', sbId, 'projectId:', projectId)
        console.log('[STORYBOARD] Current user:', { id: user?.id, email: user?.email })

        // First verify that the user owns this project
        console.log('[STORYBOARD] Verifying project ownership:', projectId, 'for user:', user.id)
        const ownershipResult = await verifyProjectOwnership(projectId, user.id)

        if (!ownershipResult.isOwner) {
          console.error(
            '[STORYBOARD] Project ownership verification failed:',
            ownershipResult.error
          )
          throw new Error(ownershipResult.error || 'You do not have access to this project')
        }

        console.log('[STORYBOARD] Project ownership verified successfully')

        // Since we're not using storyboards table, we'll load data based on cards
        // and derive storyboard info from the cards themselves
        console.log('[STORYBOARD] Loading cards directly (no storyboards table):', projectId)

        console.log('[STORYBOARD] Loading cards for project:', projectId)

        // Load cards data from Supabase and set to Zustand store
        // Note: sbId is now the same as projectId in the new architecture
        const { data: cardsData, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('project_id', projectId)
          .order('order_index', { ascending: true })

        console.log('[STORYBOARD] Cards query result:', {
          cardsCount: cardsData?.length,
          cardsError,
        })

        if (cardsError) {
          console.error('[STORYBOARD] Error loading cards:', cardsError)
          // Check if it's a "not found" error which means the storyboard doesn't exist
          const isNotFound =
            cardsError.code === 'PGRST116' || !cardsData || (cardsData as any[])?.length === 0
          if (isNotFound) {
            throw new Error(
              `Project '${projectId}' not found. It may have been deleted or you don't have access to it.`
            )
          } else {
            console.warn('[STORYBOARD] Cards loading failed, continuing with empty frames')
          }
        }

        if (cardsData && cardsData.length > 0) {
          // Zustand store에 카드 데이터 설정
          setCards(projectId, cardsData)

          // frames 상태도 카드 데이터 기반으로 초기화
          const initialFrames = cardsData.map((card, index) => cardToFrame(card, index))
          setFrames(initialFrames)
          console.log('[STORYBOARD] Loaded', initialFrames.length, 'frames from cards')

          // Derive storyboard title from first card or use default
          const derivedTitle = cardsData[0]?.title
            ? `Storyboard: ${cardsData[0].title.replace(/^Scene \d+:?\s*/, '')}`
            : 'Storyboard'
          setSbTitle(derivedTitle)

          // Set status based on cards
          const readyCount = cardsData.filter(card => card.storyboard_status === 'ready').length
          setStatus({
            status: readyCount === cardsData.length ? 'completed' : 'processing',
            readyCount: readyCount,
            total: cardsData.length,
          })

          // Create a minimal storyboard object for Zustand store
          try {
            setStoryboard({
              id: sbId,
              user_id: user?.id || '',
              project_id: projectId,
              title: derivedTitle,
              description: undefined,
              is_public: false,
              created_at: cardsData[0]?.created_at || new Date().toISOString(),
              updated_at: cardsData[0]?.updated_at || new Date().toISOString(),
            } as any)
          } catch (storeError) {
            console.warn('[STORYBOARD] Failed to update storyboard store:', storeError)
          }
        } else {
          // No cards found - initialize empty project state
          console.log('[STORYBOARD] Project has no cards yet, showing empty state')
          setFrames([])
          setSbTitle('New Storyboard')
          setStatus({
            status: 'empty',
            readyCount: 0,
            total: 0,
          })

          // Create a minimal storyboard object for empty project
          try {
            setStoryboard({
              id: sbId,
              user_id: user?.id || '',
              project_id: projectId,
              title: 'New Storyboard',
              description: undefined,
              is_public: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any)
          } catch (storeError) {
            console.warn('[STORYBOARD] Failed to update storyboard store:', storeError)
          }
        }

        setLoading(false)
        console.log('[STORYBOARD] Successfully loaded storyboard data')
      } catch (error) {
        console.error('[STORYBOARD] Failed to load storyboard:', error)

        // Provide more detailed error information
        let errorMessage = '스토리보드를 불러올 수 없습니다.'

        if (error && typeof error === 'object') {
          if ('message' in error && error.message && typeof error.message === 'string') {
            errorMessage = error.message
          }
          if ('code' in error && error.code) {
            errorMessage += ` [코드: ${error.code}]`
          }
          // Also check for additional Supabase error properties
          if ('details' in error && error.details) {
            errorMessage += ` [세부사항: ${error.details}]`
          }
          if ('hint' in error && error.hint) {
            errorMessage += ` [힌트: ${error.hint}]`
          }
        }

        // Check if it's an authentication issue
        if (!user) {
          errorMessage = '로그인이 필요합니다. 다시 로그인해 주세요.'
        }

        if (typeof errorMessage === 'string' && errorMessage.includes('Failed to fetch')) {
          errorMessage =
            'Supabase와의 통신 중 문제가 발생했습니다. 네트워크 연결을 확인한 후 다시 시도해 주세요.'
        }

        // Log the full error object for debugging
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
  }, [projectId, user, setStoryboard, setCards])

  // SSE stream: 이미지 생성 중인 프레임이 있을 때만 연결
  useEffect(() => {
    if (!projectId) return

    // 진행 중인 프레임이 있는지 확인
    const hasProcessingFrames = frames.some(f => !['ready', 'error'].includes(f.status as any))

    if (hasProcessingFrames) {
      console.log('[SSE] Starting stream - processing frames detected')
      startStream()
    } else {
      // 모든 프레임이 완료 상태면 SSE 연결 해제
      if (sseRef.current) {
        console.log('[SSE] Closing stream - all frames completed')
        sseRef.current.close()
        sseRef.current = null
      }
    }
  }, [projectId, frames])

  // 프레임 상태 변경 시 SSE 연결 상태 재확인
  useEffect(() => {
    if (!projectId || frames.length === 0) return

    const processingFrames = frames.filter(f => !['ready', 'error'].includes(f.status as any))

    // 모든 프레임이 완료되었는데 SSE가 여전히 연결되어 있다면 해제
    if (processingFrames.length === 0 && sseRef.current) {
      console.log('[SSE] Force closing stream - no processing frames')
      sseRef.current.close()
      sseRef.current = null
    }
  }, [frames, projectId])

  // SSE stream for progressive updates
  const startStream = () => {
    if (!projectId) return
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
    const connect = (attempt = 0) => {
      try {
        const es = new EventSource(`/api/storyboard/stream?id=${encodeURIComponent(projectId)}`)
        sseRef.current = es
        es.addEventListener('init', (e: any) => {
          try {
            const data = JSON.parse(e.data)
            setStatus({ status: data.status })
            if (data.title) setSbTitle(data.title)
            // Only set frames if we don't have any frames yet (initial load)
            if (frames.length === 0) {
              setFrames(data.frames || [])
              setIndex(0)
            }
            setLoading(false)
          } catch {}
        })
        es.addEventListener('frame', (e: any) => {
          try {
            const data = JSON.parse(e.data)
            if (data?.frame?.id) {
              setFrames(prev => {
                const idx = prev.findIndex(f => f.id === data.frame.id)
                if (idx === -1) {
                  // Only add new frame if it doesn't exist
                  return [...prev, data.frame]
                } else {
                  // Update existing frame but preserve local changes
                  const existingFrame = prev[idx]
                  const updatedFrame = {
                    ...existingFrame,
                    ...data.frame,
                    // Preserve local imageUrl to prevent SSE from overwriting uploaded images
                    imageUrl: existingFrame.imageUrl || data.frame.imageUrl,
                  }
                  // Preserve local scene number if it was manually changed
                  if (existingFrame.scene !== data.frame.scene && existingFrame.scene !== idx + 1) {
                    updatedFrame.scene = existingFrame.scene
                  }
                  const copy = [...prev]
                  copy[idx] = updatedFrame
                  return copy
                }
              })
            }
          } catch {}
        })
        es.addEventListener('complete', (e: any) => {
          try {
            const data = JSON.parse(e.data)
            setStatus({ status: data.status })
            if (data.title) setSbTitle(data.title)
            // Don't overwrite local frames with server data
            // Only update status and title
          } catch {}
        })
        es.addEventListener('end', () => {
          if (sseRef.current) {
            sseRef.current.close()
            sseRef.current = null
          }
        })
        es.onerror = () => {
          es.close()
          if (attempt < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
            setTimeout(() => connect(attempt + 1), delay)
          } else {
            // In case server returned 404 (completed elsewhere), avoid loud error
            setError(null)
            setLoading(false)
          }
        }
      } catch (err) {
        if (attempt < 5) setTimeout(() => connect(attempt + 1), 1000 * (attempt + 1))
      }
    }
    connect()
  }
  React.useEffect(
    () => () => {
      if (sseRef.current) sseRef.current.close()
    },
    []
  )

  // 네비게이션 핸들러
  const handleNavigateToStoryboard = useCallback(() => {
    setViewMode('storyboard')
    // URL에서 frame 파라미터 제거
    const newUrl = `/project/${projectId}/storyboard/${projectId}`
    router.replace(newUrl, { scroll: false })
  }, [projectId, router])

  const handleNavigateToEditor = useCallback(() => {
    setViewMode('editor')
    // URL에 frame 파라미터 추가
    const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${index + 1}`
    router.replace(newUrl, { scroll: false })
  }, [projectId, index, router])

  const handleNavigateToTimeline = useCallback(() => {
    // URL에서 frame 파라미터 제거
    const newUrl = `/project/${projectId}/storyboard/${projectId}?view=timeline`
    router.replace(newUrl, { scroll: false })
  }, [projectId, router])

  const handleNavigateToCharacters = useCallback(() => {
    setViewMode('models')
    if (!projectId || !sbId) return
    router.push(`/project/${projectId}/storyboard/${sbId}/characters`)
  }, [projectId, router, sbId])

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

  // 키보드 네비게이션 (Frame 모드에서만)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFrameMode) {
        if (e.key === 'ArrowRight' && index < frames.length - 1) {
          const newIndex = index + 1
          setIndex(newIndex)
          // URL 업데이트
          const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${newIndex + 1}`
          router.replace(newUrl, { scroll: false })
        }
        if (e.key === 'ArrowLeft' && index > 0) {
          const newIndex = index - 1
          setIndex(newIndex)
          // URL 업데이트
          const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${newIndex + 1}`
          router.replace(newUrl, { scroll: false })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length, index, isFrameMode, projectId, router])

  const handleOpenFrame = useCallback(
    (frameIndex: number) => {
      setIndex(frameIndex)
      setViewMode('editor')
      // URL에 frame 파라미터 추가
      const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${frameIndex + 1}`
      router.replace(newUrl, { scroll: false })
    },
    [projectId, router]
  )

  // Add / Delete frame handlers
  const handleAddFrame = useCallback(
    async (insertIndex?: number) => {
      if (!user?.id || !projectId || !session) return

      const allCards = useStoryboardStore.getState().cards[projectId] || []
      const targetIndex = Math.min(Math.max(insertIndex ?? allCards.length, 0), allCards.length)

      try {
        const inserted = await createAndLinkCard(
          {
            userId: user.id,
            projectId: projectId,
            currentCards: allCards,
            insertIndex: targetIndex,
          },
          'STORYBOARD',
          session.access_token
        )

        const mergedCards = [...allCards]
        mergedCards.splice(targetIndex, 0, inserted)

        const reindexedCards = mergedCards.map((card, idx, arr) => ({
          ...card,
          order_index: idx,
          scene_number: idx + 1,
          prev_card_id: idx > 0 ? arr[idx - 1].id : undefined,
          next_card_id: idx < arr.length - 1 ? arr[idx + 1].id : undefined,
        }))

        setCards(projectId, reindexedCards)
        setFrames(reindexedCards.map((card, idx) => cardToFrame(card, idx)))
        setIndex(targetIndex)

        await fetch('/api/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            cards: reindexedCards.map(card => ({
              id: card.id,
              order_index: card.order_index,
              scene_number: card.scene_number,
              prev_card_id: card.prev_card_id,
              next_card_id: card.next_card_id,
            })),
          }),
        }).catch(() => {})
      } catch (e) {
        console.error('❌ [STORYBOARD ADD FRAME] Failed to add frame:', e)
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        alert(`카드 생성에 실패했습니다: ${msg}`)
      }
    },
    [user?.id, projectId, session, setCards, setFrames, setIndex]
  )

  const handleGenerateSceneFromPrompt = useCallback(
    async (promptText: string) => {
      if (!user?.id || !projectId || !session) {
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
            userId: user.id,
            projectId: projectId,
            currentCards: currentCardsSnapshot,
          },
          'TIMELINE_GENERATE',
          session.access_token
        )
      } catch (error) {
        throw error instanceof Error
          ? new Error(error.message)
          : new Error('씬을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      }

      if (!inserted) {
        throw new Error('새로운 씬이 정상적으로 생성되지 않았습니다.')
      }

      const insertedWithPrompt: Card = {
        ...inserted,
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
            Authorization: `Bearer ${session.access_token}`,
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
    [user?.id, projectId, session, setCards, ratio, projectCharacters]
  )

  const handleOpenStoryboardEdit = useCallback(
    (cardId: string) => {
      // 실제 카드 데이터에서 메타데이터 가져오기
      const actualCard = cards.find(card => card.id === cardId)
      if (!actualCard) return

      // StoryboardFrame 형태로 변환
      const frameData: StoryboardFrame = cardToFrame(actualCard)

      setEditingFrame(frameData)
    },
    [setEditingFrame, cards]
  )

  const handleDeleteFrame = useCallback(
    async (frameId: string) => {
      if (!user?.id || !projectId || deletingFrameId || !session) return

      console.log('🗑️ [DELETE FRAME] Deleting card via Zustand:', frameId)

      // 삭제 중 상태 설정 (중복 클릭 방지)
      setDeletingFrameId(frameId)

      try {
        // 1) 서버 영구 삭제
        const delRes = await fetch('/api/cards', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ cardIds: [frameId] }),
        })
        if (!delRes.ok) {
          const msg = await delRes.text().catch(() => 'Delete failed')
          throw new Error(msg)
        }

        // 2) 로컬 Zustand 스토어 반영
        await deleteCard(frameId)

        // 3) 최신 cards 스냅샷 재구성 + 순번 보정 + DB 반영
        const allCards = useStoryboardStore.getState().cards[projectId] || []
        const sorted = allCards.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        const reindexedCards = sorted.map((c, idx) => ({
          ...c,
          order_index: idx,
          scene_number: idx + 1,
        }))
        if (reindexedCards.length > 0) {
          await fetch('/api/cards', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              cards: reindexedCards.map(c => ({
                id: c.id,
                order_index: c.order_index,
                scene_number: c.scene_number,
              })),
            }),
          }).catch(() => {})
        }

        // 4) 프레임 상태 갱신 및 인덱스 클램프
        const reindexed = reindexedCards.map(card => cardToFrame(card))
        setFrames(reindexed)
        setIndex(prev => {
          const newLen = reindexed.length
          if (newLen === 0) return 0
          return Math.min(prev, newLen - 1)
        })
        console.log('🔄 [DELETE FRAME] Frames rebuilt & reindexed:', reindexed.length)
      } catch (error) {
        console.error('❌ [DELETE FRAME] Error during deletion:', error)
      } finally {
        // 삭제 완료 후 상태 초기화
        setDeletingFrameId(null)
      }
    },
    [user?.id, projectId, session, deletingFrameId, deleteCard, setFrames, setIndex]
  )

  const handleGenerateVideo = useCallback(
    async (frameId: string) => {
      if (!projectId) return
      const frame = frames.find(f => f.id === frameId)
      if (!frame) return

      if (!frame.imageUrl) {
        setError('Generate an image for this scene before creating a video.')
        return
      }

      if (!user || !session?.access_token) {
        setError('You must be signed in to generate videos.')
        return
      }

      try {
        setGeneratingVideoId(frameId)
        setError(null)

        const requestPrompt = (frame.imagePrompt || frame.shotDescription || '').trim()

        const response = await fetch('/api/video/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            frameId,
            projectId,
            imageUrl: frame.imageUrl,
            prompt: requestPrompt,
          }),
        })

        const payload = (await response.json().catch(() => ({}))) as {
          videoUrl?: string
          videoKey?: string | null
          videoPrompt?: string
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to generate video')
        }

        const videoUrl = payload.videoUrl
        const videoKey = payload.videoKey ?? undefined
        const updatedVideoPrompt = payload.videoPrompt ?? requestPrompt
        if (!videoUrl) {
          throw new Error('Video generation completed without returning a usable URL')
        }

        setFrames(prev =>
          prev.map(f =>
            f.id === frameId
              ? { ...f, videoUrl, videoKey: videoKey ?? undefined, videoPrompt: updatedVideoPrompt }
              : f
          )
        )

        const storeState = useStoryboardStore.getState()
        const existingCards = storeState.cards[projectId] || []
        const updatedCards = existingCards.map(card =>
          card.id === frameId
            ? {
                ...card,
                video_url: videoUrl,
                videoUrl,
                video_key: videoKey,
                videoKey,
                video_prompt: updatedVideoPrompt,
                videoPrompt: updatedVideoPrompt,
              }
            : card
        )
        setCards(projectId, updatedCards)

        setVideoPreview({ frameId, url: videoUrl })
      } catch (error) {
        console.error('❌ [VIDEO] Generation failed:', error)
        setError(error instanceof Error ? error.message : 'Failed to generate video')
      } finally {
        setGeneratingVideoId(null)
      }
    },
    [frames, projectId, session, setCards, setFrames, user]
  )

  const handlePlayVideo = useCallback(
    (frameId: string) => {
      const frame = frames.find(f => f.id === frameId)
      if (!frame || !frame.videoUrl) {
        setError('No video available yet for this scene. Generate one first.')
        return
      }

      setVideoPreview({ frameId, url: frame.videoUrl })
    },
    [frames]
  )

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

  // 단순 카드 (드래그 제거)
  // FrameCard 컴포넌트 제거: StoryboardCard로 직접 렌더링

  // 현재 프레임 안정적 참조
  const currentFrame = useMemo(() => frames[index] || null, [frames, index])

  return (
    <div>
      <div className="w-full px-4">
        {/* Header 라인: FloatingHeader + ViewModeToggle */}
        <div className="relative w-full mb-6">
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
          />

          {/* ViewModeToggle - 스토리보드 뷰에서만 표시, 클라이언트에서만 실제 상태 표시 */}
          {viewMode === 'storyboard' && (
            <div className="absolute top-0 right-4 pointer-events-auto">
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
              <div className="flex justify-center">
                <div className="grid grid-cols-4 gap-6 w-full max-w-[2000px]">
                  {Array.from({ length: Math.max(cards.length, 8) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="group relative flex flex-col rounded-lg border border-neutral-700 bg-black shadow-lg overflow-hidden h-96"
                    >
                      <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-neutral-800 w-16 h-4 animate-pulse" />
                      <div className="absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full bg-neutral-700 ring-2 ring-neutral-700 animate-pulse" />
                      <div className="relative w-full h-96 bg-neutral-900">
                        <div className="absolute inset-0 bg-[linear-gradient(110deg,#374151_8%,#4b5563_18%,#374151_33%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
                        <style jsx>{`
                          @keyframes shimmer {
                            0% {
                              background-position: 0% 0;
                            }
                            100% {
                              background-position: -200% 0;
                            }
                          }
                        `}</style>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && frames.length === 0 && (
              <EmptyStoryboardState onCreateFirstCard={handleAddFrame} />
            )}

            {!loading && frames.length > 0 && (!isClient || storyboardViewMode === 'grid') && (
              <FrameGrid
                frames={frames}
                onFrameOpen={handleOpenFrame}
                onFrameEdit={frameId => {
                  const frameData = frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={handleDeleteFrame}
                onAddFrame={handleAddFrame}
                deletingFrameId={deletingFrameId}
                loading={loading}
                cardsLength={cards.length}
                onGenerateVideo={handleGenerateVideo}
                onPlayVideo={handlePlayVideo}
                generatingVideoId={generatingVideoId}
              />
            )}

            {!loading && frames.length > 0 && isClient && storyboardViewMode === 'list' && (
              <FrameList
                frames={frames}
                onFrameEdit={handleOpenFrame}
                onFrameEditMetadata={frameId => {
                  const frameData = frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={handleDeleteFrame}
                onAddFrame={handleAddFrame}
                deletingFrameId={deletingFrameId}
                onGenerateVideo={handleGenerateVideo}
                onPlayVideo={handlePlayVideo}
                generatingVideoId={generatingVideoId}
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
                    console.log(
                      `Timeline saved: ${result.successful} successful, ${result.failed} failed`
                    )
                    // You could add a toast notification here
                  } else {
                    console.error('Failed to save timeline')
                  }
                } catch (error) {
                  console.error('Error saving timeline:', error)
                }
              }}
              onAddFrame={async () => {
                try {
                  const newCard = await createAndLinkCard(
                    {
                      userId: user?.id || '',
                      projectId: projectId,
                      currentCards: cards,
                    },
                    'TIMELINE'
                  )

                  if (newCard) {
                    setCards(projectId, [...cards, newCard])
                    setFrames(prev => [...prev, cardToFrame(newCard)])
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
                onAddFrame={handleAddFrame}
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
                onGenerateVideo={frame => handleGenerateVideo(frame.id)}
                onPlayVideo={frame => handlePlayVideo(frame.id)}
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

      {videoPreview && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setVideoPreview(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoPreview(null)}
              className="absolute top-4 right-4 px-3 py-1 rounded-md border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              Close
            </button>
            <div className="text-sm text-neutral-300 mb-4 pr-16">Storyboard clip preview</div>
            <div className="relative w-full bg-black rounded-xl overflow-hidden">
              <video
                key={videoPreview.url}
                src={videoPreview.url}
                controls
                autoPlay
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
