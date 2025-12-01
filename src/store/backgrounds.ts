import { create } from 'zustand'
import type { BackgroundCandidate } from '@/types/background'

export interface BackgroundState {
  // Project ID for scoping backgrounds
  projectId: string | null

  // Available background candidates (project-scoped)
  backgrounds: BackgroundCandidate[]

  // Scene-level background assignments (sceneNumber -> backgroundId)
  sceneBackgrounds: Map<number, string>

  // Actions
  setProjectId: (projectId: string | null) => void
  initializeBackgrounds: (backgrounds: BackgroundCandidate[], projectId?: string) => void
  addCustomBackground: (background: BackgroundCandidate) => void
  setSceneBackground: (sceneNumber: number, backgroundId: string | null) => void
  getSceneBackground: (sceneNumber: number) => BackgroundCandidate | undefined
  getBackgroundById: (backgroundId: string) => BackgroundCandidate | undefined
  clearBackgrounds: () => void
}

export const useBackgroundStore = create<BackgroundState>((set, get) => ({
  projectId: null,
  backgrounds: [],
  sceneBackgrounds: new Map(),

  setProjectId: (projectId) => {
    // Clear backgrounds when switching projects
    if (get().projectId !== projectId) {
      set({ projectId, backgrounds: [], sceneBackgrounds: new Map() })
    } else {
      set({ projectId })
    }
  },

  initializeBackgrounds: (backgrounds, projectId) => {
    // Only initialize if project ID matches or is being set
    const currentProjectId = get().projectId
    if (projectId && currentProjectId && projectId !== currentProjectId) {
      console.warn('[BackgroundStore] Attempted to initialize backgrounds for different project')
      return
    }

    set({
      backgrounds,
      ...(projectId && { projectId })
    })
  },

  addCustomBackground: (background) => {
    const state = get()
    if (!state.projectId) {
      console.warn('[BackgroundStore] Cannot add background without project ID')
      return
    }

    set((state) => ({
      backgrounds: [...state.backgrounds, background]
    }))
  },

  setSceneBackground: (sceneNumber, backgroundId) => {
    set((state) => {
      const newMap = new Map(state.sceneBackgrounds)
      if (backgroundId === null) {
        newMap.delete(sceneNumber)
      } else {
        newMap.set(sceneNumber, backgroundId)
      }
      return { sceneBackgrounds: newMap }
    })
  },

  getSceneBackground: (sceneNumber) => {
    const state = get()
    const backgroundId = state.sceneBackgrounds.get(sceneNumber)
    if (!backgroundId) return undefined

    return state.backgrounds.find(bg => bg.id === backgroundId)
  },

  getBackgroundById: (backgroundId) => {
    const state = get()
    return state.backgrounds.find(bg => bg.id === backgroundId)
  },

  clearBackgrounds: () => {
    set({ backgrounds: [], sceneBackgrounds: new Map(), projectId: null })
  },
}))
