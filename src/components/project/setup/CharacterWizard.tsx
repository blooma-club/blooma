'use client'

import React, { useCallback, useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getImageGenerationModels } from '@/lib/fal-ai'

const CHARACTER_IMAGE_STYLE =
  'full-body portrait, white background, neutral pose facing forward, clean even lighting'

const ensureCharacterStyle = (prompt: string) => {
  const trimmed = (prompt || '').trim()
  if (!trimmed) return CHARACTER_IMAGE_STYLE
  const styleParts = CHARACTER_IMAGE_STYLE.toLowerCase().split(',')
  const lower = trimmed.toLowerCase()
  if (styleParts.every(part => lower.includes(part.trim()))) {
    return trimmed
  }
  const sanitized = trimmed.replace(/[.,;]+$/, '')
  return `${sanitized}, ${CHARACTER_IMAGE_STYLE}`
}

type Character = {
  id: string
  name: string
  imageUrl?: string
  originalImageUrl?: string // User-uploaded original character image
  editPrompt?: string // Prompt for how to modify the character
  // R2 metadata for image management
  imageKey?: string // R2 key for the main character image
  imageSize?: number // Size of the main character image
  originalImageKey?: string // R2 key for the original reference image
  originalImageSize?: number // Size of the original reference image
}

type Props = {
  onChange: (characters: Character[]) => void
  initial?: Character[]
  script?: string // Add script prop for auto-detection
  projectId?: string // Add project ID for R2 organization
  userId?: string // Add user ID for Supabase persistence
}

export default function CharacterWizard({ onChange, initial, script, projectId, userId }: Props) {
  const [characters, setCharacters] = useState<Character[]>(initial || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // characters 상태가 변경될 때마다 부모에게 알림 (onChange ref로 고정)
  const onChangeRef = React.useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    onChangeRef.current(characters)
  }, [characters])

  // Character 모델은 지정된 3가지만 허용 (working models only)
  const allowedCharacterModelIds = [
    'fal-ai/flux-pro/kontext/text-to-image',
    'fal-ai/flux-pro/v1.1-ultra',
    'fal-ai/bytedance/seedream/v4/text-to-image',
  ] as const

  const allowedCharacterModels = getImageGenerationModels().filter(m =>
    allowedCharacterModelIds.includes(m.id as (typeof allowedCharacterModelIds)[number])
  )

  const [model, setModel] = useState<string>(() => {
    const first = allowedCharacterModels[0]
    return first?.id || 'fal-ai/flux-pro/kontext/text-to-image'
  })

  const [imagePrompt, setImagePrompt] = useState<string>('')
  const [characterName, setCharacterName] = useState<string>('')
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Auto-detection state
  const [detecting, setDetecting] = useState(false)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoDetectionAttempted, setAutoDetectionAttempted] = useState(false)

  // Manual creation state
  const [manualName, setManualName] = useState('')
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualSaving, setManualSaving] = useState(false)
  const manualFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [manualImageFile, setManualImageFile] = useState<File | null>(null)
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (manualImagePreview) URL.revokeObjectURL(manualImagePreview)
    }
  }, [manualImagePreview])

  // Handle character editing
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character)
    setIsEditModalOpen(true)
  }

  const handleUseAsReference = (character: Character) => {
    // If we're already editing a character, update its reference
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
      // Otherwise, open edit modal with this character as reference
      setEditingCharacter({
        ...character,
        originalImageUrl: character.imageUrl,
      })
      setIsEditModalOpen(true)
    }
  }

  const handleSaveCharacterEdit = (updatedCharacter: Character) => {
    setCharacters(prev =>
      prev.map(char => (char.id === updatedCharacter.id ? updatedCharacter : char))
    )
    setIsEditModalOpen(false)
    setEditingCharacter(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingCharacter(null)
  }

  const resetManualForm = useCallback(() => {
    setManualName('')
    setManualPrompt('')
    setManualError(null)
    setManualSaving(false)
    setManualImageFile(null)
    setManualImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handleManualFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setManualImageFile(file)
    setManualError(null)
    setManualImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      if (!file) return null
      return URL.createObjectURL(file)
    })
    // reset input so same file can be selected again
    event.target.value = ''
  }, [])

  const handleManualRemoveImage = useCallback(() => {
    setManualImageFile(null)
    setManualImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  // 단일 이미지 생성 후 리스트에 추가
  const handleGenerateImage = useCallback(async () => {
    if (!characterName.trim()) {
      setError('Please enter a character name')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const basePrompt = imagePrompt?.trim().length
        ? imagePrompt.trim()
        : 'portrait of an original cinematic character'
      const prompt = ensureCharacterStyle(basePrompt)

      // Generate image
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId: model,
          aspectRatio: '3:4',
          quality: 'balanced',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || 'Image generation failed')

      // Generate proper UUID for character ID
      const characterId = crypto.randomUUID()

      // Upload generated image to R2
      let finalImageUrl = data.imageUrl as string
      let imageKey: string | undefined
      let imageSize: number | undefined

      try {
        console.log(
          `[CharacterWizard] Uploading generated image to R2 for character: ${characterName}`
        )
        const uploadRes = await fetch('/api/characters/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId,
            imageUrl: data.imageUrl,
            projectId: projectId, // Use actual project ID for organization
            characterName: characterName.trim(),
            editPrompt: imagePrompt.trim() || undefined,
            userId: userId,
            isUpdate: false,
          }),
        })

        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData?.success) {
          finalImageUrl = uploadData.publicUrl || uploadData.signedUrl || data.imageUrl
          imageKey = uploadData.key
          imageSize = uploadData.size
          console.log(`[CharacterWizard] Successfully uploaded character image to R2: ${imageKey}`)
        } else {
          console.warn(
            `[CharacterWizard] Failed to upload to R2, using original URL:`,
            uploadData?.error
          )
        }
      } catch (uploadError) {
        console.warn(`[CharacterWizard] R2 upload failed, using original URL:`, uploadError)
      }

      const entry: Character = {
        id: characterId,
        name: characterName.trim(),
        imageUrl: finalImageUrl,
        originalImageUrl: undefined,
        editPrompt: prompt,
        // Add R2 metadata if available
        ...(imageKey && { imageKey }),
        ...(imageSize && { imageSize }),
      }
      setCharacters(prev => [...prev, entry])

      // Reset form
      setCharacterName('')
      setImagePrompt('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Image generation failed')
    } finally {
      setLoading(false)
    }
  }, [imagePrompt, model, characterName])

  const handleRemove = (idx: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx))
  }

  /**
   * Auto-detect characters from script using AI and generate character images
   * 1. Uses /api/characters/generate to extract character information from script
   * 2. For each detected character, generates a portrait using /api/generate-image
   * 3. Adds all generated characters to the existing character list
   */
  const handleManualCreateCharacter = useCallback(async () => {
    const trimmedName = manualName.trim()
    const trimmedPrompt = manualPrompt.trim()
    const styledPrompt = trimmedPrompt ? ensureCharacterStyle(trimmedPrompt) : undefined

    if (!trimmedName) {
      setManualError('Character name is required')
      return
    }

    setManualSaving(true)
    setManualError(null)

    const characterId = crypto.randomUUID()
    let finalImageUrl: string | undefined
    let originalImageUrl: string | undefined
    let imageKey: string | undefined
    let imageSize: number | undefined
    let originalImageKey: string | undefined
    let originalImageSize: number | undefined

    if (manualImageFile) {
      try {
        const formData = new FormData()
        formData.append('file', manualImageFile)
        formData.append('characterId', characterId)
        formData.append('projectId', projectId || '')
        formData.append('characterName', trimmedName)
        formData.append('editPrompt', styledPrompt || '')
        formData.append('userId', userId || '')
        formData.append('isUpdate', 'false')

        const uploadRes = await fetch('/api/characters/upload-image', {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json()

        if (!uploadRes.ok || !uploadData?.success) {
          throw new Error(uploadData?.error || 'Upload failed')
        }

        finalImageUrl = uploadData.publicUrl || uploadData.signedUrl || undefined
        originalImageUrl = finalImageUrl
        imageKey = uploadData.key
        imageSize = uploadData.size

        const remoteCharacter = uploadData?.character as
          | {
              image_url?: string | null
              original_image_url?: string | null
              image_key?: string | null
              image_size?: number | null
              original_image_key?: string | null
              original_image_size?: number | null
            }
          | undefined

        if (remoteCharacter) {
          finalImageUrl = remoteCharacter.image_url || remoteCharacter.original_image_url || finalImageUrl
          originalImageUrl = remoteCharacter.original_image_url || finalImageUrl
          imageKey = remoteCharacter.image_key ?? imageKey
          imageSize = remoteCharacter.image_size ?? imageSize
          originalImageKey = remoteCharacter.original_image_key ?? imageKey
          originalImageSize = remoteCharacter.original_image_size ?? imageSize
        }
      } catch (err) {
        console.error('[CharacterWizard] Manual upload failed:', err)
        setManualError(err instanceof Error ? err.message : 'Upload failed')
        setManualSaving(false)
        return
      }
    }

    const entry: Character = {
      id: characterId,
      name: trimmedName,
      ...(finalImageUrl && { imageUrl: finalImageUrl }),
      ...(originalImageUrl && { originalImageUrl }),
      ...(styledPrompt && { editPrompt: styledPrompt }),
      ...(imageKey && { imageKey }),
      ...(imageSize && { imageSize }),
      ...(originalImageKey && { originalImageKey }),
      ...(originalImageSize && { originalImageSize }),
    }

    setCharacters(prev => [...prev, entry])
    resetManualForm()
  }, [manualImageFile, manualName, manualPrompt, projectId, resetManualForm, userId])

  const handleAutoDetectCharacters = useCallback(async () => {
    if (!script?.trim()) {
      setError('No script available for character detection')
      return
    }

    setAutoDetectionAttempted(true)

    setDetecting(true)
    setError(null)
    try {
      // Step 1: Detect characters from script
      const detectRes = await fetch('/api/characters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script,
          model: 'auto',
          prompt: 'Extract main characters with detailed visual descriptions for image generation',
        }),
      })
      const detectData = await detectRes.json()
      if (!detectRes.ok || !detectData?.characters) {
        throw new Error(detectData?.error || 'Character detection failed')
      }

      const detectedCharacters = detectData.characters
      console.log('🎭 Detected characters:', detectedCharacters)

      if (detectedCharacters.length === 0) {
        setError('No characters detected in the script')
        return
      }

      setAutoGenerating(true)

      // Step 2: Generate images for each detected character
      const generatedCharacters: Character[] = []
      for (const detectedChar of detectedCharacters) {
        try {
          // Create a comprehensive prompt for character image generation
          const visualPrompt = ensureCharacterStyle(
            `portrait of ${detectedChar.name}, ${detectedChar.description}, ${detectedChar.visualTraits || ''}`.trim()
          )

          console.log(
            `🎨 Generating image for ${detectedChar.name} with prompt: ${visualPrompt.substring(0, 100)}...`
          )

          const imageRes = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: visualPrompt,
              modelId: model,
              aspectRatio: '3:4',
              quality: 'balanced',
            }),
          })
          const imageData = await imageRes.json()

          if (imageRes.ok && imageData?.imageUrl) {
            // Generate proper UUID for character ID (ignore AI-generated slug)
            const characterId = crypto.randomUUID()

            // Upload generated image to R2
            let finalImageUrl = imageData.imageUrl
            let imageKey: string | undefined
            let imageSize: number | undefined

            try {
              console.log(
                `[CharacterWizard] Uploading auto-detected character image to R2 for: ${detectedChar.name}`
              )
              const uploadRes = await fetch('/api/characters/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  characterId,
                  imageUrl: imageData.imageUrl,
                  projectId: projectId,
                  characterName: detectedChar.name,
                  editPrompt: visualPrompt,
                  userId: userId,
                  isUpdate: false,
                }),
              })

              const uploadData = await uploadRes.json()
              if (uploadRes.ok && uploadData?.success) {
                finalImageUrl = uploadData.publicUrl || uploadData.signedUrl || imageData.imageUrl
                imageKey = uploadData.key
                imageSize = uploadData.size
                console.log(
                  `[CharacterWizard] Successfully uploaded auto-detected character image to R2: ${imageKey}`
                )
              } else {
                console.warn(
                  `[CharacterWizard] Failed to upload auto-detected image to R2:`,
                  uploadData?.error
                )
              }
            } catch (uploadError) {
              console.warn(
                `[CharacterWizard] R2 upload failed for auto-detected character:`,
                uploadError
              )
            }

            generatedCharacters.push({
              id: characterId,
              name: detectedChar.name,
              imageUrl: finalImageUrl,
              originalImageUrl: undefined,
              editPrompt: visualPrompt,
              // Add R2 metadata if available
              ...(imageKey && { imageKey }),
              ...(imageSize && { imageSize }),
            })
            console.log(`✅ Generated image for ${detectedChar.name}`)
          } else {
            console.warn(`⚠️ Failed to generate image for ${detectedChar.name}:`, imageData?.error)
            // Still add character without image
            generatedCharacters.push({
              id: crypto.randomUUID(),
              name: detectedChar.name,
              imageUrl: undefined,
              originalImageUrl: undefined,
              editPrompt: visualPrompt,
            })
          }
        } catch (charError) {
          console.error(`❌ Error generating character ${detectedChar.name}:`, charError)
          // Add character without image as fallback
          generatedCharacters.push({
            id: crypto.randomUUID(),
            name: detectedChar.name,
            imageUrl: undefined,
            originalImageUrl: undefined,
            editPrompt: ensureCharacterStyle(
              `portrait of ${detectedChar.name}, ${detectedChar.description}`
            ),
          })
        }
      }

      // Add generated characters to existing ones
      setCharacters(prev => [...prev, ...generatedCharacters])

      // Show success message briefly
      setError(
        `✅ Successfully detected and generated ${generatedCharacters.length} character${generatedCharacters.length === 1 ? '' : 's'}!`
      )
      setTimeout(() => setError(null), 4000)

      console.log(`🎉 Auto-detection complete! Generated ${generatedCharacters.length} characters`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Auto-detection failed')
      console.error('❌ Auto-detection error:', e)
    } finally {
      setDetecting(false)
      setAutoGenerating(false)
    }
  }, [script, model])

  useEffect(() => {
    if (autoDetectionAttempted) return
    if (!script?.trim()) return
    if (characters.length > 0) return

    void handleAutoDetectCharacters()
  }, [autoDetectionAttempted, characters.length, handleAutoDetectCharacters, script])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start min-w-[1200px]">
      {/* Left: Generator panel */}
      <div className="space-y-6">
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Create New Character</h3>
            {script?.trim() && (
              <Button
                onClick={handleAutoDetectCharacters}
                disabled={detecting || autoGenerating}
                className="text-xs px-3 py-1 h-8 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {detecting ? 'Detecting...' : autoGenerating ? 'Generating...' : '🤖 Auto-Detect'}
              </Button>
            )}
          </div>
          {script?.trim() && (detecting || autoGenerating) && (
            <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-purple-300 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                {detecting
                  ? 'Analyzing script to detect characters...'
                  : autoGenerating
                    ? 'Generating character images...'
                    : ''}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {/* Character Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Character Name *
              </label>
              <input
                type="text"
                value={characterName}
                onChange={e => setCharacterName(e.target.value)}
                placeholder="Enter character name"
                className="w-full p-3 border border-neutral-700 rounded-md bg-neutral-900 text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Preview Area */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Generated Preview
              </label>
              {loading ? (
                <div className="aspect-[3/4] w-full rounded-md overflow-hidden bg-neutral-800 border-2 border-blue-500 border-dashed flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm text-blue-400">Generating...</div>
                  </div>
                </div>
              ) : characters.length > 0 ? (
                <div className="aspect-[3/4] w-full rounded-md overflow-hidden bg-neutral-800">
                  <Image
                    src={characters[characters.length - 1].imageUrl!}
                    alt={`Generated preview of ${characters[characters.length - 1]?.name || 'latest character'}`}
                    width={400}
                    height={533}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] w-full rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <div className="text-neutral-500 text-lg">No preview yet</div>
                </div>
              )}
            </div>

            {/* Character Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Character Description
              </label>
              <textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                placeholder="Describe the character (e.g., 'young woman with curly hair, wearing a blue dress')"
                className="w-full p-3 border border-neutral-700 rounded-md bg-neutral-900 text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="text-xs text-neutral-500 mt-1">
                Leave empty for a default character portrait
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Model</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200 inline-flex items-center justify-between group"
                  >
                    <span className="font-medium text-sm">
                      {allowedCharacterModels.find(m => m.id === model)?.name || 'Select Model'}
                    </span>
                    <svg
                      className="w-4 h-4 text-neutral-400 group-hover:text-neutral-300 transition-colors"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 8l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  sideOffset={4}
                  className="w-64 border border-neutral-700 bg-neutral-900 shadow-xl rounded-lg"
                >
                  <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
                    {allowedCharacterModels.map(m => (
                      <DropdownMenuRadioItem
                        key={m.id}
                        value={m.id}
                        className="px-4 py-3 hover:bg-neutral-800 cursor-pointer text-white border-b border-neutral-700 last:border-b-0 transition-colors"
                      >
                        {m.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              onClick={handleGenerateImage}
              disabled={loading || detecting || autoGenerating}
              className="w-full h-12"
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            {error && (
              <div
                className={`text-sm ${error.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-white">Upload Your Own</h3>
            <button
              type="button"
              onClick={resetManualForm}
              className="text-xs text-neutral-400 underline"
            >
              Reset
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            Add a character using your own reference photo. This skips image generation so you can keep existing looks.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Character name *</label>
              <input
                value={manualName}
                onChange={event => setManualName(event.target.value)}
                placeholder="Enter the character's name"
                className="w-full p-3 border border-neutral-700 rounded-md bg-neutral-900 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Prompt notes</label>
              <textarea
                value={manualPrompt}
                onChange={event => setManualPrompt(event.target.value)}
                rows={3}
                placeholder="Optional notes to remember how to regenerate this character"
                className="w-full p-3 border border-neutral-700 rounded-md bg-neutral-900 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-neutral-300">Reference image</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full sm:w-40 aspect-[3/4] rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950">
                  {manualImagePreview ? (
                    <img
                      src={manualImagePreview}
                      alt="Manual character preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-neutral-500">
                      No image selected
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:w-44">
                  <button
                    type="button"
                    onClick={() => manualFileInputRef.current?.click()}
                    className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 transition-colors hover:border-neutral-500 hover:text-white"
                  >
                    {manualImagePreview ? 'Replace image' : 'Upload image'}
                  </button>
                  {manualImagePreview && (
                    <button
                      type="button"
                      onClick={handleManualRemoveImage}
                      className="w-full rounded border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 transition-colors"
                    >
                      Remove image
                    </button>
                  )}
                  <span className="text-[11px] text-neutral-500">PNG or JPG up to 10MB.</span>
                </div>
              </div>
              <input
                ref={manualFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleManualFileChange}
              />
            </div>

            {manualError && (
              <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {manualError}
              </div>
            )}

            <button
              type="button"
              onClick={handleManualCreateCharacter}
              disabled={manualSaving || !manualName.trim()}
              className="w-full h-11 rounded bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {manualSaving ? 'Saving…' : 'Add character'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: List panel */}
      <div className="lg:col-span-2 min-w-[800px]">
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6 min-h-[600px]">
          <h4 className="text-md font-semibold text-white mb-4">
            Character List ({characters.length})
          </h4>
          {characters.length === 0 ? (
            <div className="text-neutral-400 text-sm">
              No characters yet. Generate one on the left.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {characters.map((char, idx) => (
                <div key={char.id} className="relative group min-w-[150px]">
                  <div className="space-y-2">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-neutral-800 min-h-[200px] relative">
                      {char.imageUrl ? (
                        <Image
                          src={char.imageUrl}
                          alt={`Character portrait of ${char.name}`}
                          width={300}
                          height={450}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          No Image
                        </div>
                      )}

                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCharacter(char)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleUseAsReference(char)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors"
                          >
                            Use as Ref
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-white truncate">{char.name}</div>
                      <div className="text-xs text-neutral-400 mt-1">
                        {isEditModalOpen
                          ? 'Click "Use as Ref" to set as reference'
                          : 'Hover for options'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Character Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Edit Character: {editingCharacter?.name}
            </DialogTitle>
          </DialogHeader>
          {editingCharacter && (
            <CharacterEditForm
              character={editingCharacter}
              onSave={handleSaveCharacterEdit}
              onCancel={handleCloseEditModal}
              onUseAsReference={handleUseAsReference}
              projectId={projectId}
              userId={userId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Character Edit Form Component
type CharacterEditFormProps = {
  character: Character
  onSave: (character: Character) => void
  onCancel: () => void
  onUseAsReference: (character: Character) => void
}

function CharacterEditForm({
  character,
  onSave,
  onCancel,
  onUseAsReference,
  projectId,
  userId,
}: CharacterEditFormProps & { projectId?: string; userId?: string }) {
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
      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file)

      // Upload to character-specific R2 endpoint
      const formData = new FormData()
      formData.append('file', file)
      formData.append('characterId', character.id)
      formData.append('projectId', projectId || '') // Use actual project ID
      formData.append('characterName', character.name)
      formData.append('userId', userId || '')
      formData.append('isUpdate', 'true') // This is updating an existing character

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
        // Store R2 metadata for potential cleanup later
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

      // Prepare request body
      const requestBody: {
        prompt: string
        modelId: string
        aspectRatio: string
        quality: string
        image_url?: string
      } = {
        prompt: fullPrompt,
        modelId: 'fal-ai/flux-pro/kontext/text-to-image',
        aspectRatio: '3:4',
        quality: 'balanced',
      }

      // If there's an original image, include it for image-to-image generation
      if (editedCharacter.originalImageUrl) {
        requestBody.image_url = editedCharacter.originalImageUrl
        console.log(
          '[CharacterWizard] Using image-to-image generation with reference:',
          editedCharacter.originalImageUrl.substring(0, 50) + '...'
        )
      } else {
        console.log('[CharacterWizard] Using text-to-image generation (no reference image)')
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = await res.json()
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || 'Image generation failed')

      // Upload regenerated image to R2
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
        // Update R2 metadata if available
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
      {/* Current and Original Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Generated Image */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Current Character
          </label>
          <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-neutral-800">
            {editedCharacter.imageUrl ? (
              <Image
                src={editedCharacter.imageUrl}
                alt={`Current character: ${editedCharacter.name}`}
                width={300}
                height={400}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                No Image
              </div>
            )}
          </div>
        </div>

        {/* Original Reference Image */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Original Reference Image
          </label>
          <div className="text-xs text-blue-400 mb-2">
            💡 Tip: Click "Use as Ref" on any character in the list below, or upload from desktop
          </div>
          {editedCharacter.originalImageUrl ? (
            <div className="relative">
              <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-neutral-800">
                <Image
                  src={editedCharacter.originalImageUrl}
                  alt={`Original reference for ${editedCharacter.name}`}
                  width={300}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={handleRemoveOriginalImage}
                className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm transition-colors"
              >
                ×
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] w-full rounded-lg bg-neutral-800 border-2 border-dashed border-neutral-600 hover:border-neutral-500 flex items-center justify-center cursor-pointer transition-colors"
            >
              <div className="text-center">
                {uploading ? (
                  <>
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm text-blue-400">Uploading...</div>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-12 h-12 text-neutral-500 mx-auto mb-2"
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
                    <div className="text-xs text-neutral-500 mt-1">PNG, JPG up to 10MB</div>
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

      {/* Edit Prompt */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">Edit Prompt</label>
        <textarea
          value={editedCharacter.editPrompt || ''}
          onChange={e => handlePromptChange(e.target.value)}
          placeholder="Describe how you want to modify the character (e.g., 'change hair to blonde', 'add sunglasses', 'wearing a red dress')"
          className="w-full p-3 border border-neutral-700 rounded-md bg-neutral-900 text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
        />
        <div className="text-xs text-neutral-500 mt-1">
          {editedCharacter.originalImageUrl
            ? '✨ Image-to-image: This prompt will be applied to your reference image to create variations'
            : '🎨 Text-to-image: This prompt will be used to generate a new character image'}
        </div>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleRegenerateWithPrompt} disabled={generating} className="flex-1">
          {generating
            ? editedCharacter.originalImageUrl
              ? 'Applying Edit...'
              : 'Generating...'
            : editedCharacter.originalImageUrl
              ? '✨ Apply Edit to Reference'
              : '🎨 Generate New Image'}
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
