'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  CARD_WIDTH_STORAGE_PREFIX, 
  DEFAULT_CARD_WIDTH, 
  clampCardWidth 
} from '@/lib/constants'
import { useCards } from '@/lib/api'

export const useCardWidth = (projectId: string, setFrames?: React.Dispatch<React.SetStateAction<any[]>>) => {
  const [cardWidth, setCardWidth] = useState<number>(DEFAULT_CARD_WIDTH)
  const latestCardWidthRef = useRef<number>(DEFAULT_CARD_WIDTH)
  const persistCardWidthTimeout = useRef<number | null>(null)
  
  const { cards, updateCards } = useCards(projectId)

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
        const storeCards = cards || []
        if (storeCards.length === 0) {
          persistCardWidthLocally(width)
          return
        }

        updateCards(storeCards.map((card: any) => ({
          id: card.id,
          card_width: clampCardWidth(width),
        })))
        persistCardWidthLocally(width)
      }, 400)
    },
    [projectId, persistCardWidthLocally, cards, updateCards]
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



      schedulePersistCardWidth(nextWidth)
    },
    [persistCardWidthLocally, projectId, schedulePersistCardWidth, setFrames]
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
