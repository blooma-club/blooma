import { create } from 'zustand';
import { useEffect, useState } from 'react';

interface UIState {
  isNewProjectModalOpen: boolean;
  openNewProjectModal: () => void;
  closeNewProjectModal: () => void;
  
  // Storyboard view management
  storyboardViewMode: 'grid' | 'list';
  setStoryboardViewMode: (mode: 'grid' | 'list') => void;
  toggleStoryboardViewMode: () => void;
  
  // Hydration state
  isHydrated: boolean;
  setHydrated: () => void;
}

// 상태 지속성을 위한 localStorage 키
const STORAGE_KEY = 'blooma_storyboard_view_mode'

const getPersistedViewMode = (): 'grid' | 'list' => {
  if (typeof window === 'undefined') return 'grid'
  return (localStorage.getItem(STORAGE_KEY) as 'grid' | 'list') || 'grid'
}

const persistViewMode = (mode: 'grid' | 'list') => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode)
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  isNewProjectModalOpen: false,
  openNewProjectModal: () => set({ isNewProjectModalOpen: true }),
  closeNewProjectModal: () => set({ isNewProjectModalOpen: false }),
  
  // Storyboard view management - 항상 기본값으로 시작
  storyboardViewMode: 'grid',
  setStoryboardViewMode: (mode: 'grid' | 'list') => {
    persistViewMode(mode)
    set({ storyboardViewMode: mode })
  },
  toggleStoryboardViewMode: () => {
    const current = get().storyboardViewMode
    const newMode = current === 'grid' ? 'list' : 'grid'
    persistViewMode(newMode)
    set({ storyboardViewMode: newMode })
  },
  
  // Hydration state
  isHydrated: false,
  setHydrated: () => {
    // hydration 완료 후 localStorage 값 적용
    const persistedMode = getPersistedViewMode()
    set({ isHydrated: true, storyboardViewMode: persistedMode })
  },
}));

// Hydration을 안전하게 처리하는 커스텀 훅
export const useHydratedUIStore = () => {
  const store = useUIStore()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
    store.setHydrated()
  }, [])
  
  return {
    ...store,
    isClient
  }
}
