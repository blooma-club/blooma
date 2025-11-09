'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ensureCharacterStyle } from './utils'
import type { Character } from './types'

const editTabs = [
  {
    id: 'product',
    title: 'Product & Clothing',
    helper: 'Use this for outfit, accessory, or prop updates that should wrap around your product.',
    promptHint:
      'describe textures, overlay placement, accessories, and how the character interacts with the product',
    promptPlaceholder:
      "e.g., 'Dress her in a satin bomber, drape the neon bag over her shoulder, warm the lighting'",
  },
  {
    id: 'face',
    title: 'Model Face',
    helper: 'Best when you need the emotion, jawline, or makeup to communicate a specific persona.',
    promptHint: 'describe eyes, lips, skin tones, emotions, and subtle anatomy adjustments',
    promptPlaceholder:
      "e.g., 'Soften the jawline, brighten the eyes, give a confident smile and glowing skin'",
  },
] as const

type EditTabId = (typeof editTabs)[number]['id']

type ProductAttachment = {
  id: string
  name: string
  size: number
  type: string
  previewUrl?: string
  file?: File
}

const formatBytes = (value: number) => {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let index = 0

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }

  return `${size.toFixed(1)} ${units[index]}`
}

const HISTORY_LIMIT = 6

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to convert file to data URL'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read attachment file'))
    reader.readAsDataURL(file)
  })
}

type Props = {
  character: Character
  onSave: (character: Character) => void
  onCancel: () => void
  projectId?: string
  userId?: string
}

export function CharacterEditForm({ character, onSave, onCancel, projectId, userId }: Props) {
  const initialAttachments: ProductAttachment[] =
    character.productAttachments?.map((attachment, index) => ({
      id: `existing-${index}-${attachment.name}`,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
    })) ?? []

  const [editTab, setEditTab] = useState<EditTabId>('product')
  const [editedCharacter, setEditedCharacter] = useState<Character>({
    ...character,
    editPrompt: '',
    originalImageUrl: character.imageUrl,
    productAttachments: character.productAttachments ?? [],
  })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productAttachments, setProductAttachments] =
    useState<ProductAttachment[]>(initialAttachments)
  const [imageHistory, setImageHistory] = useState<string[]>([])
  const previewUrls = useRef(new Set<string>())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleAttachmentAreaClick = () => {
    fileInputRef.current?.click()
  }

  const selectedTab = editTabs.find(tab => tab.id === editTab) ?? editTabs[0]

  useEffect(
    () => () => {
      previewUrls.current.forEach(url => URL.revokeObjectURL(url))
    },
    []
  )

  const handlePromptChange = (value: string) => {
    setEditedCharacter(prev => ({
      ...prev,
      editPrompt: value,
    }))
  }

  const handleProductAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const remainingSlots = Math.max(0, 4 - productAttachments.length)
    if (!remainingSlots) return

    const allowedFiles = files.slice(0, remainingSlots)

    const newAttachments = allowedFiles.map(file => {
      const previewUrl = URL.createObjectURL(file)
      previewUrls.current.add(previewUrl)
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        file,
      }
    })

    setProductAttachments(prev => {
      const updated = [...prev, ...newAttachments]
      setEditedCharacter(prevChar => ({
        ...prevChar,
        productAttachments: [
          ...(prevChar.productAttachments ?? []),
          ...newAttachments.map(({ name, size, type }) => ({ name, size, type })),
        ],
      }))
      return updated
    })

    if (event.target) {
      event.target.value = ''
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setProductAttachments(prev => {
      const next = prev.filter(attachment => attachment.id !== id)
      const removed = prev.find(attachment => attachment.id === id)
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
        previewUrls.current.delete(removed.previewUrl)
      }
      setEditedCharacter(prevChar => ({
        ...prevChar,
        productAttachments: next.map(({ name, size, type }) => ({ name, size, type })),
      }))
      return next
    })
  }

  const handleRegenerateWithPrompt = async () => {
    if (!editedCharacter.editPrompt?.trim()) {
      setError('Please enter a prompt to edit the character')
      return
    }

    const baseImageUrl = editedCharacter.imageUrl ?? character.imageUrl
    if (!baseImageUrl) {
      setError('Character image is required to apply edits')
      return
    }

    setGenerating(true)
    setError(null)
    try {
      const styledPrompt = ensureCharacterStyle(editedCharacter.editPrompt.trim())
      const fullPrompt = `${styledPrompt}, highly detailed, ${selectedTab.promptHint}`
      const attachmentFiles =
        editTab === 'product'
          ? productAttachments
              .map(attachment => attachment.file)
              .filter((file): file is File => Boolean(file))
          : []
      const attachmentDataUrls = attachmentFiles.length
        ? await Promise.all(attachmentFiles.map(file => readFileAsDataUrl(file)))
        : []
      const modelId =
        editTab === 'product'
          ? 'fal-ai/nano-banana/edit'
          : 'fal-ai/gemini-25-flash-image/edit'

      const requestBody: Record<string, unknown> = {
        prompt: fullPrompt,
        modelId,
        aspectRatio: '3:4',
        image_url: baseImageUrl,
      }
      if (attachmentDataUrls.length) {
        requestBody.imageUrls = attachmentDataUrls
      }

      console.log(
        '[CharacterWizard] Using image-to-image generation with current character image:',
        baseImageUrl.substring(0, 50) + '...'
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
      const previousImageUrl = editedCharacter.imageUrl

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

      if (previousImageUrl && previousImageUrl !== finalImageUrl) {
        setImageHistory(prev => {
          const normalized = prev.filter(entry => entry !== previousImageUrl)
          return [previousImageUrl, ...normalized].slice(0, HISTORY_LIMIT)
        })
      }

      const updatedCharacter: Character = {
        ...editedCharacter,
        imageUrl: finalImageUrl,
        editPrompt: styledPrompt,
        ...(imageKey && { imageKey }),
        ...(imageSize && { imageSize }),
      }

      setEditedCharacter(updatedCharacter)
      onSave(updatedCharacter)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Image generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectHistoryImage = (url: string) => {
    if (!url) return
    const currentImageUrl = editedCharacter.imageUrl
    setImageHistory(prev => {
      const normalized = prev.filter(entry => entry !== url)
      if (currentImageUrl && currentImageUrl !== url) {
        normalized.unshift(currentImageUrl)
      }
      return normalized.slice(0, HISTORY_LIMIT)
    })
    setEditedCharacter(prev => ({
      ...prev,
      imageUrl: url,
    }))
  }

  const handleSaveDetails = () => {
    onSave(editedCharacter)
  }

  const promptLabel = editTab === 'product' ? 'Detailed description' : 'Edit Prompt'

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex gap-2">
          {editTabs.map(tab => {
            const isActive = tab.id === editTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEditTab(tab.id)}
                className={`flex-1 rounded-md border-b-2 px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.title}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
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

        <div className="space-y-5">
          {editTab === 'product' && (
            <div
              className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 cursor-pointer"
              onClick={handleAttachmentAreaClick}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleAttachmentAreaClick()
                }
              }}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                id="product-attachment"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={handleProductAttachmentChange}
              />

              <div className="grid grid-cols-2 grid-rows-2 gap-3 pt-3 min-h-[200px]">
                {Array.from({ length: 4 }).map((_, index) => {
                  const attachment = productAttachments[index]
                  return (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950"
                    >
                      {attachment ? (
                        <>
                          {attachment.previewUrl ? (
                            <img
                              src={attachment.previewUrl}
                              alt={attachment.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                              No preview available
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              handleRemoveAttachment(attachment.id)
                            }}
                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-black"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-2 left-2 right-2 text-xs text-white">
                            <p className="truncate font-semibold">{attachment.name}</p>
                            <p className="text-neutral-300">{formatBytes(attachment.size)}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                          Drop in PNG/JPEG/WebP references.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300">{promptLabel}</label>
            <textarea
              value={editedCharacter.editPrompt || ''}
              onChange={e => handlePromptChange(e.target.value)}
              placeholder={selectedTab.promptPlaceholder}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              rows={6}
            />
            <p className="mt-2 text-xs text-neutral-400">{selectedTab.helper}</p>
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="flex flex-wrap gap-3 pt-4">
        <div className="flex flex-1 min-w-[220px] gap-2">
          <Button
            onClick={handleRegenerateWithPrompt}
            disabled={generating || !editedCharacter.editPrompt?.trim()}
            className="flex-1 min-w-[220px]"
          >
            {generating ? 'Applying edit...' : `Apply ${selectedTab.title} edit`}
          </Button>
          {imageHistory.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="px-3 text-xs font-semibold">
                  History
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[260px] p-0">
                <DropdownMenuLabel inset>Previous generations</DropdownMenuLabel>
                {imageHistory.map((historyUrl, index) => (
                  <DropdownMenuItem
                    key={`${historyUrl}-${index}`}
                    onSelect={() => handleSelectHistoryImage(historyUrl)}
                    className="gap-2 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded border border-neutral-700 bg-neutral-950">
                        <img
                          src={historyUrl}
                          alt={`History ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col text-left text-xs">
                        <span className="font-semibold text-white">Version {index + 1}</span>
                        <span className="text-neutral-500">Tap to restore</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Button variant="secondary" onClick={handleSaveDetails} className="px-6">
          Save Details
        </Button>
        <Button onClick={onCancel} variant="outline" className="px-6">
          Cancel
        </Button>
      </div>
    </div>
  )
}
