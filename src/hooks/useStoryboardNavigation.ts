'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

export const useStoryboardNavigation = (
  projectId: string, 
  index: number, 
  onViewModeChange?: (mode: 'storyboard' | 'models') => void
) => {
  const router = useRouter()

  const handleNavigateToStoryboard = useCallback(() => {
    const newUrl = `/project/${projectId}/storyboard/${projectId}`
    router.replace(newUrl, { scroll: false })
    onViewModeChange?.('storyboard')
  }, [projectId, router, onViewModeChange])

  const handleNavigateToCharacters = useCallback(() => {
    router.push(`/project/${projectId}/storyboard/${projectId}/characters`)
  }, [projectId, router])

  const handleOpenFrame = useCallback(
    (frameIndex: number) => {
      const newUrl = `/project/${projectId}/storyboard/${projectId}?frame=${frameIndex + 1}`
      router.replace(newUrl, { scroll: false })
    },
    [projectId, router]
  )

  return {
    handleNavigateToStoryboard,
    handleNavigateToCharacters,
    handleOpenFrame,
  }
}
