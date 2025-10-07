'use client'

import React, { useCallback, useState, useEffect } from 'react'
import clsx from 'clsx'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getImageGenerationModels } from '@/lib/fal-ai'

const CHARACTER_IMAGE_STYLE =
  'full-body portrait, white background, neutral pose facing forward, clean even lighting'

const GENERATE_DESCRIPTION_PLACEHOLDER = `Please describe the model's appearance in detail, such as hairstyle, facial features, or expression. (e.g., "a young woman with short straight hair, monolid eyes, full lips, and rosy cheeks.")`

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
    'fal-ai/flux-pro/kontext',
    'fal-ai/flux-pro/v1.1-ultra',
    'fal-ai/bytedance/seedream/v4/text-to-image',
  ] as const

  const allowedCharacterModels = getImageGenerationModels().filter(m =>
    allowedCharacterModelIds.includes(m.id as (typeof allowedCharacterModelIds)[number])
  )

  const [model, setModel] = useState<string>(() => {
    const first = allowedCharacterModels[0]
    return first?.id || 'fal-ai/flux-pro/kontext'
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
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualSaving, setManualSaving] = useState(false)
  const manualFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [manualImageFiles, setManualImageFiles] = useState<File[]>([])
  const [manualImagePreviews, setManualImagePreviews] = useState<string[]>([])
  const [manualActiveImageIndex, setManualActiveImageIndex] = useState(0)
  const generateNameInputRef = React.useRef<HTMLInputElement | null>(null)
  const uploadPanelNameInputRef = React.useRef<HTMLInputElement | null>(null)
  const [activeQuickAction, setActiveQuickAction] = useState<'generate' | 'upload' | null>(null)
  const [displayedQuickAction, setDisplayedQuickAction] = useState<'generate' | 'upload' | null>(
    null
  )
  const handleQuickAction = useCallback((action: 'generate' | 'upload') => {
    setActiveQuickAction(action)
    requestAnimationFrame(() => {
      if (action === 'generate') {
        generateNameInputRef.current?.focus()
      } else {
        uploadPanelNameInputRef.current?.focus()
      }
    })
  }, [])

  const manualImagePreviewsRef = React.useRef<string[]>([])
  useEffect(() => {
    manualImagePreviewsRef.current = manualImagePreviews
  }, [manualImagePreviews])

  useEffect(() => {
    return () => {
      manualImagePreviewsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    if (manualImagePreviews.length === 0) {
      setManualActiveImageIndex(0)
      return
    }
    if (manualActiveImageIndex > manualImagePreviews.length - 1) {
      setManualActiveImageIndex(manualImagePreviews.length - 1)
    }
  }, [manualActiveImageIndex, manualImagePreviews.length])

  useEffect(() => {
    if (activeQuickAction) {
      setDisplayedQuickAction(activeQuickAction)
      return
    }

    if (!displayedQuickAction) return

    const timeout = window.setTimeout(() => setDisplayedQuickAction(null), 500)
    return () => window.clearTimeout(timeout)
  }, [activeQuickAction, displayedQuickAction])

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
    setManualError(null)
    setManualSaving(false)
    manualImagePreviewsRef.current.forEach(url => URL.revokeObjectURL(url))
    setManualImageFiles([])
    setManualImagePreviews([])
    setManualActiveImageIndex(0)
  }, [])

  const handleManualFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      event.target.value = ''
      return
    }

    setManualError(null)

    setManualImageFiles(prev => [...prev, ...files])

    const newPreviews = files.map(file => URL.createObjectURL(file))
    setManualImagePreviews(prev => [...prev, ...newPreviews])

    // reset input so same file can be selected again
    event.target.value = ''
  }, [])

  const handleManualRemoveImage = useCallback(
    (index?: number) => {
      const targetIndex = index ?? manualActiveImageIndex
      const prevLength = manualImageFiles.length

      setManualImageFiles(prev => prev.filter((_, idx) => idx !== targetIndex))
      setManualImagePreviews(prev => {
        return prev.filter((url, idx) => {
          if (idx === targetIndex) {
            URL.revokeObjectURL(url)
            return false
          }
          return true
        })
      })
      setManualActiveImageIndex(prevIndex => {
        if (prevLength <= 1) return 0
        if (targetIndex >= prevLength - 1) {
          return Math.max(0, prevIndex - 1)
        }
        if (prevIndex > targetIndex) {
          return prevIndex - 1
        }
        if (prevIndex === targetIndex) {
          return prevIndex
        }
        return prevIndex
      })
    },
    [manualActiveImageIndex, manualImageFiles.length]
  )

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

    const selectedFile = manualImageFiles[manualActiveImageIndex] ?? manualImageFiles[0]

    if (selectedFile) {
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('characterId', characterId)
        formData.append('projectId', projectId || '')
        formData.append('characterName', trimmedName)
        formData.append('editPrompt', '')
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
          finalImageUrl =
            remoteCharacter.image_url || remoteCharacter.original_image_url || finalImageUrl
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
      ...(imageKey && { imageKey }),
      ...(imageSize && { imageSize }),
      ...(originalImageKey && { originalImageKey }),
      ...(originalImageSize && { originalImageSize }),
    }

    setCharacters(prev => [...prev, entry])
    resetManualForm()
    setActiveQuickAction(null)
  }, [manualActiveImageIndex, manualImageFiles, manualName, projectId, resetManualForm, userId])

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

  const hasManualImages = manualImagePreviews.length > 0
  const boundedManualIndex = hasManualImages
    ? Math.min(manualActiveImageIndex, manualImagePreviews.length - 1)
    : 0
  const activeManualPreview = hasManualImages ? manualImagePreviews[boundedManualIndex] : null
  const isUploadPanel = activeQuickAction === 'upload'
  const quickActionActive = Boolean(activeQuickAction)
  const quickActionForRender = activeQuickAction ?? displayedQuickAction
  const quickActionTargetWidth =
    quickActionForRender === 'upload' ? 940 : quickActionForRender === 'generate' ? 720 : 0

  return (
    <div
      className={clsx(
        'flex flex-col lg:flex-row items-start min-w-[1200px]',
        quickActionActive ? 'gap-6' : 'gap-0'
      )}
    >
      <div
        className="relative w-full lg:w-auto flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxWidth: quickActionActive ? `${quickActionTargetWidth}px` : '0px',
          opacity: quickActionActive ? 1 : 0,
          transform: quickActionActive ? 'translateX(0)' : 'translateX(-32px)',
          pointerEvents: quickActionActive ? 'auto' : 'none',
        }}
      >
        {quickActionForRender && (
          <aside
            className={clsx(
              'space-y-6',
              quickActionForRender === 'upload'
                ? 'w-full lg:max-w-[940px]'
                : 'w-full lg:w-[420px] xl:w-[480px]'
            )}
          >
            {quickActionForRender === 'generate' ? (
              <div className="rounded-[36px] border border-neutral-800 bg-[#111111] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold leading-tight">Generate Model</h3>
                    <p className="mt-2 max-w-[360px] text-sm text-neutral-400">
                      Describe the model you have in mind and we will create a new portrait from your prompt.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {script?.trim() && (
                      <Button
                        onClick={handleAutoDetectCharacters}
                        disabled={detecting || autoGenerating}
                        className="h-9 rounded-full border border-purple-400/40 bg-purple-500/20 px-4 text-xs font-medium text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/30"
                      >
                        {detecting
                        ? 'Detecting...'
                        : autoGenerating
                            ? 'Generating...'
                            : 'Auto-detect from script'}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveQuickAction(null)}
                      className="rounded-full border border-neutral-700/70 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {script?.trim() && (detecting || autoGenerating) && (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-sm text-purple-200">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                    {detecting
                      ? 'Analyzing script to detect characters...'
                      : autoGenerating
                        ? 'Generating character images...'
                        : ''}
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-8 lg:flex-row">
                  <div className="flex w-full max-w-[260px] flex-col gap-6">
                    <label className="sr-only" htmlFor="generate-model-name">
                      Model name
                    </label>
                    <input
                      id="generate-model-name"
                      type="text"
                      value={characterName}
                      onChange={e => setCharacterName(e.target.value)}
                      placeholder="Enter model name"
                      ref={generateNameInputRef}
                      className="rounded-2xl border border-neutral-700/70 bg-neutral-900/70 px-4 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                    />

                    <div className="relative">
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-neutral-700/70 bg-neutral-800/70">
                        {loading ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-neutral-200">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-transparent"></div>
                            Generating preview...
                          </div>
                        ) : characters.length > 0 ? (
                          <Image
                            src={characters[characters.length - 1].imageUrl!}
                            alt={`Generated preview of ${characters[characters.length - 1]?.name || 'latest character'}`}
                            width={400}
                            height={533}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-sm uppercase tracking-wide text-neutral-400">
                            model preview here
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-1">
                    <label className="sr-only" htmlFor="generate-model-description">
                      Character description
                    </label>
                    <textarea
                      id="generate-model-description"
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      placeholder={GENERATE_DESCRIPTION_PLACEHOLDER}
                      className="min-h-[280px] w-full rounded-[32px] border border-neutral-700/70 bg-neutral-800/60 px-6 py-6 pr-[190px] pb-20 text-sm text-neutral-100 placeholder:text-neutral-300 focus:border-neutral-500 focus:outline-none"
                    />

                    <div className="pointer-events-auto absolute bottom-6 right-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-full border border-neutral-600/70 bg-neutral-700/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-neutral-400 hover:bg-neutral-600/70"
                          >
                            <span>
                              {allowedCharacterModels.find(m => m.id === model)?.name ||
                                'Select model'}
                            </span>
                            <svg
                              className="h-4 w-4 text-neutral-300"
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
                          sideOffset={6}
                          className="w-64 rounded-2xl border border-neutral-700 bg-neutral-900/95 p-1 shadow-xl"
                        >
                          <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
                            {allowedCharacterModels.map(m => (
                              <DropdownMenuRadioItem
                                key={m.id}
                                value={m.id}
                                className="cursor-pointer rounded-xl px-4 py-3 text-sm text-white transition-colors hover:bg-neutral-800/80"
                              >
                                {m.name}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-4 text-sm">
                  {error && (
                    <div
                      className={clsx(
                        'text-left',
                        error.startsWith('✅') ? 'text-emerald-300' : 'text-red-400'
                      )}
                    >
                      {error}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerateImage}
                      disabled={loading || detecting || autoGenerating}
                      className="flex items-center gap-2 rounded-2xl border border-neutral-600/70 bg-neutral-500/60 px-6 py-3 text-base font-semibold text-white shadow-inner transition hover:border-neutral-400 hover:bg-neutral-500/80"
                    >
                      <span className="text-lg leading-none">*</span>
                      {loading ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex-1 rounded-[36px] border border-neutral-800 bg-neutral-950/70 p-6 sm:p-8 shadow-inner">
                    <div className="flex h-full flex-col">
                      <div className="max-w-xs">
                        <label className="sr-only" htmlFor="manual-name-input">
                          Character name
                        </label>

                        <button
                          type="button"
                          onClick={() => setActiveQuickAction(null)}
                          className="fixed  right-5 rounded-full border border-neutral-700/70 px-2 py-1 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                        >
                          Close
                        </button>

                        <input
                          id="manual-name-input"
                          ref={uploadPanelNameInputRef}
                          value={manualName}
                          onChange={event => setManualName(event.target.value)}
                          placeholder="Enter model name"
                          className="w-full rounded-2xl border border-neutral-700/80 bg-neutral-900/80 px-4 py-3 text-sm text-white shadow-inner placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-3 text-xs text-neutral-500"></div>
                      </div>

                      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-start">
                        <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-3xl border border-neutral-700/70 bg-neutral-900">
                          {activeManualPreview ? (
                            <img
                              src={activeManualPreview}
                              alt="Manual model preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                              Upload a reference image
                            </div>
                          )}
                          {hasManualImages && (
                            <button
                              type="button"
                              onClick={() => handleManualRemoveImage()}
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm text-white/80 transition hover:bg-black"
                              aria-label="Remove selected image"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {manualImagePreviews.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {manualImagePreviews.map((preview, index) => {
                              const isActive = index === boundedManualIndex
                              return (
                                <button
                                  key={`${preview}-${index}`}
                                  type="button"
                                  onClick={() => setManualActiveImageIndex(index)}
                                  className={`relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-xl border ${isActive ? 'border-white' : 'border-neutral-700/70'} transition-colors`}
                                >
                                  <img
                                    src={preview}
                                    alt={`Manual preview ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                  <span
                                    className={`absolute inset-0 border-2 ${isActive ? 'border-white/70' : 'border-transparent'}`}
                                  ></span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {manualError && (
                        <div className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-xs text-red-200">
                          {manualError}
                        </div>
                      )}

                      <div className="mt-auto flex flex-col items-center gap-4 pt-10 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={() => manualFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-800/80 px-8 py-3 text-sm font-medium text-white/90 shadow-inner transition hover:border-neutral-500 hover:bg-neutral-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="h-4 w-4"
                          >
                            <path d="M4 7a2 2 0 012-2h2l1-2h6l1 2h2a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
                            <path d="M12 11v6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Upload images
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAction('generate')}
                          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-800/80 px-8 py-3 text-sm font-medium text-white/90 shadow-inner transition hover:border-neutral-500 hover:bg-neutral-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="h-4 w-4"
                          >
                            <path
                              d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3m10.3-4.3 2.1-2.1M18 12h3m-5.4 6.4 2.1 2.1M12 18v3m-6.4-5.4-2.1 2.1"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={handleManualCreateCharacter}
                          disabled={manualSaving || !manualName.trim()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/60"
                        >
                          {manualSaving ? 'Saving…' : 'Add model'}
                        </button>
                      </div>

                      <input
                        ref={manualFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleManualFileChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      <div
        className={clsx(
          'relative w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          quickActionActive
            ? 'lg:flex-none lg:max-w-[320px] xl:max-w-[360px] lg:min-w-[260px]'
            : 'lg:flex-1 lg:max-w-full lg:min-w-[800px]'
        )}
      >
        <div className="relative min-h-[520px] rounded-[32px] border border-neutral-800 bg-neutral-900/90 p-8 pt-14 shadow-2xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h4 className="text-xl font-semibold text-white">Model list</h4>
              <p className="mt-1 text-xs text-neutral-500">
                Browse existing characters or add a new one
              </p>
            </div>
            <span className="text-xs text-neutral-500">Total {characters.length}</span>
          </div>

          {isUploadPanel ? (
            <div className="flex h-full min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-neutral-700/60 bg-neutral-900/40 text-sm text-neutral-500">
              Upload new references on the left to add them here.
            </div>
          ) : (
            <>
              <div
                className={clsx(
                  'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  quickActionActive && 'sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1'
                )}
              >
                {characters.map((char, idx) => (
                  <div
                    key={char.id}
                    className="group relative rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-3 shadow-lg transition-colors hover:border-neutral-600 hover:bg-neutral-900/80"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-800/80">
                      {char.imageUrl ? (
                        <Image
                          src={char.imageUrl}
                          alt={`Model portrait of ${char.name}`}
                          width={320}
                          height={480}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-center text-sm font-medium text-white truncate">
                      {char.name}
                    </div>
                    <button
                      onClick={() => handleRemove(idx)}
                      className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="group flex aspect-[3/4] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-700/80 bg-neutral-900/40 p-6 text-neutral-400 transition-colors hover:border-white/50 hover:bg-neutral-900 hover:text-white"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700/80 bg-neutral-950/60 text-4xl font-light text-white/80 shadow-inner transition-colors group-hover:border-white/60 group-hover:bg-neutral-900/80">
                        +
                      </span>
                      <span className="mt-6 text-sm font-medium text-white/80">Add model</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={8}
                    className="w-56 rounded-xl border border-neutral-800 bg-neutral-900/95 text-white shadow-xl backdrop-blur"
                  >
                    <DropdownMenuItem
                      className="px-4 py-2.5 text-sm text-white hover:bg-neutral-800/80 focus:bg-neutral-800/80"
                      onSelect={() => handleQuickAction('upload')}
                    >
                      Upload your own
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="px-4 py-2.5 text-sm text-white hover:bg-neutral-800/80 focus:bg-neutral-800/80"
                      onSelect={() => handleQuickAction('generate')}
                    >
                      Generate a new one
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {characters.length === 0 && (
                <div className="mt-8 text-center text-sm text-neutral-500">
                  No models yet. Use the add card to get started.
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
        modelId: 'fal-ai/flux-pro/kontext',
        aspectRatio: '3:4',
        quality: 'balanced',
      }

      // If there's an original image, include it for image-to-image generation
      const referenceImageUrl =
        editedCharacter.originalImageUrl ||
        character.originalImageUrl ||
        (character as any).original_image_url ||
        character.imageUrl ||
        (character as any).image_url

      if (referenceImageUrl) {
        requestBody.image_url = referenceImageUrl
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
