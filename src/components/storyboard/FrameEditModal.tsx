'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import type { StoryboardFrame } from '@/types/storyboard'
import type { Card, Character } from '@/types'
import {
  buildCharacterSnippet,
  getCharacterMentionSlug,
  resolveCharacterMentions,
  buildPromptWithCharacterMentions,
} from '@/lib/characterMentions'
import { useCards } from '@/lib/api'
import { DEFAULT_MODEL, getModelsForMode } from '@/lib/fal-ai'
import { useBackgroundStore } from '@/store/backgrounds'
import {
  createUniqueBackground,
  validateBackgroundInput,
  isDuplicateBackground,
} from '@/lib/backgroundExtractor'
import { EditTab as EditTabComponent, DetailsTab, HistoryTab } from './frame-edit-tabs'

type TabName = 'edit' | 'details' | 'history'
type ToolId = 'bananaReplacement' | 'colorAdjust' | 'lightingFix' | 'cleanup'
type BananaToolMode = 'brush' | 'erase'

const TOOL_OPTIONS: Array<{ id: ToolId; name: string; description: string }> = [
  {
    id: 'bananaReplacement',
    name: 'Banana Replacement',
    description: 'Replace bananas with new hero products.',
  },
  { id: 'colorAdjust', name: 'Color Adjust', description: 'Tune saturation and white balance.' },
  {
    id: 'lightingFix',
    name: 'Lighting Fix',
    description: 'Rebalance exposure, highlights, and shadows.',
  },
  { id: 'cleanup', name: 'Cleanup', description: 'Remove blemishes or distracting elements.' },
]

const DEFAULT_BANANA_SETTINGS: { mode: BananaToolMode; productName: string; prompt: string } = {
  mode: 'brush',
  productName: '',
  prompt: '',
}

const MODAL_HEIGHT = 'min(85vh, 640px)'

export interface FrameEditModalProps {
  frame: StoryboardFrame
  projectId: string
  onClose: () => void
  onSaved?: (updated: StoryboardFrame) => void
}

const FrameEditModal: React.FC<FrameEditModalProps> = ({ frame, projectId, onClose, onSaved }) => {
  const [draft, setDraft] = useState<StoryboardFrame>({
    ...frame,
    imageHistory: frame.imageHistory ?? [],
  })
  const [activeTab, setActiveTab] = useState<TabName>('edit')
  const [selectedTool, setSelectedTool] = useState<ToolId>('bananaReplacement')
  const [bananaToolSettings, setBananaToolSettings] = useState(DEFAULT_BANANA_SETTINGS)
  const { cards, updateCards } = useCards(projectId)
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false)
  const models = useMemo(() => getModelsForMode('generate'), [])
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models.find(model => model.id === DEFAULT_MODEL)?.id ?? models[0]?.id ?? DEFAULT_MODEL
  )
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generationMessage, setGenerationMessage] = useState<string | null>(null)
  const [generationWarning, setGenerationWarning] = useState<string | null>(null)
  const selectedModel = useMemo(
    () => models.find(model => model.id === selectedModelId),
    [models, selectedModelId]
  )

  // Background management
  const { backgrounds, addCustomBackground } = useBackgroundStore()
  const [isAddingBackground, setIsAddingBackground] = useState(false)
  const [customBackgroundInput, setCustomBackgroundInput] = useState('')
  const [backgroundInputError, setBackgroundInputError] = useState<string | null>(null)

  useEffect(() => {
    if (models.length === 0) return
    const found = models.some(model => model.id === selectedModelId)
    if (!found) {
      setSelectedModelId(models[0].id)
    }
  }, [models, selectedModelId])

  useEffect(() => {
    setDraft({ ...frame, imageHistory: frame.imageHistory ?? [] })
    setActiveTab('details')
    setSelectedTool('bananaReplacement')
    setBananaToolSettings(DEFAULT_BANANA_SETTINGS)
    setGenerationError(null)
    setGenerationMessage(null)
    setGenerationWarning(null)
  }, [frame])

  useEffect(() => {
    if (!projectId) {
      setCharacters([])
      return
    }

    let isMounted = true

    const fetchCharacters = async () => {
      setIsLoadingCharacters(true)

      try {
        const response = await fetch(
          `/api/characters?project_id=${encodeURIComponent(projectId)}`,
          {
            credentials: 'include',
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch characters: ${response.status}`)
        }

        const data = await response.json()

        if (!isMounted) return
        setCharacters(data.characters ?? [])
      } catch (error) {
        console.warn('[FrameEditModal] Failed to load characters:', error)
        if (isMounted) {
          setCharacters([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingCharacters(false)
        }
      }
    }

    fetchCharacters()
    return () => {
      isMounted = false
    }
  }, [projectId])

  const characterPromptSnippets = useMemo(() => {
    return characters
      .map(character => {
        const slug = getCharacterMentionSlug(character.name || '')
        const snippet = buildCharacterSnippet(character)
        return {
          id: character.id,
          name: character.name || 'Character',
          imageUrl: character.image_url || character.original_image_url || null,
          snippet,
          slug,
        }
      })
      .filter(character => character.slug)
  }, [characters])

  const handleInsertCharacter = (slug: string) => {
    if (!slug) return
    const mention = `@${slug}`
    setDraft(prev => {
      const current = prev.imagePrompt || ''
      const separator = current.trim() ? (current.endsWith('\n') ? '' : '\n') : ''
      const nextPrompt = `${current}${separator}${mention}`
      return { ...prev, imagePrompt: nextPrompt }
    })
  }

  const handleAddCustomBackground = () => {
    const trimmedInput = customBackgroundInput.trim()

    const validationError = validateBackgroundInput(trimmedInput)
    if (validationError) {
      setBackgroundInputError(validationError)
      return
    }

    if (isDuplicateBackground(trimmedInput, backgrounds)) {
      setBackgroundInputError('This background already exists or is too similar to an existing one')
      return
    }

    const newBackground = createUniqueBackground(trimmedInput)
    addCustomBackground(newBackground)

    setDraft(prev => ({
      ...prev,
      backgroundId: newBackground.id,
      background: newBackground.description,
    }))

    setCustomBackgroundInput('')
    setBackgroundInputError(null)
    setIsAddingBackground(false)
  }

  const handleCancelAddBackground = () => {
    setCustomBackgroundInput('')
    setBackgroundInputError(null)
    setIsAddingBackground(false)
  }

  const handleSelectHistoryImage = (imageUrl: string) => {
    if (!imageUrl) return

    setDraft(prev => {
      if (prev.imageUrl === imageUrl) {
        return prev
      }

      const existingHistory = Array.isArray(prev.imageHistory) ? prev.imageHistory : []
      const filteredHistory = existingHistory.filter(url => url !== imageUrl)
      const mergedHistory = prev.imageUrl
        ? [prev.imageUrl, ...filteredHistory.filter(url => url !== prev.imageUrl)]
        : filteredHistory

      return {
        ...prev,
        imageUrl,
        imageHistory: Array.from(new Set(mergedHistory)),
      }
    })
  }

  const handleRegenerateImage = async () => {
    const prompt = draft.imagePrompt?.trim()
    if (!prompt) {
      setGenerationError('Add an image prompt before regenerating.')
      setGenerationMessage(null)
      setGenerationWarning(null)
      return
    }

    setIsGeneratingImage(true)
    setGenerationError(null)
    setGenerationMessage(null)
    setGenerationWarning(null)

    try {
      const mentionMatches = resolveCharacterMentions(prompt, characters)
      const requestPrompt = buildPromptWithCharacterMentions(prompt, mentionMatches)
      const mentionImageUrls = Array.from(new Set(mentionMatches.flatMap(match => match.imageUrls)))

      const payload: Record<string, unknown> = {
        prompt: requestPrompt,
        modelId: selectedModelId || DEFAULT_MODEL,
      }

      if (mentionImageUrls.length > 0) {
        payload.imageUrls = mentionImageUrls
      }

      if (draft.imageUrl) {
        payload.image_url = draft.imageUrl
      }

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = (await response.json().catch(() => ({}))) as {
        imageUrl?: string
        error?: string
        warning?: string
      }

      if (!response.ok || !json?.imageUrl) {
        const errorMessage = json?.error || 'Failed to regenerate image.'
        throw new Error(errorMessage)
      }

      setDraft(prev => {
        const previousImage = prev.imageUrl
        const existingHistory = Array.isArray(prev.imageHistory) ? prev.imageHistory : []
        const nextHistory = previousImage
          ? [previousImage, ...existingHistory.filter(url => url !== previousImage)]
          : existingHistory

        return {
          ...prev,
          imageUrl: json.imageUrl,
          imageHistory: Array.from(new Set(nextHistory)),
        }
      })

      if (json.warning) {
        setGenerationWarning(json.warning)
      }

      setGenerationMessage('Image regenerated successfully.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error while regenerating image.'
      setGenerationError(message)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanedHistory = Array.from(
      new Set(
        (draft.imageHistory ?? []).filter(url => typeof url === 'string' && url.trim().length > 0)
      )
    )
    const currentCards = cards || []
    const updatedCards = currentCards.map((card: Card) =>
      card.id === draft.id
        ? {
            ...card,
            scene_number: draft.scene,
            shot_description: draft.shotDescription,
            shot_type: draft.shot,
            dialogue: draft.dialogue,
            sound: draft.sound,
            image_prompt: draft.imagePrompt,
            image_url: draft.imageUrl,
            image_urls: cleanedHistory,
            selected_image_url: 0,
            background: draft.background || null,
          }
        : card
    )

    await updateCards(updatedCards)
    onSaved?.(draft)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl"
        style={{ height: MODAL_HEIGHT }}
      >
        <div className="flex h-full flex-col md:flex-row">
          <div className="relative flex h-full w-full items-center justify-center bg-gray-900 md:w-1/2">
            {draft.imageUrl ? (
              <div className="relative h-full w-full">
                <Image src={draft.imageUrl} alt="frame" fill className="object-contain" />
              </div>
            ) : (
              <div className="text-xs text-gray-400">No image</div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 rounded-md bg-black/80 px-2 py-1 text-[11px] text-white hover:bg-black"
            >
              Close
            </button>
            <div className="absolute bottom-2 left-2 rounded bg-gray-800/80 px-2 py-0.5 text-[11px] font-light text-white backdrop-blur">
              Shot {draft.scene}
            </div>
          </div>
          <div className="flex h-full w-full flex-col overflow-hidden p-6 text-sm md:w-1/2">
            <form onSubmit={handleSubmit} className="flex h-full flex-col overflow-hidden">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">Frame editing</h3>
              </div>
              <div className="mb-4 flex items-center gap-2 border-b border-gray-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'edit'
                      ? 'border-b-2 border-white text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'details'
                      ? 'border-b-2 border-white text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'history'
                      ? 'border-b-2 border-white text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  History
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {activeTab === 'edit' ? (
                  <EditTabComponent
                    selectedTool={selectedTool}
                    onSelectTool={setSelectedTool}
                    bananaToolSettings={bananaToolSettings}
                    onBananaToolSettingsChange={setBananaToolSettings}
                  />
                ) : activeTab === 'details' ? (
                  <DetailsTab
                    draft={draft}
                    onDraftChange={setDraft}
                    backgrounds={backgrounds}
                    onAddBackgroundClick={() => setIsAddingBackground(true)}
                    isAddingBackground={isAddingBackground}
                    customBackgroundInput={customBackgroundInput}
                    onCustomBackgroundInputChange={setCustomBackgroundInput}
                    backgroundInputError={backgroundInputError}
                    onBackgroundInputErrorChange={setBackgroundInputError}
                    onAddCustomBackground={handleAddCustomBackground}
                    onCancelAddBackground={handleCancelAddBackground}
                    selectedModelId={selectedModelId}
                    onModelChange={setSelectedModelId}
                    models={models}
                    selectedModel={selectedModel}
                    characterPromptSnippets={characterPromptSnippets}
                    onInsertCharacter={handleInsertCharacter}
                    isLoadingCharacters={isLoadingCharacters}
                  />
                ) : (
                  <HistoryTab
                    imageHistory={draft.imageHistory ?? []}
                    onSelectHistoryImage={handleSelectHistoryImage}
                  />
                )}
              </div>

              {(generationError || generationMessage || generationWarning) &&
              activeTab === 'details' ? (
                <div className="mt-2 space-y-1 text-xs">
                  {generationMessage && <p className="text-emerald-400">{generationMessage}</p>}
                  {generationWarning && <p className="text-amber-300">{generationWarning}</p>}
                  {generationError && <p className="text-red-400">{generationError}</p>}
                </div>
              ) : null}

              <div className="mt-4 flex justify-end gap-2 border-t border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-gray-600 px-4 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                >
                  Cancel
                </button>
                {activeTab === 'details' ? (
                  <button
                    type="button"
                    onClick={() => void handleRegenerateImage()}
                    className="rounded bg-indigo-500 px-5 py-1.5 text-xs text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGeneratingImage}
                  >
                    {isGeneratingImage ? 'Regenerating…' : 'Regenerate Image'}
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="rounded bg-white px-5 py-1.5 text-xs text-black transition-colors hover:bg-gray-200"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FrameEditModal
