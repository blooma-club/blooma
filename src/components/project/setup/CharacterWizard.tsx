'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getImageGenerationModels } from '@/lib/fal-ai'
import { CharacterCreationPanel } from './character-wizard/CharacterCreationPanel'
import { CharacterList } from './character-wizard/CharacterList'
import { CharacterEditDialog } from './character-wizard/CharacterEditDialog'
import type { Character } from './character-wizard/types'

const ALLOWED_CHARACTER_MODEL_IDS = [
  'fal-ai/flux-pro/v1.1-ultra',
  'fal-ai/bytedance/seedream/v4/text-to-image',
  'fal-ai/flux-pro/kontext',
] as const

type Props = {
  onChange: (characters: Character[]) => void
  initial?: Character[]
  projectId?: string
  userId?: string
}

export default function CharacterWizard({ onChange, initial, projectId, userId }: Props) {
  const [characters, setCharacters] = useState<Character[]>(initial || [])
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<'generate' | 'upload' | null>(null)

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    onChangeRef.current(characters)
  }, [characters])

  const allowedCharacterModels = useMemo(
    () =>
      getImageGenerationModels().filter(model =>
        ALLOWED_CHARACTER_MODEL_IDS.includes(
          model.id as (typeof ALLOWED_CHARACTER_MODEL_IDS)[number]
        )
      ),
    []
  )

  const latestCharacterImageUrl = useMemo(
    () => (characters.length ? characters[characters.length - 1]?.imageUrl ?? null : null),
    [characters]
  )

  const handleCharacterCreated = useCallback((entry: Character) => {
    setCharacters(prev => [...prev, entry])
  }, [])

  const handleEditCharacter = useCallback((character: Character) => {
    setEditingCharacter(character)
    setIsEditModalOpen(true)
  }, [])

  const handleUseAsReference = useCallback(
    (character: Character) => {
      if (editingCharacter) {
        setEditingCharacter(prev =>
          prev
            ? {
                ...prev,
                originalImageUrl: character.imageUrl,
              }
            : null
        )
      } else {
        setEditingCharacter({
          ...character,
          originalImageUrl: character.imageUrl,
        })
        setIsEditModalOpen(true)
      }
    },
    [editingCharacter]
  )

  const handleSaveCharacterEdit = useCallback((updatedCharacter: Character) => {
    setCharacters(prev => prev.map(char => (char.id === updatedCharacter.id ? updatedCharacter : char)))
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingCharacter(null)
  }, [])

  const handleRemove = useCallback((index: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleRequestUpload = useCallback(() => {
    setActiveMode('upload')
  }, [])

  const handleRequestGenerate = useCallback(() => {
    setActiveMode('generate')
  }, [])

  const handleCloseCreation = useCallback(() => {
    setActiveMode(null)
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {activeMode && (
        <CharacterCreationPanel
          mode={activeMode}
          onClose={handleCloseCreation}
          onCharacterCreated={handleCharacterCreated}
          allowedModels={allowedCharacterModels}
          projectId={projectId}
          userId={userId}
          latestCharacterImageUrl={latestCharacterImageUrl}
        />
      )}

      <CharacterList
        characters={characters}
        onEdit={handleEditCharacter}
        onRemove={handleRemove}
        onUseAsReference={handleUseAsReference}
        onRequestUpload={handleRequestUpload}
        onRequestGenerate={handleRequestGenerate}
      />

      <CharacterEditDialog
        open={isEditModalOpen}
        character={editingCharacter}
        onClose={handleCloseEditModal}
        onSave={handleSaveCharacterEdit}
        projectId={projectId}
        userId={userId}
      />
    </div>
  )
}

