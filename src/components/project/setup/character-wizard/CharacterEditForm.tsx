'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { DEFAULT_MODEL } from '@/lib/fal-ai'
import { ensureCharacterStyle } from './utils'
import type { Character } from './types'

type Props = {
  character: Character
  onSave: (character: Character) => void
  onCancel: () => void
  projectId?: string
  userId?: string
}

export function CharacterEditForm({ character, onSave, onCancel, projectId, userId }: Props) {
  const [editedCharacter, setEditedCharacter] = useState<Character>({
    ...character,
    editPrompt: '', // Clear the edit prompt
    originalImageUrl: character.imageUrl, // Use current image as reference
  })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePromptChange = (value: string) => {
    setEditedCharacter(prev => ({
      ...prev,
      editPrompt: value,
    }))
  }

  const handleRegenerateWithPrompt = async () => {
    if (!editedCharacter.editPrompt?.trim()) {
      setError('Please enter a prompt to edit the character')
      return
    }

    setGenerating(true)
    setError(null)
    try {
      const styledPrompt = ensureCharacterStyle(editedCharacter.editPrompt.trim())
      const fullPrompt = `${styledPrompt}, highly detailed`

      const requestBody = {
        prompt: fullPrompt,
        modelId: 'fal-ai/gemini-25-flash-image/edit',
        aspectRatio: '3:4',
        quality: 'balanced',
        image_url: character.imageUrl, // Always use current image as reference
      }

      console.log(
        '[CharacterWizard] Using image-to-image generation with current character image:',
        character.imageUrl?.substring(0, 50) + '...'
      )

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = await res.json()
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || 'Image generation failed')

      let finalImageUrl = data.imageUrl as string
      let imageKey: string | undefined
      let imageSize: number | undefined

      try {
        console.log(
          `[CharacterWizard] Uploading regenerated character image to R2 for: ${character.name}`
        )
        const uploadRes = await fetch('/api/characters/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: character.id,
            imageUrl: data.imageUrl,
            projectId: projectId,
            characterName: character.name,
            editPrompt: editedCharacter.editPrompt,
            userId: userId,
            isUpdate: true,
          }),
        })

        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData?.success) {
          finalImageUrl = uploadData.publicUrl || uploadData.signedUrl || data.imageUrl
          imageKey = uploadData.key
          imageSize = uploadData.size
          console.log(
            `[CharacterWizard] Successfully uploaded regenerated character image to R2: ${imageKey}`
          )
        } else {
          console.warn(
            `[CharacterWizard] Failed to upload regenerated image to R2:`,
            uploadData?.error
          )
        }
      } catch (uploadError) {
        console.warn(`[CharacterWizard] R2 upload failed for regenerated character:`, uploadError)
      }

      setEditedCharacter(prev => ({
        ...prev,
        imageUrl: finalImageUrl,
        editPrompt: styledPrompt,
        ...(imageKey && { imageKey }),
        ...(imageSize && { imageSize }),
      }))

      // Auto-save after successful generation
      onSave({
        ...editedCharacter,
        imageUrl: finalImageUrl,
        editPrompt: styledPrompt,
        ...(imageKey && { imageKey }),
        ...(imageSize && { imageSize }),
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Image generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Current Character
          </label>
          <div className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg bg-neutral-800">
            {editedCharacter.imageUrl ? (
              <Image
                src={editedCharacter.imageUrl}
                alt={`Current character: ${editedCharacter.name}`}
                width={300}
                height={400}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                No Image
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Edit Prompt</label>
            <textarea
              value={editedCharacter.editPrompt || ''}
              onChange={e => handlePromptChange(e.target.value)}
              placeholder="Describe how you want to modify the character (e.g., 'change hair to blonde', 'add sunglasses', 'wearing a red dress')"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              rows={12}
            />
            <div className="mt-1 text-xs text-neutral-500">
              This will edit the current image based on your prompt
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleRegenerateWithPrompt}
              disabled={generating || !editedCharacter.editPrompt?.trim()}
              className="flex-1"
            >
              {generating ? 'Applying Edit...' : 'Apply Edit'}
            </Button>
            <Button onClick={onCancel} variant="outline" className="px-6">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
