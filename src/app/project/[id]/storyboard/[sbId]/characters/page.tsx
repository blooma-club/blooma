'use client'

import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CharacterWizard from '@/components/project/setup/CharacterWizard'
import { FloatingHeader } from '@/components/storyboard/FloatingHeader'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { supabase, type SupabaseCharacter } from '@/lib/supabase'

type CharacterWizardProps = ComponentProps<typeof CharacterWizard>
type CharacterWizardCharacter = NonNullable<CharacterWizardProps['initial']>[number]

const mapSupabaseCharacter = (character: SupabaseCharacter): CharacterWizardCharacter => ({
  id: character.id,
  name: character.name,
  imageUrl: character.image_url ?? undefined,
  originalImageUrl: character.original_image_url ?? undefined,
  editPrompt: character.edit_prompt ?? undefined,
  imageKey: character.image_key ?? undefined,
  imageSize: character.image_size ?? undefined,
  originalImageKey: character.original_image_key ?? undefined,
  originalImageSize: character.original_image_size ?? undefined,
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
        const { data, error: queryError } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (isCancelled) {
          return
        }

        if (queryError) {
          console.error('[ProjectCharactersPage] Failed to load characters:', queryError)
          setError('Unable to load existing characters. You can still create new ones below.')
          setInitialCharacters([])
          setLoading(false)
          return
        }

        const mapped = (data ?? []).map(mapSupabaseCharacter)
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
