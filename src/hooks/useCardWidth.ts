'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useStoryboardStore } from '@/store/storyboard'
import { 
  CARD_WIDTH_STORAGE_PREFIX, 
  DEFAULT_CARD_WIDTH, 
  clampCardWidth 
} from '@/lib/constants'

export const useCardWidth = (projectId: string, setFrames?: React.Dispatch<React.SetStateAction<any[]>>) => {
  const [cardWidth, setCardWidth] = useState<number>(DEFAULT_CARD_WIDTH)
  const latestCardWidthRef = useRef<number>(DEFAULT_CARD_WIDTH)
  const persistCardWidthTimeout = useRef<number | null>(null)
  
  const setCards = useStoryboardStore(s => s.setCards)

  const readStoredCardWidth = useCallback((): number | null => {
    if (typeof window === 'undefined' || !projectId) {
      return null
    }

    const raw = window.localStorage.getItem(`${CARD_WIDTH_STORAGE_PREFIX}${projectId}`)
    if (!raw) {
      return null
    }

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      return null
    }

    return clampCardWidth(parsed)
  }, [projectId])

  const persistCardWidthLocally = useCallback(
    (width: number) => {
      if (typeof window === 'undefined' || !projectId) {
        return
      }
      window.localStorage.setItem(
        `${CARD_WIDTH_STORAGE_PREFIX}${projectId}`,
        String(clampCardWidth(width))
      )
    },
    [projectId]
  )

  const schedulePersistCardWidth = useCallback(
    (width: number) => {
      if (typeof window === 'undefined') {
        return
      }

      if (persistCardWidthTimeout.current !== null) {
        window.clearTimeout(persistCardWidthTimeout.current)
      }

      persistCardWidthTimeout.current = window.setTimeout(() => {
        const storeCards = useStoryboardStore.getState().cards[projectId] || []
        if (storeCards.length === 0) {
          persistCardWidthLocally(width)
          return
        }

        fetch('/api/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cards: storeCards.map(card => ({
              id: card.id,
              card_width: clampCardWidth(width),
            })),
          }),
        }).catch(error => {
          console.error('[STORYBOARD] Failed to persist card width:', error)
        })

        persistCardWidthLocally(width)
      }, 400)
    },
    [projectId, persistCardWidthLocally]
  )

  const handleCardWidthChange = useCallback(
    (value: number) => {
      const nextWidth = clampCardWidth(value)
      if (latestCardWidthRef.current === nextWidth) {
        return
      }

      latestCardWidthRef.current = nextWidth
      setCardWidth(nextWidth)
      persistCardWidthLocally(nextWidth)

      // 기존 프레임들의 cardWidth 업데이트
      if (setFrames) {
        setFrames(prev =>
          prev.map(frame =>
            frame.cardWidth === nextWidth ? frame : { ...frame, cardWidth: nextWidth }
          )
        )
      }

      const storeCards = useStoryboardStore.getState().cards[projectId] || []
      if (storeCards.length > 0) {
        const needsUpdate = storeCards.some(card => card.card_width !== nextWidth)
        if (needsUpdate) {
          const updatedCards = storeCards.map(card =>
            card.card_width === nextWidth ? card : { ...card, card_width: nextWidth }
          )
          setCards(projectId, updatedCards)
        }
      }

      schedulePersistCardWidth(nextWidth)
    },
    [persistCardWidthLocally, projectId, schedulePersistCardWidth, setCards, setFrames]
  )

  // Initialize card width from storage
  useEffect(() => {
    const storedWidth = readStoredCardWidth()
    if (storedWidth !== null) {
      const clamped = clampCardWidth(storedWidth)
      latestCardWidthRef.current = clamped
      setCardWidth(clamped)
      persistCardWidthLocally(clamped)
    }
  }, [persistCardWidthLocally, readStoredCardWidth])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && persistCardWidthTimeout.current !== null) {
        window.clearTimeout(persistCardWidthTimeout.current)
      }
    }
  }, [])

  return {
    cardWidth,
    setCardWidth,
    latestCardWidthRef,
    persistCardWidthTimeout,
    handleCardWidthChange,
    readStoredCardWidth,
    persistCardWidthLocally,
    schedulePersistCardWidth,
  }
}
