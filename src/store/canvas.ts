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
  
  // 저장 메서드
  saveCards: (storyboardId: string) => Promise<boolean>
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
      const mockId = `temp-${nanoid()}` // Use temporary ID that will be replaced when saved
      const mockCard: Card = {
        id: mockId,
        storyboard_id: storyboardId,
        user_id: storyboard.user_id || 'mock-user',
        title: cardInput.title || 'Untitled Card',
        content: cardInput.content || '',
        user_input: cardInput.user_input || '',
        type: cardInput.type || 'hook',
        image_urls: cardInput.image_urls || [],
        selected_image_url: cardInput.selected_image_url || 0,
        position_x: cardInput.position_x || 100,
        position_y: cardInput.position_y || 100,
        width: cardInput.width || 320,
        height: cardInput.height || 180,
        order_index: currentCards.length,
        // Don't include timestamp fields - let the database handle them
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
  }),
  
  // 저장 메서드
  saveCards: async (storyboardId: string) => {
    try {
      const currentCards = get().cards[storyboardId] || []
      
      // Get the original cards from the database to detect deletions
      const originalCardsResponse = await fetch(`/api/cards?storyboard_id=${storyboardId}`)
      let originalCards: any[] = []
      if (originalCardsResponse.ok) {
        const result = await originalCardsResponse.json()
        originalCards = result.data || []
      }
      
      // Find deleted cards (cards that exist in database but not in current cards)
      const deletedCardIds = originalCards
        .filter(originalCard => !currentCards.find(currentCard => currentCard.id === originalCard.id))
        .map(card => card.id)
      

      
      // Delete removed cards from database
      if (deletedCardIds.length > 0) {
        const deleteResponse = await fetch('/api/cards', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cardIds: deletedCardIds }),
        })
        
        if (!deleteResponse.ok) {
          console.error('Failed to delete removed cards:', await deleteResponse.json())
          return false
        } else {
          // Successfully deleted removed cards
        }
      }
      
      if (currentCards.length === 0) return true
      

      
      // Separate new cards (without created_at or with temporary IDs) from existing cards
      const newCards = currentCards.filter(card => !card.created_at || card.id.startsWith('temp-'))
      const existingCards = currentCards.filter(card => card.created_at && !card.id.startsWith('temp-'))
      

      
      // If we can't determine which cards are new vs existing, check if they have database IDs
      // Database IDs are UUIDs, so if they don't look like UUIDs, they're probably new
      const allCardsAsNew = newCards.length === 0 && existingCards.length === 0 && currentCards.length > 0
      

      
      let success = true
      
      // Insert new cards first
      if (newCards.length > 0 || allCardsAsNew) {
        const cardsToInsert = allCardsAsNew ? currentCards : newCards
        const newCardsToInsert = cardsToInsert.map(card => ({
          // Remove the id field for new cards - let the database generate UUIDs
          storyboard_id: storyboardId,
          user_id: card.user_id,
          type: card.type,
          title: card.title,
          content: card.content,
          image_urls: card.image_urls,
          selected_image_url: card.selected_image_url,
          position_x: Math.round(card.position_x),
          position_y: Math.round(card.position_y),
          width: Math.round(card.width),
          height: Math.round(card.height),
          order_index: card.order_index,
          // Don't include timestamp fields - let the database handle them
        }))
        

        
        const insertResponse = await fetch('/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newCardsToInsert),
        })
        
        if (!insertResponse.ok) {
          const errorData = await insertResponse.json()
          console.error('Failed to insert new cards:', errorData)
          console.error('Response status:', insertResponse.status)
          success = false
        } else {
          const insertResult = await insertResponse.json()
          
          // Update local cards with the new database-generated IDs and timestamps
          if (insertResult.data && Array.isArray(insertResult.data)) {
            const now = new Date().toISOString()
            set((state) => {
              const currentCards = state.cards[storyboardId] || []
              const updatedCards = currentCards.map(card => {
                if (!card.created_at || card.id.startsWith('temp-')) {
                  // Find the corresponding inserted card by matching other properties
                  const insertedCard = insertResult.data.find((inserted: { 
                    storyboard_id: string
                    user_id: string
                    title: string
                    content: string
                    type: string
                    image_urls: string[]
                    selected_image_url: number
                    position_x: number
                    position_y: number
                    id: string
                    created_at?: string
                    updated_at?: string
                  }) => 
                    inserted.storyboard_id === card.storyboard_id &&
                    inserted.user_id === card.user_id &&
                    inserted.title === card.title &&
                    inserted.content === card.content &&
                    inserted.type === card.type &&
                    JSON.stringify(inserted.image_urls) === JSON.stringify(card.image_urls) &&
                    inserted.selected_image_url === card.selected_image_url &&
                    inserted.position_x === Math.round(card.position_x) &&
                    inserted.position_y === Math.round(card.position_y)
                  )
                  
                  if (insertedCard) {
                    return {
                      ...card,
                      id: insertedCard.id, // Use the database-generated ID
                      created_at: insertedCard.created_at || now,
                      updated_at: insertedCard.updated_at || now
                    }
                  }
                }
                return card
              })
              
              return {
                cards: {
                  ...state.cards,
                  [storyboardId]: updatedCards
                }
              }
            })
          }
        }
      }
      
      // Update existing cards
      if (existingCards.length > 0 && success && !allCardsAsNew) {
        const existingCardsToUpdate = existingCards.map(card => ({
          id: card.id,
          storyboard_id: storyboardId,
          user_id: card.user_id,
          type: card.type,
          title: card.title,
          content: card.content,
          image_urls: card.image_urls,
          selected_image_url: card.selected_image_url,
          position_x: Math.round(card.position_x),
          position_y: Math.round(card.position_y),
          width: Math.round(card.width),
          height: Math.round(card.height),
          order_index: card.order_index,
          // Don't include timestamp fields - let the database handle them
        }))
        

        
        const updateResponse = await fetch('/api/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cards: existingCardsToUpdate }),
        })
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json()
          console.error('Failed to update existing cards:', errorData)
          console.error('Response status:', updateResponse.status)
          success = false
        } else {
          // Successfully updated existing cards
        }
      }
      
      if (success) {
        // All cards saved successfully for storyboard
      } else {
        console.error('Failed to save some cards for storyboard:', storyboardId)
      }
      
      return success
    } catch (error) {
      console.error('Error saving cards:', error)
      return false
    }
  }
}))