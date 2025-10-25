'use client'

import { useState, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { createAndLinkCard } from '@/lib/cards'
import { cardToFrame } from '@/lib/utils'
import { clampCardWidth } from '@/lib/constants'
import type { StoryboardFrame } from '@/types/storyboard'
import { useCards } from '@/lib/api'
import { Card } from '@/types'

export const useFrameManagement = (
  projectId: string,
  userId: string | null,
  latestCardWidthRef: React.MutableRefObject<number>
) => {
  const [deletingFrameId, setDeletingFrameId] = useState<string | null>(null)
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<{ frameId: string; url: string } | null>(null)

  const { cards, updateCards, deleteCard, mutate } = useCards(projectId)
  const framesRef = useRef<StoryboardFrame[]>([])

  const handleAddFrame = useCallback(
    async (insertIndex?: number) => {
      if (!userId || !projectId) return

      const allCards = cards || []
      const targetIndex = Math.min(Math.max(insertIndex ?? allCards.length, 0), allCards.length)

      // 1) Optimistic add (temp card)
      const tempId = `temp-${Date.now()}`
      const widthForCard = clampCardWidth(latestCardWidthRef.current)
      mutate((prev: any) => {
        const base = Array.isArray(prev?.data) ? prev.data : []
        const tempCard: any = {
          id: tempId,
          project_id: projectId,
          user_id: userId,
          type: 'card',
          title: 'New Scene',
          content: '',
          order_index: targetIndex,
          scene_number: targetIndex + 1,
          card_width: widthForCard,
          storyboard_status: 'generating',
        }
        const merged = [...base]
        merged.splice(targetIndex, 0, tempCard)
        const reindexed = merged.map((c: any, idx: number, arr: any[]) => ({
          ...c,
          order_index: idx,
          scene_number: idx + 1,
          prev_card_id: idx > 0 ? arr[idx - 1].id : undefined,
          next_card_id: idx < arr.length - 1 ? arr[idx + 1].id : undefined,
        }))
        return { data: reindexed }
      }, false)

      try {
        // 2) Server create
        const inserted = await createAndLinkCard(
          {
            userId: userId,
            projectId: projectId,
            currentCards: allCards,
            insertIndex: targetIndex,
            cardWidth: latestCardWidthRef.current,
          },
          'STORYBOARD'
        )

        const normalizedInserted =
          typeof inserted.card_width === 'number' && Number.isFinite(inserted.card_width)
            ? { ...inserted, card_width: clampCardWidth(inserted.card_width) }
            : { ...inserted, card_width: widthForCard }

        // 3) Replace temp with real, reindex, then persist order
        let afterReplace: any[] = []
        mutate((prev: any) => {
          const base = Array.isArray(prev?.data) ? prev.data : []
          const idx = base.findIndex((c: any) => c.id === tempId)
          const merged = [...base]
          if (idx >= 0) {
            merged[idx] = normalizedInserted
          } else {
            merged.splice(targetIndex, 0, normalizedInserted)
          }
          const reindexed = merged.map((c: any, i: number, arr: any[]) => ({
            ...c,
            order_index: i,
            scene_number: i + 1,
            prev_card_id: i > 0 ? arr[i - 1].id : undefined,
            next_card_id: i < arr.length - 1 ? arr[i + 1].id : undefined,
          }))
          afterReplace = reindexed
          return { data: reindexed }
        }, false)

        // Persist ordering (id, order_index, scene_number, prev/next)
        await updateCards(
          afterReplace.map((c: any) => ({
            id: c.id,
            order_index: c.order_index,
            scene_number: c.scene_number,
            prev_card_id: c.prev_card_id,
            next_card_id: c.next_card_id,
          }))
        )

        return afterReplace.map((card: any, idx: number) => cardToFrame(card, idx))
      } catch (e) {
        // Rollback temp card
        mutate((prev: any) => {
          const base = Array.isArray(prev?.data) ? prev.data : []
          const next = base.filter((c: any) => c.id !== tempId)
          return { data: next }
        }, false)
        console.error('❌ [STORYBOARD ADD FRAME] Failed to add frame:', e)
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        throw new Error(`카드 생성에 실패했습니다: ${msg}`)
      }
    },
    [userId, projectId, updateCards, mutate, cards, latestCardWidthRef]
  )

  const handleDeleteFrame = useCallback(
    async (frameId: string) => {
      if (!userId || !projectId || deletingFrameId) return

      setDeletingFrameId(frameId)

      try {
        // 단일 경로: 훅의 deleteCard가 낙관적 업데이트 + 서버 반영 처리
        await deleteCard(frameId)

        const allCards = cards || []
        const sorted = [...allCards].sort((a: Card, b: Card) => (a.order_index ?? 0) - (b.order_index ?? 0))
        const reindexedCards = sorted.map((c: Card, idx: number) => ({
          ...c,
          order_index: idx,
          scene_number: idx + 1,
        }))
        
        if (reindexedCards.length > 0) {
          await updateCards(reindexedCards.map((c: Card) => ({
            id: c.id,
            order_index: c.order_index,
            scene_number: c.scene_number,
          })))
        }

        return reindexedCards.map((card: Card) => cardToFrame(card))
      } catch (error) {
        console.error('❌ [DELETE FRAME] Error during deletion:', error)
        throw error
      } finally {
        setDeletingFrameId(null)
      }
    },
    [userId, projectId, deletingFrameId, deleteCard, cards, updateCards]
  )

  const handleReorderFrames = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!projectId) return
      if (fromIndex === toIndex) return

      const sortedCards = [...(cards || [])].sort(
        (a: Card, b: Card) => (a.order_index ?? 0) - (b.order_index ?? 0)
      )
      if (!sortedCards.length) return

      const movedCards = arrayMove(sortedCards, fromIndex, toIndex)
      const normalisedCards = movedCards.map((card: Card, idx: number, arr: Card[]) => {
        const prevCard = arr[idx - 1]
        const nextCard = arr[idx + 1]
        return {
          ...card,
          order_index: idx,
          scene_number: idx + 1,
          prev_card_id: prevCard ? prevCard.id : null,
          next_card_id: nextCard ? nextCard.id : null,
        }
      })

      const optimisticFrames = normalisedCards.map((card: Card, idx: number) =>
        cardToFrame(card, idx)
      )
      framesRef.current = optimisticFrames

      mutate({ data: normalisedCards }, false)

      void updateCards(
        normalisedCards.map((card: Card) => ({
          id: card.id,
          order_index: card.order_index,
          scene_number: card.scene_number,
          prev_card_id: card.prev_card_id,
          next_card_id: card.next_card_id,
        }))
      )

      return { reorderedFrames: optimisticFrames, newIndex: toIndex }
    },
    [projectId, cards, mutate, updateCards]
  )

  const handleGenerateVideo = useCallback(
    async (frameId: string, frames: StoryboardFrame[]) => {
      if (!projectId) return
      const frame = frames.find(f => f.id === frameId)
      if (!frame) return

      if (!frame.imageUrl) {
        throw new Error('Generate an image for this scene before creating a video.')
      }

      if (!userId) {
        throw new Error('You must be signed in to generate videos.')
      }

      try {
        setGeneratingVideoId(frameId)

        const requestPrompt = (frame.imagePrompt || frame.shotDescription || '').trim()

        const response = await fetch('/api/video/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

        const storeState = { cards: { [projectId]: cards || [] } }
        const existingCards = storeState.cards[projectId] || []
        const updatedCards = existingCards.map((card: Card) =>
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
        await updateCards(updatedCards)

        setVideoPreview({ frameId, url: videoUrl })

        return {
          videoUrl,
          videoKey,
          videoPrompt: updatedVideoPrompt,
        }
      } catch (error) {
        console.error('❌ [VIDEO] Generation failed:', error)
        throw error
      } finally {
        setGeneratingVideoId(null)
      }
    },
    [projectId, updateCards, userId]
  )

  const handlePlayVideo = useCallback(
    (frameId: string, frames: StoryboardFrame[]) => {
      const frame = frames.find(f => f.id === frameId)
      const url = (frame as any)?.videoUrl as string | undefined
      if (!frame || !url) {
        throw new Error('No video available yet for this scene. Generate one first.')
      }

      setVideoPreview({ frameId, url })
    },
    []
  )

  return {
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
  }
}
