'use client'

import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CharacterWizard from '@/components/project/setup/CharacterWizard'
import { FloatingHeader } from '@/components/storyboard/FloatingHeader'
import { useSupabase } from '@/components/providers/SupabaseProvider'

type CharacterWizardProps = ComponentProps<typeof CharacterWizard>
type CharacterWizardCharacter = NonNullable<CharacterWizardProps['initial']>[number]

type ApiCharacter = {
  id: string
  name: string
  edit_prompt?: string | null
  image_url?: string | null
  image_key?: string | null
  image_size?: number | null
  original_image_url?: string | null
  original_image_key?: string | null
  original_image_size?: number | null
}

const mapApiCharacter = (character: ApiCharacter): CharacterWizardCharacter => ({
  id: character.id,
  name: character.name,
  editPrompt: character.edit_prompt ?? undefined,
  imageKey: character.image_key ?? undefined,
  imageSize: typeof character.image_size === 'number' ? character.image_size : undefined,
  imageUrl: character.image_url ?? undefined,
  originalImageKey: character.original_image_key ?? undefined,
  originalImageSize:
    typeof character.original_image_size === 'number' ? character.original_image_size : undefined,
  originalImageUrl: character.original_image_url ?? undefined,
})

export default function ProjectCharactersPage() {
  const params = useParams() as { id?: string; sbId?: string }
  const router = useRouter()
  const { user } = useSupabase()

  const projectId = params?.id
  const storyboardId = params?.sbId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialCharacters, setInitialCharacters] = useState<CharacterWizardCharacter[] | null>(null)

  useEffect(() => {
    if (!projectId || !user?.id) {
      setInitialCharacters([])
      setLoading(false)
      setError(null)
      return
    }

    let isCancelled = false

    const loadCharacters = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/characters?project_id=${encodeURIComponent(projectId)}`,
          {
            credentials: 'include',
          },
        )

        if (isCancelled) {
          return
        }

        if (!response.ok) {
          if (response.status === 401) {
            setInitialCharacters([])
            setError('You need to be signed in to view your models.')
            setLoading(false)
            return
          }
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = (await response.json().catch(() => ({}))) as {
          characters?: ApiCharacter[]
        }
        const characters: unknown = payload?.characters
        const list = Array.isArray(characters) ? (characters as ApiCharacter[]) : []
        const mapped = list.map(mapApiCharacter)
        setInitialCharacters(mapped)
        setLoading(false)
      } catch (err) {
        if (isCancelled) {
          return
        }
        console.error('[ProjectCharactersPage] Unexpected error loading characters:', err)
        setError('Unable to load existing characters. You can still create new ones below.')
        setInitialCharacters([])
        setLoading(false)
      }
    }

    void loadCharacters()

    return () => {
      isCancelled = true
    }
  }, [projectId, user?.id])

  const handleNavigateToStoryboard = useCallback(() => {
    if (!projectId) return
    router.replace(`/project/${projectId}/storyboard/${projectId}`)
  }, [projectId, router])

  const handleNavigateToEditor = useCallback(() => {
    if (!projectId || !storyboardId) return
    router.push(`/project/${projectId}/storyboard/${storyboardId}/?frame=1`)
  }, [projectId, router, storyboardId])

  const handleNavigateToCharacters = useCallback(() => {
    if (!projectId || !storyboardId) return
    router.push(`/project/${projectId}/storyboard/${storyboardId}/characters`)
  }, [projectId, router, storyboardId])

  const handleNavigateToTimeline = useCallback(() => {
    if (!projectId || !storyboardId) return
    router.push(`/project/${projectId}/storyboard/${storyboardId}/timeline`)
  }, [projectId, router, storyboardId])

  return (
    <div className="px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <FloatingHeader
          title="Models"
          index={0}
          total={1}
          currentView="models"
          onNavigateToCharacters={handleNavigateToCharacters}
          onNavigateToStoryboard={handleNavigateToStoryboard}
          onNavigateToEditor={handleNavigateToEditor}
          onNavigateToTimeline={handleNavigateToTimeline}
        />
        {error ? (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {loading || initialCharacters === null ? (
          <div className="flex items-center justify-center py-12 text-sm text-neutral-400">
            Loading characters...
          </div>
        ) : (
          <CharacterWizard initial={initialCharacters} onChange={() => {}} projectId={projectId} userId={user?.id} />
        )}
      </div>
    </div>
  )
}
