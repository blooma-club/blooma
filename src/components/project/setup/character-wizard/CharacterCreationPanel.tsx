'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FalAIModel } from '@/lib/fal-ai'
import { DEFAULT_MODEL } from '@/lib/fal-ai'
import { CHARACTER_SYSTEM_PROMPT, GENERATE_DESCRIPTION_PLACEHOLDER } from './constants'
import { ensureCharacterStyle } from './utils'
import type { Character } from './types'

type Props = {
  mode: 'generate' | 'upload'
  onClose: () => void
  onCharacterCreated: (character: Character) => void
  allowedModels: FalAIModel[]
  initialModelId?: string
  projectId?: string
  userId?: string
  latestCharacterImageUrl?: string | null
}

export function CharacterCreationPanel({
  mode,
  onClose,
  onCharacterCreated,
  allowedModels,
  initialModelId,
  projectId,
  userId,
  latestCharacterImageUrl,
}: Props) {
  const [creationName, setCreationName] = useState('')
  const [imagePrompt, setImagePrompt] = useState<string>(CHARACTER_SYSTEM_PROMPT)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // 항상 nano-banana-pro/edit 사용
  const model = 'fal-ai/nano-banana-pro/edit'

  // Character attribute states
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [race, setRace] = useState('')
  const [hairStyleAndColor, setHairStyleAndColor] = useState('')
  const [eyeColorAndShape, setEyeColorAndShape] = useState('')
  const [faceFeatures, setFaceFeatures] = useState('')

  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const previewsRef = useRef<string[]>([])

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

  const hasUploadPreviews = uploadPreviews.length > 0
  const boundedPreviewIndex = hasUploadPreviews
    ? Math.min(activePreviewIndex, uploadPreviews.length - 1)
    : 0
  const activePreview = hasUploadPreviews ? uploadPreviews[boundedPreviewIndex] : null

  const resetForm = useCallback(() => {
    setCreationName('')
    setImagePrompt(CHARACTER_SYSTEM_PROMPT)
    setCreationError(null)
    setIsSaving(false)
    previewsRef.current.forEach(url => URL.revokeObjectURL(url))
    setUploadFiles([])
    setUploadPreviews([])
    setActivePreviewIndex(0)
    setGender('')
    setAge('')
    setRace('')
    setHairStyleAndColor('')
    setEyeColorAndShape('')
    setFaceFeatures('')
    onClose()
  }, [onClose])

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

  const handleRemoveImage = useCallback(
    (index?: number) => {
      const targetIndex = index ?? boundedPreviewIndex
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
    [boundedPreviewIndex, uploadFiles.length]
  )

  const handleCreateCharacter = useCallback(async () => {
    if (!creationName.trim()) {
      setCreationError('Model name is required')
      return
    }

    if (mode === 'upload' && uploadFiles.length === 0) {
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

      if (mode === 'generate') {
        // Build prompt from CHARACTER_SYSTEM_PROMPT with replaced placeholders
        let prompt = CHARACTER_SYSTEM_PROMPT

        // Replace placeholders with user inputs or defaults
        prompt = prompt.replace('**[성별]**', gender.trim() || '[성별]')
        prompt = prompt.replace('**[나이]**', age.trim() || '[나이]')
        prompt = prompt.replace('**[인종/국적]**', race.trim() || '[인종/국적]')
        prompt = prompt.replace(
          '**[헤어스타일과 색상]**',
          hairStyleAndColor.trim() || '[헤어스타일과 색상]'
        )
        prompt = prompt.replace(
          '**[눈 색상과 모양]**',
          eyeColorAndShape.trim() || '[눈 색상과 모양]'
        )
        prompt = prompt.replace(
          '**[독특한 얼굴 특징 (주근깨, 점 등)]**',
          faceFeatures.trim() || '[독특한 얼굴 특징]'
        )

        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            modelId: model,
            aspectRatio: '3:4',
          }),
        })
        const data = await res.json()
        if (!res.ok || !data?.imageUrl) throw new Error(data?.error || 'Image generation failed')

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
        const selectedFile = uploadFiles[boundedPreviewIndex] ?? uploadFiles[0]

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

      const entry: Character = {
        id: characterId,
        name: creationName.trim(),
        imageUrl: finalImageUrl,
        ...(imageKey && { imageKey }),
        ...(imageSize && { imageSize }),
      }

      onCharacterCreated(entry)
      resetForm()
    } catch (e: unknown) {
      setCreationError(e instanceof Error ? e.message : 'Failed to create model')
    } finally {
      setIsSaving(false)
    }
  }, [
    boundedPreviewIndex,
    creationName,
    imagePrompt,
    mode,
    model,
    onCharacterCreated,
    projectId,
    resetForm,
    uploadFiles,
    userId,
    gender,
    age,
    race,
    hairStyleAndColor,
    eyeColorAndShape,
    faceFeatures,
  ])

  const latestPreviewImage = useMemo(() => {
    if (mode !== 'generate') return null
    if (isSaving) return null
    return latestCharacterImageUrl || null
  }, [isSaving, latestCharacterImageUrl, mode])

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {mode === 'generate' ? 'Generate Model' : 'Upload Model'}
        </h3>
        <button
          onClick={resetForm}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row" data-testid="character-creation-layout">
        {/* Left side - Preview */}
        <div className="flex w-full flex-col gap-4 lg:w-2/5" data-testid="character-creation-left">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-neutral-500">
              <span>Preview</span>
              {mode === 'upload' && hasUploadPreviews ? (
                <span className="text-[10px] text-neutral-400">
                  {boundedPreviewIndex + 1}/{uploadPreviews.length}
                </span>
              ) : null}
            </div>
            <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800">
              {mode === 'generate' ? (
                isSaving ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-neutral-300">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent" />
                    Generating...
                  </div>
                ) : latestPreviewImage ? (
                  <Image
                    src={latestPreviewImage}
                    alt="Generated preview"
                    width={280}
                    height={373}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                    Generate a model to see the preview
                  </div>
                )
              ) : mode === 'upload' && activePreview ? (
                <>
                  <Image
                    src={activePreview}
                    alt="Upload preview"
                    width={280}
                    height={373}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                  <button
                    onClick={() => handleRemoveImage()}
                    className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white transition hover:bg-black/80"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                  Upload images to see a preview
                </div>
              )}
            </div>

            {mode === 'upload' && hasUploadPreviews ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActivePreviewIndex(idx => Math.max(0, idx - 1))}
                  className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:opacity-40"
                  disabled={boundedPreviewIndex === 0}
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setActivePreviewIndex(idx => Math.min(uploadPreviews.length - 1, idx + 1))
                  }
                  className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:opacity-40"
                  disabled={boundedPreviewIndex === uploadPreviews.length - 1}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          {mode === 'upload' && (
            <div className="flex flex-1 flex-col gap-4">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                Upload images
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[160px] flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-800/50 transition hover:border-neutral-600"
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
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
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
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-3/5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Model name
            </label>
            <input
              type="text"
              value={creationName}
              onChange={e => setCreationName(e.target.value)}
              placeholder="Enter model name"
              ref={nameInputRef}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {mode === 'generate' && (
            <>

              <div className="flex flex-col gap-4 rounded-xl border border-neutral-800/60 bg-neutral-900/70 p-4">
                <h4 className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">
                  Character Attributes
                </h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Gender
                    </label>
                    <input
                      type="text"
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      placeholder="e.g., Male, Female, Non-binary"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Age
                    </label>
                    <input
                      type="text"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      placeholder="e.g., 25, Mid-30s, Elderly"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                    />
                  </div>

                  {/* Race */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Race
                    </label>
                    <input
                      type="text"
                      value={race}
                      onChange={e => setRace(e.target.value)}
                      placeholder="e.g., Caucasian, Asian, Hispanic"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                    />
                  </div>

                  {/* Hair Style & Color */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Hair Style & Color
                    </label>
                    <input
                      type="text"
                      value={hairStyleAndColor}
                      onChange={e => setHairStyleAndColor(e.target.value)}
                      placeholder="e.g., Long wavy blonde hair"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                    />
                  </div>

                  {/* Eye Color & Shape */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Eye Color & Shape
                    </label>
                    <input
                      type="text"
                      value={eyeColorAndShape}
                      onChange={e => setEyeColorAndShape(e.target.value)}
                      placeholder="e.g., Blue almond-shaped eyes"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Face Features - Full Width */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Face Features
                  </label>
                  <input
                    type="text"
                    value={faceFeatures}
                    onChange={e => setFaceFeatures(e.target.value)}
                    placeholder="e.g., Freckles, beauty mark, dimples"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                  />
                </div>

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
                    {isSaving ? 'Generating...' : 'Generate Model'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error and action buttons for upload mode */}
      {mode === 'upload' && (
        <div className="space-y-4">
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
              {isSaving ? 'Saving...' : 'Add Model'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
