'use client'

import { useEffect, useState, type ComponentProps } from 'react'
import CharacterWizard from '@/components/project/setup/CharacterWizard'
import { useUser } from '@clerk/nextjs'

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
  edit_prompt: character.edit_prompt ?? undefined,
  image_key: character.image_key ?? undefined,
  image_size: typeof character.image_size === 'number' ? character.image_size : undefined,
  image_url: character.image_url ?? undefined,
})

export default function modelspage() {
  const { user } = useUser()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialCharacters, setInitialCharacters] = useState<CharacterWizardCharacter[] | null>(
    null
  )

  useEffect(() => {
    if (!user?.id) {
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
        const response = await fetch('/api/characters', {
          credentials: 'include',
        })

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
  }, [user?.id])

  return (
    <div>
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
            <CharacterWizard initial={initialCharacters} onChange={() => {}} userId={user?.id} />
          )}
        </div>
      </div>
    </div>
  )
}
