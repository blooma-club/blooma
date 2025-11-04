'use client'

import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CharacterWizard from '@/components/project/setup/CharacterWizard'
import { FloatingHeader } from '@/components/storyboard/FloatingHeader'
import { useUser } from '@clerk/nextjs'
import ThemeToggle from '@/components/ui/theme-toggle'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import { useProjects } from '@/lib/api'

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
  const { projects } = useProjects()

  const projectId = params?.id

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialCharacters, setInitialCharacters] = useState<CharacterWizardCharacter[] | null>(
    null
  )

  // 프로젝트 제목 가져오기
  const currentProject = projects?.find(p => p.id === projectId)
  const currentProjectTitle = currentProject?.title || 'Untitled Project'

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
      <div className="w-full">
        {/* Header Container */}
        <div className="relative mx-auto mb-6 w-full max-w-[1920px] flex items-center justify-between gap-4">
          {/* 좌측: 프로젝트 제목 헤더 */}
          <div className="flex-shrink-0 z-10">
            <FloatingHeader
              title={currentProjectTitle}
              index={0}
              total={1}
              currentView="models"
              onNavigateToStoryboard={handleNavigateToStoryboard}
              onNavigateToCharacters={handleNavigateToCharacters}
              layout="inline"
              containerClassName=""
              className=""
              projectId={projectId}
            />
          </div>

          {/* 중앙: 뷰 전환 탭 (Storyboard/Models) */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10">
            <div className="h-[48px] flex items-center rounded-lg border border-neutral-200/80 dark:border-neutral-700/50 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-neutral-900/95 p-1">
              <button
                onClick={handleNavigateToStoryboard}
                className="h-[36px] px-5 rounded-md transition-all duration-200 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
              >
                Storyboard
              </button>
              <button
                onClick={handleNavigateToCharacters}
                className="h-[36px] px-5 rounded-md transition-all duration-200 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
              >
                Models
              </button>
            </div>
          </div>
          
          {/* 우측: 통합 설정 헤더 그룹 */}
          <div className="flex-shrink-0 z-10">
            <div className="h-[48px] rounded-lg border border-neutral-200/80 dark:border-neutral-700/50 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-neutral-900/95 flex items-center gap-2 px-2">
              {/* Credits Indicator */}
              <CreditsIndicator />

              {/* 구분선 */}
              <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

              {/* Theme Toggle */}
              <div className="flex items-center">
                <ThemeToggle />
              </div>
            </div>
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
