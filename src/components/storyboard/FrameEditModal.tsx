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

type EditTab = 'edit' | 'details' | 'history'
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
  const [activeTab, setActiveTab] = useState<EditTab>('edit')
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
      const mentionImageUrls = Array.from(
        new Set(mentionMatches.flatMap(match => match.imageUrls))
      )

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
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-medium text-gray-300">Tools</div>
                      <div className="grid grid-cols-2 gap-2">
                        {TOOL_OPTIONS.map(tool => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => setSelectedTool(tool.id)}
                            className={`rounded border px-3 py-2 text-left transition-colors ${
                              selectedTool === tool.id
                                ? 'border-white/80 bg-white/10 text-white'
                                : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:text-white'
                            }`}
                          >
                            <div className="text-xs font-semibold">{tool.name}</div>
                            <div className="mt-1 text-[11px] text-gray-400">{tool.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded border border-gray-700 bg-gray-900/70 p-4">
                      {selectedTool === 'bananaReplacement' ? (
                        <>
                          <div className="text-xs font-medium text-white">Banana Replacement</div>
                          <p className="text-[11px] text-gray-400">
                            Brush over bananas to mask them, then describe the product you want to
                            appear instead. Use erase to refine the mask before applying.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(['brush', 'erase'] as BananaToolMode[]).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  setBananaToolSettings(prev => ({
                                    ...prev,
                                    mode,
                                  }))
                                }
                                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                                  bananaToolSettings.mode === mode
                                    ? 'bg-white text-black'
                                    : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white'
                                }`}
                              >
                                {mode === 'brush' ? 'Brush' : 'Erase'}
                              </button>
                            ))}
                          </div>
                          <Field label="Featured Product">
                            <input
                              type="text"
                              value={bananaToolSettings.productName}
                              onChange={event =>
                                setBananaToolSettings(prev => ({
                                  ...prev,
                                  productName: event.target.value,
                                }))
                              }
                              placeholder="e.g. Premium chocolate bar"
                              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                            />
                          </Field>
                          <Field
                            label="Replacement Prompt"
                            help="Describe the new product, lighting, and style for the replacement."
                          >
                            <textarea
                              rows={3}
                              value={bananaToolSettings.prompt}
                              onChange={event =>
                                setBananaToolSettings(prev => ({
                                  ...prev,
                                  prompt: event.target.value,
                                }))
                              }
                              placeholder="Hyper-realistic dessert shot replacing bananas with a glossy chocolate sculpture..."
                              className="w-full resize-y rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                            />
                          </Field>
                          <button
                            type="button"
                            className="w-full rounded bg-white/90 py-2 text-xs font-semibold text-black transition-colors hover:bg-white"
                          >
                            Apply Banana Replacement
                          </button>
                        </>
                      ) : (
                        <div className="space-y-2 text-[11px] text-gray-400">
                          <div className="text-xs font-semibold text-white">
                            {TOOL_OPTIONS.find(tool => tool.id === selectedTool)?.name}
                          </div>
                          <p>
                            This tool is coming soon. Select Banana Replacement to try the
                            interactive workflow.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'details' ? (
                  <>
                    <Field label="Shot #">
                      <input
                        type="number"
                        min={1}
                        value={draft.scene || 1}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, scene: Number(event.target.value) }))
                        }
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Shot Description">
                      <textarea
                        value={draft.shotDescription || ''}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, shotDescription: event.target.value }))
                        }
                        rows={4}
                        className="w-full resize-y rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Camera Shot">
                      <input
                        type="text"
                        value={draft.shot || ''}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, shot: event.target.value }))
                        }
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Angle">
                      <input
                        type="text"
                        value={draft.angle || ''}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, angle: event.target.value }))
                        }
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Background">
                      <input
                        type="text"
                        value={draft.background || ''}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, background: event.target.value }))
                        }
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Mood/Lighting">
                      <input
                        type="text"
                        value={draft.moodLighting || ''}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, moodLighting: event.target.value }))
                        }
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field
                      label="Image Prompt"
                      help="Prompt for generating images separate from Shot Description. Use @mentions for project characters."
                    >
                      <textarea
                        value={draft.imagePrompt || ''}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, imagePrompt: event.target.value }))
                        }
                        rows={4}
                        className="w-full resize-y rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs font-mono text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field
                      label="Generation Model"
                      help={
                        selectedModel
                          ? `${selectedModel.description} (${selectedModel.quality} quality)`
                          : 'Choose the AI model used when regenerating this frame.'
                      }
                    >
                      <select
                        value={selectedModelId}
                        onChange={event => setSelectedModelId(event.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={models.length === 0}
                      >
                        {models.length > 0 ? (
                          models.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))
                        ) : (
                          <option value="">No models available</option>
                        )}
                      </select>
                    </Field>
                {characterPromptSnippets.length > 0 && (
                  <div className="space-y-2 rounded border border-gray-700 bg-gray-900/60 p-3">
                    <div className="text-xs font-medium text-gray-200">Project characters</div>
                    <p className="text-[11px] text-gray-400">
                      Click to insert an @mention that links the character image to your prompt.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {characterPromptSnippets.map(character => (
                            <button
                              key={character.id}
                              type="button"
                              onClick={() => handleInsertCharacter(character.slug)}
                              className="group flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[11px] text-gray-200 transition-colors hover:border-gray-500 hover:text-white"
                              title={character.snippet}
                            >
                              {character.imageUrl ? (
                                <div className="relative h-6 w-6 overflow-hidden rounded-sm border border-gray-700">
                                  <Image
                                    src={character.imageUrl}
                                    alt={character.name}
                                    fill
                                    sizes="24px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : null}
                              <span className="flex flex-col text-left">
                                <span>{character.name}</span>
                                <span className="text-[10px] text-gray-400">@{character.slug}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                        {isLoadingCharacters && (
                          <div className="text-[11px] text-gray-500">Refreshing characters…</div>
                        )}
                      </div>
                    )}
                    <Field label="Dialogue / VO">
                      <input
                        type="text"
                        value={draft.dialogue}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, dialogue: event.target.value }))
                        }
                        required
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Sound">
                      <input
                        type="text"
                        value={draft.sound}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, sound: event.target.value }))
                        }
                        required
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                      />
                    </Field>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs text-gray-400">
                      Select a previous image to restore it as the current frame. The existing image
                      will move into history.
                    </div>
                    {draft.imageHistory && draft.imageHistory.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {draft.imageHistory.map((imageUrl, index) => (
                          <button
                            key={`${imageUrl}-${index}`}
                            type="button"
                            onClick={() => handleSelectHistoryImage(imageUrl)}
                            className="group relative overflow-hidden rounded border border-gray-700 bg-gray-900 text-left"
                            title="Restore this image"
                          >
                            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                              <Image
                                src={imageUrl}
                                alt={`Historic frame ${index + 1}`}
                                fill
                                sizes="200px"
                                className="object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center rounded bg-black/60 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                              Use this image
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-gray-700 p-6 text-center text-xs text-gray-500">
                        No previous images yet. Generate new versions to build history.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(generationError || generationMessage || generationWarning) && activeTab === 'details' ? (
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

const Field: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({
  label,
  help,
  children,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-300">{label}</label>
    {children}
    {help && <p className="text-[10px] text-gray-400">{help}</p>}
  </div>
)

export default FrameEditModal
