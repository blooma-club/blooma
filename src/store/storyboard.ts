import { create } from 'zustand'
import { Card, Storyboard, CardInput } from '@/types'

interface StoryboardState {
  // 스토리보드 데이터
  storyboard: Storyboard | null
  cards: Record<string, Card[]> // storyboardId별 카드 배열
  selectedCard: Card | null
  
  // Actions
  setStoryboard: (storyboard: Storyboard | null) => void
  setCards: (storyboardId: string, cards: Card[]) => void
  selectCard: (card: Card | null) => void
  
  // 카드 CRUD 액션
  updateCard: (cardId: string, updates: Partial<CardInput>) => void
  deleteCard: (cardId: string) => void
  
  // 유틸리티 메서드
  clearSelection: () => void
  resetStoryboard: () => void
}

export const useStoryboardStore = create<StoryboardState>((set) => ({
  // 초기 상태
  storyboard: null,
  cards: {},
  selectedCard: null,

  // 기본 설정자
  setStoryboard: (storyboard) => set({ storyboard }),
  setCards: (storyboardId, cardsArr) => {
    set((state) => ({ cards: { ...state.cards, [storyboardId]: cardsArr } }))
  },
  selectCard: (card) => set({ selectedCard: card }),

  // 카드 CRUD 액션
  updateCard: (cardId, updates) => {
    set(state => {
      const { storyboard, cards } = state
      if (!storyboard) return state
      const storyboardId = storyboard.id
      const currentCards = cards[storyboardId] || []
      const updatedCards = currentCards.map((card: Card) =>
        card.id === cardId ? { ...card, ...updates } : card
      )
      return { cards: { ...cards, [storyboardId]: updatedCards } }
    })
  },

  deleteCard: (cardId) => {
    set(state => {
      const { storyboard, cards, selectedCard } = state
      if (!storyboard) return state
      const storyboardId = storyboard.id
      const currentCards = cards[storyboardId] || []
      const filteredCards = currentCards.filter((card: Card) => card.id !== cardId)
      return {
        cards: { ...cards, [storyboardId]: filteredCards },
        selectedCard: selectedCard?.id === cardId ? null : selectedCard
      }
    })
  },

  // 유틸리티 메서드
  clearSelection: () => set({ selectedCard: null }),
  resetStoryboard: () => set({ 
    storyboard: null,
    cards: {},
    selectedCard: null,
  }),
}))