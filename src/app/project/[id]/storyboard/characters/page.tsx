'use client'

import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CharacterWizard from '@/components/project/setup/CharacterWizard'
import { FloatingHeader } from '@/components/storyboard/FloatingHeader'
import { useUser } from '@clerk/nextjs'
import ThemeToggle from '@/components/ui/theme-toggle'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { ArrowLeft } from 'lucide-react'

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
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { user } = useUser()

  const projectId = params?.id

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialCharacters, setInitialCharacters] = useState<CharacterWizardCharacter[] | null>(
    null
  )

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
          }
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
    router.replace(`/project/${projectId}/storyboard`)
  }, [projectId, router])

  const handleNavigateToCharacters = useCallback(() => {
    if (!projectId) return
    router.push(`/project/${projectId}/storyboard/characters`)
  }, [projectId, router])

  return (
    <div>
      <div className="w-full px-4">
        {/* Header 라인: Dashboard 버튼 + FloatingHeader */}
        <div className="relative mx-auto mb-6 w-full max-w-[1920px] flex items-center gap-4">
          {/* Dashboard 버튼 */}
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border transition-all flex-shrink-0 h-[48px]"
            style={{
              color: 'hsl(var(--foreground))',
              borderColor: 'hsl(var(--border))',
            }}
            title="돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          {/* FloatingHeader */}
          <div className="flex-1 flex justify-center min-w-0">
            <FloatingHeader
              title="Models"
              index={0}
              total={1}
              currentView="models"
              onNavigateToCharacters={handleNavigateToCharacters}
              onNavigateToStoryboard={handleNavigateToStoryboard}
              layout="inline"
              containerClassName="w-full"
              className="w-full max-w-[1600px]"
            />
          </div>

          {/* ThemeToggle */}
          <div className="flex-shrink-0 flex items-center gap-3 z-50">
            <CreditsIndicator />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
            <CharacterWizard
              initial={initialCharacters}
              onChange={() => {}}
              projectId={projectId}
              userId={user?.id}
            />
          )}
        </div>
      </div>
    </div>
  )
}
