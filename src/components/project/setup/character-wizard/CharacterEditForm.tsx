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
  const [editedCharacter, setEditedCharacter] = useState<Character>(character)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handlePromptChange = (value: string) => {
    setEditedCharacter(prev => ({
      ...prev,
      editPrompt: value,
    }))
  }

  const handleSave = () => {
    onSave(editedCharacter)
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const previewUrl = URL.createObjectURL(file)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('characterId', character.id)
      formData.append('projectId', projectId || '')
      formData.append('characterName', character.name)
      formData.append('userId', userId || '')
      formData.append('isUpdate', 'true')

      const response = await fetch('/api/characters/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Upload failed')
      }

      console.log(
        `[CharacterWizard] Successfully uploaded character reference image to R2: ${data.key}`
      )

      setEditedCharacter(prev => ({
        ...prev,
        originalImageUrl: data.publicUrl || data.signedUrl || previewUrl,
        ...(data.key && { originalImageKey: data.key }),
        ...(data.size && { originalImageSize: data.size }),
      }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    e.target.value = ''
  }

  const handleRemoveOriginalImage = () => {
    setEditedCharacter(prev => ({
      ...prev,
      originalImageUrl: undefined,
    }))
  }

  const handleRegenerateWithPrompt = async () => {
    setGenerating(true)
    setError(null)
    try {
      const styledPrompt = ensureCharacterStyle(
        editedCharacter.editPrompt?.trim() || `portrait of ${editedCharacter.name}`
      )
      const fullPrompt = `${styledPrompt}, highly detailed`

      const requestBody: {
        prompt: string
        modelId: string
        aspectRatio: string
        quality: string
        image_url?: string
      } = {
        prompt: fullPrompt,
        modelId: DEFAULT_MODEL,
        aspectRatio: '3:4',
        quality: 'balanced',
      }

      const referenceImageUrl =
        editedCharacter.originalImageUrl ||
        character.originalImageUrl ||
        character.original_image_url ||
        character.imageUrl ||
        character.image_url

      if (referenceImageUrl) {
        requestBody.image_url = referenceImageUrl
        requestBody.modelId = 'fal-ai/flux-pro/kontext'
        console.log(
          '[CharacterWizard] Using image-to-image generation with reference:',
          referenceImageUrl.substring(0, 50) + '...'
        )
      } else {
        console.log('[CharacterWizard] Using image generation without reference image')
      }

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Image generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Current Character</label>
          <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-800">
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

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Original Reference Image
          </label>
          <div className="mb-2 text-xs text-blue-400">
            Tip: Click &quot;Use as Ref&quot; on any character in the list below, or upload from desktop.
          </div>
          {editedCharacter.originalImageUrl ? (
            <div className="relative">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-800">
                <Image
                  src={editedCharacter.originalImageUrl}
                  alt={`Original reference for ${editedCharacter.name}`}
                  width={300}
                  height={400}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                onClick={handleRemoveOriginalImage}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm text-white transition-colors hover:bg-red-700"
              >
                ×
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[3/4] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-600 bg-neutral-800 transition-colors hover:border-neutral-500"
            >
              <div className="text-center">
                {uploading ? (
                  <>
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    <div className="text-sm text-blue-400">Uploading...</div>
                  </>
                ) : (
                  <>
                    <svg
                      className="mx-auto mb-2 h-12 w-12 text-neutral-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div className="text-sm text-neutral-400">Upload original image</div>
                    <div className="mt-1 text-xs text-neutral-500">PNG, JPG up to 10MB</div>
                  </>
                )}
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">Edit Prompt</label>
        <textarea
          value={editedCharacter.editPrompt || ''}
          onChange={e => handlePromptChange(e.target.value)}
          placeholder="Describe how you want to modify the character (e.g., 'change hair to blonde', 'add sunglasses', 'wearing a red dress')"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
        <div className="mt-1 text-xs text-neutral-500">
          {editedCharacter.originalImageUrl
            ? '??Image-to-image: This prompt will be applied to your reference image to create variations'
            : '?�� Text-to-image: This prompt will be used to generate a new character image'}
        </div>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="flex gap-3 pt-4">
        <Button onClick={handleRegenerateWithPrompt} disabled={generating} className="flex-1">
          {generating
            ? editedCharacter.originalImageUrl
              ? 'Applying Edit...'
              : 'Generating...'
            : editedCharacter.originalImageUrl
              ? '??Apply Edit to Reference'
              : '?�� Generate New Image'}
        </Button>
        <Button onClick={handleSave} variant="outline" className="flex-1">
          Save Changes
        </Button>
        <Button onClick={onCancel} variant="outline" className="px-6">
          Cancel
        </Button>
      </div>
    </div>
  )
}

