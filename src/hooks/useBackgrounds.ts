import { useEffect } from 'react'
import { useBackgroundStore } from '@/store/backgrounds'
import type { BackgroundCandidate } from '@/types/background'

/**
 * Hook to load and initialize backgrounds for a project
 * This should be called from the storyboard page to ensure backgrounds
 * are loaded from the generated storyboard data
 */
export function useBackgrounds(backgrounds?: BackgroundCandidate[]) {
  const { initializeBackgrounds } = useBackgroundStore()

  useEffect(() => {
    if (backgrounds && backgrounds.length > 0) {
      console.log('[useBackgrounds] Initializing backgrounds:', backgrounds.length)
      initializeBackgrounds(backgrounds)
    }
  }, [backgrounds, initializeBackgrounds])
}
