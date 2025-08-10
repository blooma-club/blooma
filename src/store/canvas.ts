import { create } from 'zustand'
import { Card, Storyboard, CardInput } from '@/types'
import { nanoid } from 'nanoid'

interface CanvasState {
  // 스토리보드 데이터
  storyboard: Storyboard | null
  cards: Record<string, Card[]> // storyboardId별 카드 배열
  selectedCard: Card | null
  
  // 편집 상태
  isEditing: boolean
  isDragging: boolean
  
  // Actions
  setStoryboard: (storyboard: Storyboard) => void
  setCards: (storyboardId: string, cards: Card[]) => void
  selectCard: (card: Card | null) => void
  
  // 카드 CRUD 액션
  addCard: (cardInput: CardInput) => Promise<void>
  updateCard: (cardId: string, updates: Partial<CardInput>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  
  // 카드 위치 업데이트
  updateCardPosition: (cardId: string, position: { x: number; y: number }) => Promise<void>
  
  // 카드 순서 변경
  reorderCards: (cardId: string, newIndex: number) => Promise<void>
  
  // 편집 상태 관리
  setIsEditing: (isEditing: boolean) => void
  setIsDragging: (isDragging: boolean) => void
  
  // 유틸리티 메서드
  clearSelection: () => void
  resetCanvas: () => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // 초기 상태
  storyboard: null,
  cards: {},
  selectedCard: null,
  isEditing: false,
  isDragging: false,

  // 기본 설정자
  setStoryboard: (storyboard) => set({ storyboard }),
  setCards: (storyboardId, cardsArr) => {
    set((state) => ({ cards: { ...state.cards, [storyboardId]: cardsArr } }))
  },
  selectCard: (card) => set({ selectedCard: card }),

  // 카드 CRUD 액션
  addCard: async (cardInput) => {
    set(state => {
      const { storyboard, cards } = state
      if (!storyboard) return state
      const storyboardId = storyboard.id
      const currentCards = cards[storyboardId] || []
      const mockId = `mock-card-${nanoid()}`
      const mockCard: Card = {
        id: mockId,
        storyboard_id: storyboardId,
        user_id: storyboard.user_id || 'mock-user',
        title: cardInput.title || 'Untitled Card',
        content: cardInput.content || '',
        type: cardInput.type || 'hook',
        image_url: cardInput.image_url || '',
        background_color: cardInput.background_color || '#ffffff',
        text_color: cardInput.text_color || '#000000',
        font_size: cardInput.font_size || 16,
        font_weight: cardInput.font_weight || 'normal',
        position_x: cardInput.position_x || 100,
        position_y: cardInput.position_y || 100,
        width: cardInput.width || 320,
        height: cardInput.height || 180,
        order_index: currentCards.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return {
        cards: {
          ...cards,
          [storyboardId]: [...currentCards, mockCard]
        }
      }
    })
  },

  updateCard: async (cardId, updates) => {
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

  deleteCard: async (cardId) => {
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

  updateCardPosition: async (cardId, position) => {
    set(state => {
      const { storyboard, cards } = state
      if (!storyboard) return state
      const storyboardId = storyboard.id
      const currentCards = cards[storyboardId] || []
      const updatedCards = currentCards.map((card: Card) =>
        card.id === cardId ? { ...card, position_x: position.x, position_y: position.y } : card
      )
      return { cards: { ...cards, [storyboardId]: updatedCards } }
    })
  },

  reorderCards: async (cardId, newIndex) => {
    set(state => {
      const { storyboard, cards } = state
      if (!storyboard) return state
      const storyboardId = storyboard.id
      const currentCards = cards[storyboardId] || []
      const cardToMove = currentCards.find((card: Card) => card.id === cardId)
      if (!cardToMove) return state
      const otherCards = currentCards.filter((card: Card) => card.id !== cardId)
      const reorderedCards = [
        ...otherCards.slice(0, newIndex),
        cardToMove,
        ...otherCards.slice(newIndex)
      ].map((card, index) => ({ ...card, order_index: index }))
      return { cards: { ...cards, [storyboardId]: reorderedCards } }
    })
  },

  // 편집 상태 관리
  setIsEditing: (isEditing) => set({ isEditing }),
  setIsDragging: (isDragging) => set({ isDragging }),

  // 유틸리티 메서드
  clearSelection: () => set({ selectedCard: null }),
  resetCanvas: () => set({ 
    storyboard: null,
    cards: {},
    selectedCard: null,
    isEditing: false,
    isDragging: false
  })
}))