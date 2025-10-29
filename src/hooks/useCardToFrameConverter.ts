'use client'

import { useCallback, useMemo } from 'react'
import { cardToFrame } from '@/lib/utils'
import { clampCardWidth } from '@/lib/constants'
import type { Card } from '@/types'
import type { StoryboardFrame } from '@/types/storyboard'

/**
 * Card 배열을 StoryboardFrame 배열로 변환하는 통합 훅
 * 모든 변환 로직을 한 곳에서 관리하여 중복을 제거합니다.
 */
export const useCardToFrameConverter = () => {
  /**
   * 단일 카드를 프레임으로 변환
   */
  const convertCardToFrame = useCallback((card: Card, index?: number): StoryboardFrame => {
    return cardToFrame(card, index)
  }, [])

  /**
   * 카드 배열을 프레임 배열로 변환 (기본 변환)
   */
  const convertCardsToFrames = useCallback((cards: Card[]): StoryboardFrame[] => {
    return cards.map((card, index) => cardToFrame(card, index))
  }, [])

  /**
   * 카드 배열을 프레임 배열로 변환 (카드 폭 정규화 포함)
   */
  const convertCardsToFramesWithWidth = useCallback((
    cards: Card[], 
    defaultCardWidth: number
  ): StoryboardFrame[] => {
    const normalizedWidth = clampCardWidth(defaultCardWidth)
    
    return cards.map((card, index) => {
      const frame = cardToFrame(card, index)
      
      // 카드 폭 정규화
      if (typeof frame.cardWidth === 'number' && Number.isFinite(frame.cardWidth)) {
        frame.cardWidth = clampCardWidth(frame.cardWidth)
        return frame
      }
      
      return { ...frame, cardWidth: normalizedWidth }
    })
  }, [])

  /**
   * 정렬된 카드 배열을 프레임 배열로 변환
   */
  const convertSortedCardsToFrames = useCallback((
    cards: Card[], 
    defaultCardWidth: number
  ): StoryboardFrame[] => {
    // order_index 기준으로 정렬
    const orderedCards = [...cards].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    return convertCardsToFramesWithWidth(orderedCards, defaultCardWidth)
  }, [convertCardsToFramesWithWidth])

  /**
   * 메모화된 변환 함수들
   */
  const converter = useMemo(() => ({
    single: convertCardToFrame,
    multiple: convertCardsToFrames,
    withWidth: convertCardsToFramesWithWidth,
    sorted: convertSortedCardsToFrames,
  }), [
    convertCardToFrame,
    convertCardsToFrames,
    convertCardsToFramesWithWidth,
    convertSortedCardsToFrames,
  ])

  return converter
}

