"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { StoryboardFrame } from '@/types/storyboard'
import type { Card } from '@/types'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useStoryboardStore } from '@/store/storyboard'
import { useUIStore, useHydratedUIStore } from '@/store/ui'
import { Plus } from 'lucide-react'
import StoryboardCard from '@/components/storyboard/StoryboardCard'
import FrameEditModal from '@/components/storyboard/FrameEditModal'
import FrameGrid from '@/components/storyboard/viewer/FrameGrid'
import FrameList from '@/components/storyboard/viewer/FrameList'
import ViewModeToggle from '@/components/storyboard/ViewModeToggle'
import { createAndLinkCard } from '@/lib/cards'
import SingleEditorLayout from '@/components/storyboard/editor/SingleEditorLayout'
import SequencePanel from '@/components/storyboard/editor/SequencePanel'
import ImageStage from '@/components/storyboard/editor/ImageStage'
import MetadataPanel from '@/components/storyboard/editor/MetadataPanel'
import ImageEditPanel from '@/components/storyboard/editor/ImageEditPanel'
import FloatingHeader from '@/components/storyboard/FloatingHeader'
import { cardToFrame, getImageUrlFromCard } from '@/lib/utils'

// Stable empty array to avoid creating new [] in selectors (prevents getSnapshot loop warnings)
const EMPTY_CARDS: Card[] = []

export default function StoryboardPage() {
  const params = useParams() as any
  const router = useRouter()
  const projectId = params.id
  const sbId = params.sbId
  const { user } = useSupabase()
  
  // URL에서 frame 파라미터 확인 (Editor 모드 진입 여부)
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const frameParam = searchParams.get('frame')
  const initialFrameMode = !!frameParam
  const initialIndex = frameParam ? Math.max(0, parseInt(frameParam) - 1) : 0

  const [frames, setFrames] = useState<StoryboardFrame[]>([])
  const [index, setIndex] = useState(initialIndex) // current frame in single view mode
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [sbTitle, setSbTitle] = useState<string>('Storyboard')
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null)
  const [deletingFrameId, setDeletingFrameId] = useState<string | null>(null)
  // aspect ratio is selected at build time; not yet sent back in API payload. Placeholder for future.
  const [ratio] = useState<'16:9' | '1:1' | '9:16' | '4:3' | '3:4'>('3:4')
  
  // Frame editor 모드 상태
  const [isFrameMode, setIsFrameMode] = useState(initialFrameMode)
  // UI Store 연결 - 뷰 모드 관리 (hydration 안전)
  const { storyboardViewMode, setStoryboardViewMode, isClient } = useHydratedUIStore()
  
  // Zustand store 연결
  const storyboard = useStoryboardStore(s => s.storyboard)
  const setStoryboard = useStoryboardStore(s => s.setStoryboard)
  const cards = useStoryboardStore(s => s.cards[sbId] || EMPTY_CARDS)
  const setCards = useStoryboardStore(s => s.setCards)
  const deleteCard = useStoryboardStore(s => s.deleteCard)
  const selectCard = useStoryboardStore(s => s.selectCard)
  const sseRef = React.useRef<EventSource | null>(null)

  // 안정적인 이미지 업데이트 콜백
  const handleImageUpdated = useCallback(async (frameId: string, newUrl: string, metadata?: { key?: string, size?: number, type?: string }) => {
    // 로컬 상태 즉시 업데이트
    setFrames(prev => prev.map((f) => f.id === frameId ? { ...f, imageUrl: newUrl, status: 'ready' } : f));
    
    // 로컬 미리보기 URL은 DB에 저장하지 않음
    if (newUrl.startsWith('blob:') || newUrl.startsWith('data:')) {
      return
    }
    
    // 데이터베이스에 저장
    try {
      const card = cards.find(c => c.id === frameId);
      if (!card) return;
      
      // 단일 이미지 URL 방식으로 저장
      const updateData: any = {
        image_url: newUrl,
        image_urls: [newUrl], // 하위 호환성을 위해 배열도 유지
        selected_image_url: 0 // 첫 번째 이미지 선택
      }
      
      // 메타데이터가 있으면 추가
      if (metadata) {
        if (metadata.key) updateData.image_key = metadata.key
        if (metadata.size) updateData.image_size = metadata.size
        if (metadata.type) updateData.image_type = metadata.type
      }
      
      const response = await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: [{
            id: frameId,
            ...updateData
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save image URL to database');
      }
    } catch (error) {
      console.error('Failed to save image URL to database:', error);
    }
  }, [cards]);

  // 현재 프레임 안정적 참조

  // 근본적 해결: 실제 데이터 변경 시그니처 기반 동기화
  const lastSyncSignatureRef = useRef<string>('')

  useEffect(() => {
    if (!sbId) return

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
  }, [cards, sbId])


  // viewportWidth 제거에 따라 resize 리스너도 제거

  // Initial data load from Supabase (immediate, no SSE waiting)
  useEffect(() => {
    if (!sbId) return
    
    const loadStoryboardData = async () => {
      setLoading(true)
      try {
        // Load storyboard metadata from Supabase
        const { data: sbData, error: sbError } = await supabase
          .from('storyboards')
          .select('*')
          .eq('id', sbId)
          .single()
        
        if (sbError) throw sbError
        
        if (sbData) {
          const description = JSON.parse(sbData.description || '{}')
          setSbTitle(sbData.title || 'Storyboard')
          setStatus({ status: 'completed', readyCount: description.frames?.length || 0, total: description.frames?.length || 0 })
          
          // Zustand 스토어에 현재 스토리보드 설정 (addCard 등에서 필요)
          try {
            setStoryboard({
              id: sbData.id,
              user_id: sbData.user_id,
              project_id: sbData.project_id,
              title: sbData.title || 'Storyboard',
              description: sbData.description || undefined,
              is_public: Boolean(sbData.is_public),
              created_at: sbData.created_at,
              updated_at: sbData.updated_at,
            } as any)
          } catch {}
        }
        
        // Load cards data from Supabase and set to Zustand store
        const { data: cardsData, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('storyboard_id', sbId)
          .order('order_index', { ascending: true })
        
        if (cardsError) {
          console.error('Failed to load cards:', cardsError)
        } else if (cardsData) {
          // Zustand store에 카드 데이터 설정
          setCards(sbId, cardsData)
          
          // frames 상태도 카드 데이터 기반으로 초기화
          const initialFrames = cardsData.map((card, index) => cardToFrame(card, index))
          
          setFrames(initialFrames)
        }
        
        setLoading(false)
        
      } catch (error) {
        console.error('Failed to load storyboard:', error)
        setError('스토리보드를 불러올 수 없습니다.')
        setLoading(false)
      }
    }
    
    loadStoryboardData()
  }, [sbId, setStoryboard, setCards])

  // SSE stream: 이미지 생성 중인 프레임이 있을 때만 연결
  useEffect(() => {
    if (!sbId) return
    
    // 진행 중인 프레임이 있는지 확인
    const hasProcessingFrames = frames.some(f => 
      !['ready', 'error'].includes(f.status as any)
    )
    
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
  }, [sbId, frames])

  // 프레임 상태 변경 시 SSE 연결 상태 재확인
  useEffect(() => {
    if (!sbId || frames.length === 0) return
    
    const processingFrames = frames.filter(f => 
      !['ready', 'error'].includes(f.status as any)
    )
    
    // 모든 프레임이 완료되었는데 SSE가 여전히 연결되어 있다면 해제
    if (processingFrames.length === 0 && sseRef.current) {
      console.log('[SSE] Force closing stream - no processing frames')
      sseRef.current.close()
      sseRef.current = null
    }
  }, [frames, sbId])


  // SSE stream for progressive updates
  const startStream = () => {
    if (!sbId) return
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    const connect = (attempt = 0) => {
      try {
        const es = new EventSource(`/api/storyboard/stream?id=${encodeURIComponent(sbId)}`)
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
                const idx = prev.findIndex(f=>f.id===data.frame.id)
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
                    imageUrl: existingFrame.imageUrl || data.frame.imageUrl
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
        es.addEventListener('end', () => { if (sseRef.current) { sseRef.current.close(); sseRef.current = null } })
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
  React.useEffect(() => () => { if (sseRef.current) sseRef.current.close() }, [])

  // 네비게이션 핸들러
  const handleNavigateToStoryboard = useCallback(() => {
    setIsFrameMode(false)
    // URL에서 frame 파라미터 제거
    const newUrl = `/project/${projectId}/storyboard/${sbId}`
    router.replace(newUrl, { scroll: false })
  }, [projectId, sbId, router])

  const handleNavigateToEditor = useCallback(() => {
    setIsFrameMode(true)
    // URL에 frame 파라미터 추가
    const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${index + 1}`
    router.replace(newUrl, { scroll: false })
  }, [projectId, sbId, index, router])

  // 키보드 네비게이션 (Frame 모드에서만)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFrameMode) {
        if (e.key === 'ArrowRight' && index < frames.length - 1) {
          const newIndex = index + 1
          setIndex(newIndex)
          // URL 업데이트
          const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${newIndex + 1}`
          router.replace(newUrl, { scroll: false })
        }
        if (e.key === 'ArrowLeft' && index > 0) {
          const newIndex = index - 1
          setIndex(newIndex)
          // URL 업데이트
          const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${newIndex + 1}`
          router.replace(newUrl, { scroll: false })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length, index, isFrameMode, projectId, sbId, router])

  const handleOpenFrame = useCallback((frameIndex: number) => {
    setIndex(frameIndex)
    setIsFrameMode(true)
    // URL에 frame 파라미터 추가
    const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${frameIndex + 1}`
    router.replace(newUrl, { scroll: false })
  }, [projectId, sbId, router])

  // Add / Delete frame handlers
  const handleAddFrame = async () => {
    if (!user?.id || !sbId) return

    const currentCards = cards
    try {
      const inserted = await createAndLinkCard({
        userId: user.id,
        storyboardId: sbId,
        projectId: projectId,
        currentCards
      }, 'STORYBOARD')
      const updated = [...currentCards, inserted]
      setCards(sbId, updated)
    } catch (e) {
      console.error('❌ [STORYBOARD ADD FRAME] Failed to add frame:', e)
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      alert(`카드 생성에 실패했습니다: ${msg}`)
    }
  }

  const handleOpenStoryboardEdit = useCallback((cardId: string) => {
    // 실제 카드 데이터에서 메타데이터 가져오기
    const actualCard = cards.find(card => card.id === cardId)
    if (!actualCard) return
    
    // StoryboardFrame 형태로 변환
    const frameData: StoryboardFrame = cardToFrame(actualCard)
    
    setEditingFrame(frameData)
  }, [setEditingFrame, cards])

  const handleDeleteFrame = async (frameId: string) => {
    if (!user?.id || !sbId || deletingFrameId) return

    console.log('🗑️ [DELETE FRAME] Deleting card via Zustand:', frameId)

    // 삭제 중 상태 설정 (중복 클릭 방지)
    setDeletingFrameId(frameId)

    try {
      // 1) 서버 영구 삭제
      const delRes = await fetch('/api/cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [frameId] })
      })
      if (!delRes.ok) {
        const msg = await delRes.text().catch(()=> 'Delete failed')
        throw new Error(msg)
      }

      // 2) 로컬 Zustand 스토어 반영
      await deleteCard(frameId)

      // 3) 최신 cards 스냅샷 재구성 + 순번 보정 + DB 반영
      const allCards = useStoryboardStore.getState().cards[sbId] || []
      const sorted = allCards.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      const reindexedCards = sorted.map((c, idx) => ({ ...c, order_index: idx, scene_number: idx + 1 }))
      if (reindexedCards.length > 0) {
        await fetch('/api/cards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: reindexedCards.map(c => ({ id: c.id, order_index: c.order_index, scene_number: c.scene_number })) })
        }).catch(() => {})
      }

      // 4) 프레임 상태 갱신 및 인덱스 클램프
      const reindexed = reindexedCards.map((card) => cardToFrame(card))
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
  }

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
            currentView={isFrameMode ? 'editor' : 'storyboard'}
            onNavigateToStoryboard={handleNavigateToStoryboard}
            onNavigateToEditor={handleNavigateToEditor}
          />
          
          {/* ViewModeToggle - 스토리보드 뷰에서만 표시, 클라이언트에서만 실제 상태 표시 */}
          {!isFrameMode && (
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
        {!isFrameMode && (
          <>
            {/* Error message */}
            {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

            {/* 콘텐츠 렌더링 */}
            {loading && (
              <div className="flex justify-center">
                <div className="grid grid-cols-4 gap-6 w-full max-w-[2000px]">
                  {Array.from({ length: Math.max(cards.length, 8) }).map((_, idx) => (
                    <div key={idx} className="group relative flex flex-col rounded-lg border border-neutral-700 bg-black shadow-lg overflow-hidden h-96">
                      <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-neutral-800 w-16 h-4 animate-pulse" />
                      <div className="absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full bg-neutral-700 ring-2 ring-neutral-700 animate-pulse" />
                      <div className="relative w-full h-96 bg-neutral-900">
                        <div className="absolute inset-0 bg-[linear-gradient(110deg,#374151_8%,#4b5563_18%,#374151_33%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
                        <style jsx>{`@keyframes shimmer {0%{background-position:0% 0}100%{background-position:-200% 0}}`}</style>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!loading && (!isClient || storyboardViewMode === 'grid') && (
              <FrameGrid
                frames={frames}
                onFrameOpen={handleOpenFrame}
                onFrameEdit={(frameId) => {
                  const frameData = frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={handleDeleteFrame}
                onAddFrame={handleAddFrame}
                deletingFrameId={deletingFrameId}
                loading={loading}
                cardsLength={cards.length}
              />
            )}
            
            {!loading && isClient && storyboardViewMode === 'list' && (
              <FrameList
                frames={frames}
                onFrameEdit={handleOpenFrame}
                onFrameEditMetadata={(frameId) => {
                  const frameData = frames.find(f => f.id === frameId)
                  if (frameData) setEditingFrame(frameData)
                }}
                onFrameDelete={handleDeleteFrame}
                onAddFrame={handleAddFrame}
                deletingFrameId={deletingFrameId}
              />
            )}
          </>
        )}
        
        {/* 에디터 뷰 (Frame 모드) */}
        {isFrameMode && frames.length > 0 && currentFrame && (
          <SingleEditorLayout
            header={null}
            left={<SequencePanel 
              frames={frames} 
              currentIndex={index} 
              onSelect={(newIndex) => {
                setIndex(newIndex)
                const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${newIndex + 1}`
                router.replace(newUrl, { scroll: false })
              }} 
              onAddFrame={handleAddFrame} 
            />}
            center={<ImageStage 
              frame={currentFrame} 
              hasPrev={index>0} 
              hasNext={index<frames.length-1} 
              onPrev={() => {
                const newIndex = Math.max(0, index - 1)
                setIndex(newIndex)
                const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${newIndex + 1}`
                router.replace(newUrl, { scroll: false })
              }} 
              onNext={() => {
                const newIndex = Math.min(frames.length - 1, index + 1)
                setIndex(newIndex)
                const newUrl = `/project/${projectId}/storyboard/${sbId}?frame=${newIndex + 1}`
                router.replace(newUrl, { scroll: false })
              }} 
            />}
            right={
              <ImageEditPanel 
                storyboardId={sbId as string}
                frameId={currentFrame.id}
                currentImageUrl={currentFrame.imageUrl}
                onImageUpdated={(url) => handleImageUpdated(currentFrame.id, url)}
              />
            }
            footer={null}
          />
        )}
        
        {/* 프레임 편집 모달 */}
        {editingFrame && (
          <FrameEditModal
            frame={editingFrame}
            storyboardId={sbId}
            onClose={() => setEditingFrame(null)}
            onSaved={(updated) => {
              setFrames(prev => prev.map(f => f.id === updated.id ? updated : f));
              setEditingFrame(null);
            }}
          />
        )}
      </div>
    </div>
  )
}