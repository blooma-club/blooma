'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Character } from '@/types'

type UseProjectCharactersOptions = {
  enabled?: boolean
  projectScoped?: boolean
}

type UseProjectCharactersResult = {
  characters: Character[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const EMPTY_CHARACTERS: Character[] = []

/**
 * Dedicated hook for fetching project characters with safe abort handling.
 *
 * - Returns an empty list immediately when prerequisites are missing.
 * - Cancels in-flight requests on component unmount via AbortController.
 */
export const useProjectCharacters = (
  projectId: string | null | undefined,
  userId: string | null | undefined,
  { enabled = true, projectScoped = true }: UseProjectCharactersOptions = {}
): UseProjectCharactersResult => {
  const [characters, setCharacters] = useState<Character[]>(EMPTY_CHARACTERS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCharacters = useCallback(
    async (abortSignal?: AbortSignal) => {
      const requireProjectId = projectScoped !== false
      if (!enabled || !userId || (requireProjectId && !projectId)) {
        setCharacters(EMPTY_CHARACTERS)
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const endpoint =
          projectScoped !== false && projectId
            ? `/api/characters?project_id=${encodeURIComponent(projectId)}`
            : '/api/characters'
        const response = await fetch(endpoint, {
          credentials: 'include',
          signal: abortSignal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load characters: ${response.status}`)
        }

        const payload = await response.json().catch(() => ({}))
        const list = Array.isArray(payload?.characters) ? payload.characters : EMPTY_CHARACTERS

        if (abortSignal?.aborted) {
          return
        }

        setCharacters(list)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError' || abortSignal?.aborted) {
          return
        }
        console.warn('[useProjectCharacters] Failed to load project characters:', err)
        setCharacters(EMPTY_CHARACTERS)
        setError(err instanceof Error ? err.message : 'Failed to load characters')
      } finally {
        if (!abortSignal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [enabled, projectId, projectScoped, userId]
  )

  useEffect(() => {
    const controller = new AbortController()

    loadCharacters(controller.signal)

    return () => {
      controller.abort()
    }
  }, [loadCharacters])

  return {
    characters,
    isLoading,
    error,
    refetch: () => loadCharacters(),
  }
}
