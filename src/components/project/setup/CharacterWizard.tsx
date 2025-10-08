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
  projectId?: string // Add project ID for R2 organization
  userId?: string // Add user ID for Supabase persistence
}

export default function CharacterWizard({ onChange, initial, projectId, userId }: Props) {
  const [characters, setCharacters] = useState<Character[]>(initial || [])
  const [error, setError] = useState<string | null>(null)

  // characters ?�태가 변경될 ?�마??부모에�??�림 (onChange ref�?고정)
  const onChangeRef = React.useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    onChangeRef.current(characters)
  }, [characters])

  // Character 모델?� 지?�된 3가지�??�용 (working models only)
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
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Unified creation state
  const [activeMode, setActiveMode] = useState<'generate' | 'upload' | null>(null)
  const [creationName, setCreationName] = useState('')
  const [creationError, setCreationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const nameInputRef = React.useRef<HTMLInputElement | null>(null)

  // Cleanup upload previews on unmount
  const previewsRef = React.useRef<string[]>([])
  useEffect(() => {
    previewsRef.current = uploadPreviews
  }, [uploadPreviews])

  useEffect(() => {
    return () => {
      previewsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    if (uploadPreviews.length === 0) {
      setActivePreviewIndex(0)
      return
    }
    if (activePreviewIndex > uploadPreviews.length - 1) {
      setActivePreviewIndex(uploadPreviews.length - 1)
    }
  }, [activePreviewIndex, uploadPreviews.length])

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

  // Reset creation form
  const resetForm = useCallback(() => {
    setCreationName('')
    setImagePrompt('')
    setCreationError(null)
    setIsSaving(false)
    previewsRef.current.forEach(url => URL.revokeObjectURL(url))
    setUploadFiles([])
    setUploadPreviews([])
    setActivePreviewIndex(0)
    setActiveMode(null)
  }, [])

  // Handle file upload
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      event.target.value = ''
      return
    }

    setCreationError(null)
    setUploadFiles(prev => [...prev, ...files])

    const newPreviews = files.map(file => URL.createObjectURL(file))
    setUploadPreviews(prev => [...prev, ...newPreviews])

    event.target.value = ''
  }, [])

  // Remove uploaded image
  const handleRemoveImage = useCallback(
    (index?: number) => {
      const targetIndex = index ?? activePreviewIndex
      const prevLength = uploadFiles.length

      setUploadFiles(prev => prev.filter((_, idx) => idx !== targetIndex))
      setUploadPreviews(prev => {
        return prev.filter((url, idx) => {
          if (idx === targetIndex) {
            URL.revokeObjectURL(url)
            return false
          }
          return true
        })
      })
      setActivePreviewIndex(prevIndex => {
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
    [activePreviewIndex, uploadFiles.length]
  )

  // Unified character creation handler
  const handleCreateCharacter = useCallback(async () => {
    if (!creationName.trim()) {
      setCreationError('Model name is required')
      return
    }

    if (activeMode === 'generate' && !imagePrompt.trim()) {
      setCreationError('Please describe the model')
      return
    }

    if (activeMode === 'upload' && uploadFiles.length === 0) {
      setCreationError('Please upload at least one image')
      return
    }

    setCreationError(null)
    setIsSaving(true)

    try {
      const characterId = crypto.randomUUID()
      let finalImageUrl: string | undefined
      let imageKey: string | undefined
      let imageSize: number | undefined

      if (activeMode === 'generate') {
        // Generate mode: AI ?��?지 ?�성
        const basePrompt = imagePrompt.trim() || 'portrait of an original cinematic character'
        const prompt = ensureCharacterStyle(basePrompt)

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

        // Upload generated image to R2
        try {
          const uploadRes = await fetch('/api/characters/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterId,
              imageUrl: data.imageUrl,
              projectId,
              characterName: creationName.trim(),
              editPrompt: prompt,
              userId,
              isUpdate: false,
            }),
          })

          const uploadData = await uploadRes.json()
          if (uploadRes.ok && uploadData?.success) {
            finalImageUrl = uploadData.publicUrl || uploadData.signedUrl || data.imageUrl
            imageKey = uploadData.key
            imageSize = uploadData.size
          } else {
            finalImageUrl = data.imageUrl
          }
        } catch {
          finalImageUrl = data.imageUrl
        }
      } else {
        // Upload mode: ?�용???��?지 ?�로??
        const selectedFile = uploadFiles[activePreviewIndex] ?? uploadFiles[0]

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('characterId', characterId)
        formData.append('projectId', projectId || '')
        formData.append('characterName', creationName.trim())
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

        finalImageUrl = uploadData.publicUrl || uploadData.signedUrl
        imageKey = uploadData.key
        imageSize = uploadData.size
      }

      // Add character to list
      const entry: Character = {
        id: characterId,
        name: creationName.trim(),
        imageUrl: finalImageUrl,
        ...(imageKey && { imageKey }),
        ...(imageSize && { imageSize }),
      }
      setCharacters(prev => [...prev, entry])

      // Reset form
      resetForm()
    } catch (e: unknown) {
      setCreationError(e instanceof Error ? e.message : 'Failed to create model')
    } finally {
      setIsSaving(false)
    }
  }, [activeMode, creationName, imagePrompt, model, uploadFiles, activePreviewIndex, projectId, userId, resetForm])

  const handleRemove = (idx: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx))
  }

  const hasUploadPreviews = uploadPreviews.length > 0
  const boundedPreviewIndex = hasUploadPreviews
    ? Math.min(activePreviewIndex, uploadPreviews.length - 1)
    : 0
  const activePreview = hasUploadPreviews ? uploadPreviews[boundedPreviewIndex] : null

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      {/* Creation Panel */}
      {activeMode && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {activeMode === 'generate' ? 'Generate Model' : 'Upload Model'}
            </h3>
            <button
              onClick={resetForm}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row" data-testid="character-creation-layout">
            {/* Left: Preview */}
            <div
              className="flex w-full flex-col gap-4 rounded-xl border border-neutral-800/60 bg-neutral-900/70 p-4"
              data-testid="character-creation-left"
            >
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Model name
                </label>
                <input
                  type="text"
                  value={creationName}
                  onChange={e => setCreationName(e.target.value)}
                  placeholder="Model name"
                  ref={nameInputRef}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <span>Preview</span>
                  {activeMode === 'upload' && hasUploadPreviews ? (
                    <span className="text-[10px] text-neutral-400">
                      {boundedPreviewIndex + 1}/{uploadPreviews.length}
                    </span>
                  ) : null}
                </div>
                <div className="relative mx-auto aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800">
                  {activeMode === 'generate' &&
                  (isSaving || (characters.length > 0 && characters[characters.length - 1].imageUrl)) ? (
                    isSaving ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-neutral-300">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent" />
                        Generating...
                      </div>
                    ) : (
                      <Image
                        src={characters[characters.length - 1].imageUrl!}
                        alt="Generated preview"
                        width={280}
                        height={373}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : activeMode === 'upload' && activePreview ? (
                    <>
                      <img
                        src={activePreview}
                        alt="Upload preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage()}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                        aria-label="Remove selected preview"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-neutral-500">
                      No preview yet
                    </div>
                  )}
                </div>
              </div>

              {/* Upload thumbnails */}
              {activeMode === 'upload' && uploadPreviews.length > 1 && (
                <div className="flex items-center justify-center gap-2 overflow-x-auto">
                  {uploadPreviews.map((preview, index) => (
                    <button
                      key={`${preview}-${index}`}
                      onClick={() => setActivePreviewIndex(index)}
                      className={clsx(
                        'h-12 w-9 flex-shrink-0 overflow-hidden rounded border transition focus:outline-none focus:ring-2 focus:ring-white/40',
                        index === boundedPreviewIndex ? 'border-white' : 'border-neutral-700'
                      )}
                      aria-label={`Select upload preview ${index + 1}`}
                    >
                      <img src={preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Input Area */}
            <div
              className="flex w-full flex-1 flex-col gap-4 rounded-xl border border-neutral-800/60 bg-neutral-900/70 p-4"
              data-testid="character-creation-right"
            >
              {activeMode === 'generate' ? (
                <div className="flex flex-1 flex-col gap-4">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                    Description
                  </label>
                  <div className="relative flex-1">
                    <textarea
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      placeholder={GENERATE_DESCRIPTION_PLACEHOLDER}
                      className="h-full min-h-[260px] w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 pr-28 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                    />

                    <div className="absolute bottom-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-600"
                            aria-label="Select AI model"
                          >
                            <span>
                              {allowedCharacterModels.find(m => m.id === model)?.name || 'Model'}
                            </span>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
                        <DropdownMenuContent className="w-56 rounded-lg border border-neutral-700 bg-neutral-800 p-1">
                          <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
                            {allowedCharacterModels.map(m => (
                              <DropdownMenuRadioItem
                                key={m.id}
                                value={m.id}
                                className="cursor-pointer rounded px-3 py-2 text-sm text-white hover:bg-neutral-700"
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
              ) : (
                <div className="flex flex-1 flex-col gap-4">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                    Upload images
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 min-h-[260px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-800/50 transition hover:border-neutral-600"
                    tabIndex={0}
                    aria-label="Upload character images"
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                  >
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-600 bg-neutral-700 text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-white">Click or press enter to upload</p>
                      <p className="mt-1 text-xs text-neutral-400">PNG, JPG (max 10MB)</p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {creationError && (
                <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                  {creationError}
                </div>
              )}

              <div className="flex justify-end border-t border-neutral-800 pt-4">
                <Button
                  onClick={handleCreateCharacter}
                  disabled={isSaving || !creationName.trim()}
                  className="rounded-lg bg-white px-8 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : activeMode === 'generate' ? 'Generate' : 'Add Model'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model List */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Models</h4>
            <p className="mt-1 text-xs text-neutral-500">{characters.length} model{characters.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {characters.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-700 bg-neutral-800/30 text-sm text-neutral-500">
            <p>No models yet</p>
            <div className="flex gap-3">
              <Button
                onClick={() => setActiveMode('upload')}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700"
              >
                Upload Model
              </Button>
              <Button
                onClick={() => setActiveMode('generate')}
                className="rounded-lg bg-white px-4 py-2 text-sm text-black hover:bg-neutral-200"
              >
                Generate Model
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {characters.map((char, idx) => (
              <div
                key={char.id}
                className="group relative rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow transition hover:border-neutral-700"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-neutral-800">
                  {char.imageUrl ? (
                    <Image
                      src={char.imageUrl}
                      alt={char.name}
                      width={240}
                      height={320}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                      No image
                    </div>
                  )}
                </div>
                <div className="mt-2 truncate text-center text-sm font-medium text-white">
                  {char.name}
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex aspect-[3/4] w-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-neutral-800/30 text-neutral-400 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-2xl text-white shadow transition group-hover:border-neutral-600">
                    +
                  </span>
                  <span className="mt-4 text-sm font-medium">Add Model</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 rounded-lg border border-neutral-800 bg-neutral-900 text-white">
                <DropdownMenuItem
                  className="cursor-pointer px-4 py-2.5 text-sm hover:bg-neutral-800"
                  onSelect={() => setActiveMode('upload')}
                >
                  Upload your own
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer px-4 py-2.5 text-sm hover:bg-neutral-800"
                  onSelect={() => setActiveMode('generate')}
                >
                  Generate a new one
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
            ?�� Tip: Click "Use as Ref" on any character in the list below, or upload from desktop
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
            ? '??Image-to-image: This prompt will be applied to your reference image to create variations'
            : '?�� Text-to-image: This prompt will be used to generate a new character image'}
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
