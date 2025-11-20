'use client'

import { useState, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { createCard } from '@/lib/cards'
import { cardToFrame, getImageUrlFromCard } from '@/lib/utils'
import { clampCardWidth } from '@/lib/constants'
import type { StoryboardFrame } from '@/types/storyboard'
import { useCards } from '@/lib/api'
import { Card } from '@/types'

type ReindexedCard<T extends { id: string }> = T & {
  order_index: number
  scene_number: number
  prev_card_id: string | null
  next_card_id: string | null
}

const rebuildCardSequence = <T extends { id: string }>(cards: T[]): ReindexedCard<T>[] =>
  cards.map((card, idx, list) => ({
    ...card,
    order_index: idx,
    scene_number: idx + 1,
    prev_card_id: list[idx - 1]?.id ?? null,
    next_card_id: list[idx + 1]?.id ?? null,
  }))

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
    async (insertIndex?: number, duplicateCardId?: string) => {
      if (!userId || !projectId) return

      const allCards = cards || []
      const targetIndex = Math.min(Math.max(insertIndex ?? allCards.length, 0), allCards.length)

      // 1) Optimistic add (temp card)
      const tempId = `temp-${Date.now()}`
      const widthForCard = clampCardWidth(latestCardWidthRef.current)
      const duplicateFields: Partial<Card> | null = (() => {
        if (!duplicateCardId) return null

        const sourceCard = (cards || []).find((card: Card) => card.id === duplicateCardId)
        const sourceFrame = framesRef.current.find((frame) => frame.id === duplicateCardId) ?? null

        const rawHistory = sourceCard?.image_urls
        const historyFromCard = Array.isArray(rawHistory)
          ? rawHistory.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          : []
        const historyFromFrame = Array.isArray(sourceFrame?.imageHistory)
          ? sourceFrame.imageHistory.filter((url) => typeof url === 'string' && url.trim().length > 0)
          : []
        const duplicateHistory = historyFromCard.length
          ? [...historyFromCard]
          : historyFromFrame.length
            ? [...historyFromFrame]
            : []

        const duplicateImageUrl =
          (sourceCard ? getImageUrlFromCard(sourceCard) : undefined) ?? sourceFrame?.imageUrl

        if (!duplicateImageUrl) return null

        if (!duplicateHistory.includes(duplicateImageUrl)) {
          duplicateHistory.unshift(duplicateImageUrl)
        }

        const selectedIndex = duplicateHistory.indexOf(duplicateImageUrl)

        const fields: Partial<Card> = {
          image_url: duplicateImageUrl,
          image_urls: duplicateHistory,
          storyboard_status: sourceCard?.storyboard_status ?? sourceFrame?.status ?? 'ready',
        }

        if (selectedIndex >= 0) {
          fields.selected_image_url = selectedIndex
        }

        if (sourceCard?.image_key) {
          fields.image_key = sourceCard.image_key
        }
        if (typeof sourceCard?.image_size === 'number') {
          fields.image_size = sourceCard.image_size
        }
        if (sourceCard?.image_type) {
          fields.image_type = sourceCard.image_type
        }

        return fields
      })()
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
          storyboard_status: 'ready',
          ...(duplicateFields ?? {}),
        }
        const merged = [...base]
        merged.splice(targetIndex, 0, tempCard)
        const reindexed = rebuildCardSequence(merged)
        return { data: reindexed }
      }, false)

      try {
        // 2) Server create
        const inserted = await createCard(
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
        const normalizedInsertedWithDuplicate = duplicateFields
          ? { ...normalizedInserted, ...duplicateFields }
          : normalizedInserted

        // 3) Replace temp with real, reindex, then persist order
        let afterReplace: Card[] = []
        mutate((prev: any) => {
          const base = Array.isArray(prev?.data) ? prev.data : []
          const idx = base.findIndex((c: any) => c.id === tempId)
          const merged = [...base]
          if (idx >= 0) {
            merged[idx] = normalizedInsertedWithDuplicate
          } else {
            merged.splice(targetIndex, 0, normalizedInsertedWithDuplicate)
          }
          const reindexed = rebuildCardSequence(merged) as Card[]
          afterReplace = reindexed
          return { data: reindexed }
        }, false)

        const insertedCardId = normalizedInserted.id

        const duplicatePatch =
          duplicateFields && insertedCardId
            ? [
                {
                  id: insertedCardId,
                  ...duplicateFields,
                },
              ]
            : []

        if (duplicatePatch.length > 0) {
          await updateCards(duplicatePatch)
        }

        return afterReplace.map((card, idx) => cardToFrame(card, idx))
      } catch (e) {
        // Rollback temp card
        mutate((prev: any) => {
          const base = Array.isArray(prev?.data) ? (prev.data as Card[]) : []
          const filtered = base.filter((c: Card) => c.id !== tempId)
          const reindexed = rebuildCardSequence(filtered) as Card[]
          return { data: reindexed }
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

      const allCards = cards || []
      const sortedCards = [...allCards].sort(
        (a: Card, b: Card) => (a.order_index ?? 0) - (b.order_index ?? 0)
      )
      const targetIndex = sortedCards.findIndex(card => card.id === frameId)
      const cardsAfter = targetIndex >= 0 ? sortedCards.slice(targetIndex + 1) : []
      const reorderPatches =
        targetIndex >= 0
          ? cardsAfter.map((card, idx) => {
              const newOrder = targetIndex + idx
              return {
                id: card.id,
                order_index: newOrder,
                scene_number: newOrder + 1,
              }
            })
          : []

      const remainingCards = sortedCards.filter(card => card.id !== frameId)
      const reindexedCards = remainingCards.map((card, idx) => ({
        ...card,
        order_index: idx,
        scene_number: idx + 1,
      }))
      const reindexedFrames = reindexedCards.map((card, idx) => cardToFrame(card, idx))

      setDeletingFrameId(frameId)

      try {
        await deleteCard(frameId)

        if (reorderPatches.length > 0) {
          await updateCards(reorderPatches)
        }

        return reindexedFrames
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
      const normalisedCards = movedCards.map((card: Card, idx: number) => ({
        ...card,
        order_index: idx,
        scene_number: idx + 1,
      }))

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
        }))
      )

      return { reorderedFrames: optimisticFrames, newIndex: toIndex }
    },
    [projectId, cards, mutate, updateCards]
  )

  type VideoGenerationOptions = {
    modelId?: string
    startFrameId?: string
    endFrameId?: string
    startImageUrl?: string | null
    endImageUrl?: string | null
    prompt?: string
  }

  const handleGenerateVideo = useCallback(
    async (frameId: string, frames: StoryboardFrame[], options?: VideoGenerationOptions) => {
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

        const requestPrompt =
          typeof options?.prompt === 'string' && options.prompt.trim().length > 0
            ? options.prompt.trim()
            : (frame.imagePrompt || frame.shotDescription || '').trim()
        const startFrame =
          options?.startFrameId && options.startFrameId !== frameId
            ? frames.find(f => f.id === options.startFrameId)
            : frame
        const endFrame =
          options?.endFrameId && options.endFrameId !== frameId
            ? frames.find(f => f.id === options.endFrameId)
            : undefined

        const startImageUrl =
          options?.startImageUrl ?? startFrame?.imageUrl ?? frame.imageUrl ?? null
        const endImageUrl = options?.endImageUrl ?? endFrame?.imageUrl ?? null

        const response = await fetch('/api/video/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frameId,
            projectId,
            imageUrl: frame.imageUrl,
            startImageUrl,
            endImageUrl,
            endFrameId: options?.endFrameId,
            prompt: requestPrompt,
            modelId: options?.modelId,
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

        await updateCards([
          {
            id: frameId,
            video_url: videoUrl,
            videoUrl,
            video_key: videoKey ?? null,
            videoKey: videoKey ?? null,
            video_prompt: updatedVideoPrompt ?? null,
            videoPrompt: updatedVideoPrompt ?? null,
          } as Partial<Card>,
        ])

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

  const handlePlayVideo = useCallback((frameId: string, frames: StoryboardFrame[]) => {
    const frame = frames.find(f => f.id === frameId)
    const url = frame?.videoUrl
    if (!frame || !url) {
      throw new Error('No video available yet for this scene. Generate one first.')
    }

    setVideoPreview({ frameId, url })
  }, [])

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
