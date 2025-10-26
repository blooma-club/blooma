'use client'

import { useMemo } from 'react'
import { 
  CARD_WIDTH_MIN,
  CARD_WIDTH_MAX,
  CARD_WIDTH_LOCK_THRESHOLD,
  GRID_CONTAINER_MAX_WIDTH,
  GRID_GAP_PX,
  clampCardWidth
} from '@/lib/constants'

export const useCardDimensions = (cardWidth: number, containerWidth: number) => {
  const normalizedCardWidth = useMemo(() => clampCardWidth(cardWidth), [cardWidth])
  
  const containerStep = useMemo(() => normalizedCardWidth + GRID_GAP_PX, [normalizedCardWidth])
  
  const containerMaxWidth = useMemo(
    () =>
      normalizedCardWidth > CARD_WIDTH_LOCK_THRESHOLD
        ? normalizedCardWidth
        : GRID_CONTAINER_MAX_WIDTH,
    [normalizedCardWidth]
  )
  
  const normalizedContainerWidth = useMemo(() => {
    const minWidth = normalizedCardWidth
    const maxWidth = containerMaxWidth
    const step = containerStep
    const clamped = Math.max(minWidth, Math.min(Math.round(containerWidth), maxWidth))
    if (step <= 0) {
      return clamped
    }
    const stepCount = Math.max(0, Math.round((clamped - minWidth) / step))
    const snapped = minWidth + stepCount * step
    if (snapped > maxWidth) {
      const maxSteps = Math.max(0, Math.floor((maxWidth - minWidth) / step))
      return minWidth + maxSteps * step
    }
    return snapped
  }, [containerMaxWidth, containerStep, containerWidth, normalizedCardWidth])
  
  const gridTemplateColumns = useMemo(
    () => `repeat(auto-fit, minmax(${normalizedCardWidth}px, 1fr))`,
    [normalizedCardWidth]
  )

  return {
    normalizedCardWidth,
    containerStep,
    containerMaxWidth,
    normalizedContainerWidth,
    gridTemplateColumns,
  }
}
