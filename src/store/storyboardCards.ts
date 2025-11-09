/*
Basic card stores minimal info about storyboard cards for listing purposes.
Full card stores all info about storyboard cards for detailed view/editing.
'LoadingState' decides its state and 'StoryboardCardsState' manages zustand store for storyboard cards.
*/

import { create } from 'zustand'
import type { Card, StoryboardBasicCard } from '@/types'

type LoadingState = {
  basic: boolean
  full: boolean
}

type StoryboardCardsState = {
  projectId: string | null
  order: string[]
  basicCards: Record<string, StoryboardBasicCard>
  fullCards: Record<string, Card>
  loading: LoadingState
  setProject: (projectId: string | null) => void
  setLoadingState: (scope: keyof LoadingState, value: boolean) => void
  setBasicCards: (projectId: string, cards: StoryboardBasicCard[]) => void
  setFullCards: (projectId: string, cards: Card[]) => void
  mergeFullCards: (projectId: string, cards: Partial<Card>[]) => void
  removeCards: (projectId: string, cardIds: string[]) => void
}

const basicCardToFull = (card: StoryboardBasicCard): Card => ({
  id: card.id,
  project_id: card.project_id,
  user_id: card.user_id,
  type: card.type,
  title: card.title,
  content: '',
  order_index: card.order_index,
  scene_number: card.scene_number,
  image_url: card.image_url ?? undefined,
  storyboard_status: 'ready',
})

const buildCardFromPatch = (patch: Partial<Card>, projectId: string | null): Card | null => {
  if (!patch.id) return null
  const orderIndex =
    typeof patch.order_index === 'number' && Number.isFinite(patch.order_index)
      ? patch.order_index
      : 0
  return {
    id: patch.id,
    project_id: patch.project_id ?? projectId ?? '',
    user_id: patch.user_id ?? '',
    type: patch.type ?? 'scene',
    title: patch.title ?? 'Untitled Scene',
    content: patch.content ?? '',
    order_index: orderIndex,
    scene_number: patch.scene_number,
    image_url: patch.image_url,
    storyboard_status: patch.storyboard_status,
    ...patch,
  }
}

const buildOrder = <T extends { id: string; order_index: number }>(cards: T[]): string[] => {
  return [...cards].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map(card => card.id)
}

export const useStoryboardCardsStore = create<StoryboardCardsState>(set => ({
  projectId: null,
  order: [],
  basicCards: {},
  fullCards: {},
  loading: { basic: false, full: false },

  setProject: projectId =>
    set(state => {
      if (state.projectId === projectId) {
        return state
      }
      return {
        projectId,
        order: [],
        basicCards: {},
        fullCards: {},
        loading: { basic: false, full: false },
      }
    }),

  setLoadingState: (scope, value) =>
    set(state => ({
      ...state,
      loading: { ...state.loading, [scope]: value },
    })),

  setBasicCards: (projectId, cards) =>
    set(state => {
      if (state.projectId !== projectId) {
        return state
      }

      const ordered = buildOrder(cards)
      const map = cards.reduce<Record<string, StoryboardBasicCard>>((acc, card) => {
        acc[card.id] = card
        return acc
      }, {})

      return {
        ...state,
        basicCards: map,
        order: state.order.length ? state.order : ordered,
        loading: { ...state.loading, basic: false },
      }
    }),

  setFullCards: (projectId, cards) =>
    set(state => {
      if (state.projectId !== projectId) {
        return state
      }

      const ordered = buildOrder(cards)
      const map = cards.reduce<Record<string, Card>>((acc, card) => {
        acc[card.id] = card
        return acc
      }, {})

      return {
        ...state,
        fullCards: map,
        order: ordered.length ? ordered : state.order,
        loading: { ...state.loading, full: false },
      }
    }),

  mergeFullCards: (projectId, cards) =>
    set(state => {
      if (state.projectId !== projectId || !cards.length) {
        return state
      }

      const next = { ...state.fullCards }
      for (const patch of cards) {
        if (!patch?.id) continue
        const fallback =
          next[patch.id] ??
          (state.basicCards[patch.id] ? basicCardToFull(state.basicCards[patch.id]) : undefined) ??
          buildCardFromPatch(patch, state.projectId)
        if (!fallback) continue
        next[patch.id] = { ...fallback, ...patch }
      }

      const existingOrder = state.order.slice()
      for (const patch of cards) {
        if (!patch?.id) continue
        if (!existingOrder.includes(patch.id)) {
          existingOrder.push(patch.id)
        }
      }

      return {
        ...state,
        fullCards: next,
        order: existingOrder,
      }
    }),

  removeCards: (projectId, cardIds) =>
    set(state => {
      if (state.projectId !== projectId || !cardIds.length) {
        return state
      }

      const toRemove = new Set(cardIds)
      const nextFull = { ...state.fullCards }
      const nextBasic = { ...state.basicCards }
      for (const id of cardIds) {
        delete nextFull[id]
        delete nextBasic[id]
      }

      return {
        ...state,
        fullCards: nextFull,
        basicCards: nextBasic,
        order: state.order.filter(id => !toRemove.has(id)),
      }
    }),
}))

let lastSelectedState: StoryboardCardsState | null = null
let lastSelectedCards: Card[] = []

export const selectOrderedCards = (state: StoryboardCardsState): Card[] => {
  if (state === lastSelectedState) {
    return lastSelectedCards
  }

  lastSelectedState = state

  if (!state.order.length) {
    lastSelectedCards = []
    return lastSelectedCards
  }

  lastSelectedCards = state.order
    .map(
      id =>
        state.fullCards[id] ?? (state.basicCards[id] ? basicCardToFull(state.basicCards[id]) : null)
    )
    .filter((card): card is Card => Boolean(card))

  return lastSelectedCards
}
