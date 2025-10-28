'use client'

import React from 'react'
import Image from 'next/image'
import type { StoryboardFrame } from '@/types/storyboard'
import type { Character } from '@/types'
import type { BackgroundCandidate } from '@/lib/backgroundExtractor'

interface CharacterSnippet {
  id: string
  name: string
  imageUrl: string | null
  snippet: string
  slug: string
}

interface Model {
  id: string
  name: string
  description: string
  quality: string
}

export interface DetailsTabProps {
  draft: StoryboardFrame
  onDraftChange: (updater: (prev: StoryboardFrame) => StoryboardFrame) => void
  backgrounds: BackgroundCandidate[]
  onAddBackgroundClick: () => void
  isAddingBackground: boolean
  customBackgroundInput: string
  onCustomBackgroundInputChange: (value: string) => void
  backgroundInputError: string | null
  onBackgroundInputErrorChange: (error: string | null) => void
  onAddCustomBackground: () => void
  onCancelAddBackground: () => void
  selectedModelId: string
  onModelChange: (modelId: string) => void
  models: Model[]
  selectedModel: Model | undefined
  characterPromptSnippets: CharacterSnippet[]
  onInsertCharacter: (slug: string) => void
  isLoadingCharacters: boolean
}

const DetailsTab: React.FC<DetailsTabProps> = ({
  draft,
  onDraftChange,
  backgrounds,
  onAddBackgroundClick,
  isAddingBackground,
  customBackgroundInput,
  onCustomBackgroundInputChange,
  backgroundInputError,
  onBackgroundInputErrorChange,
  onAddCustomBackground,
  onCancelAddBackground,
  selectedModelId,
  onModelChange,
  models,
  selectedModel,
  characterPromptSnippets,
  onInsertCharacter,
  isLoadingCharacters,
}) => {
  return (
    <>
      <Field label="Shot">
        <input
          type="number"
          min={1}
          value={draft.scene || 1}
          onChange={e => onDraftChange(prev => ({ ...prev, scene: Number(e.target.value) }))}
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field label="Shot Description">
        <textarea
          value={draft.shotDescription || ''}
          onChange={e => onDraftChange(prev => ({ ...prev, shotDescription: e.target.value }))}
          rows={4}
          className="w-full resize-y rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field label="Camera Shot">
        <input
          type="text"
          value={draft.shot || ''}
          onChange={e => onDraftChange(prev => ({ ...prev, shot: e.target.value }))}
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field label="Angle">
        <input
          type="text"
          value={draft.angle || ''}
          onChange={e => onDraftChange(prev => ({ ...prev, angle: e.target.value }))}
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field label="Background">
        <div className="space-y-2">
          {backgrounds.length > 0 && (
            <select
              value={draft.backgroundId || ''}
              onChange={e => {
                const backgroundId = e.target.value || null
                const selectedBg = backgrounds.find(bg => bg.id === backgroundId)
                onDraftChange(prev => ({
                  ...prev,
                  backgroundId,
                  background: selectedBg?.description || '',
                }))
              }}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
            >
              <option value="">Custom background (enter below)</option>
              {backgrounds.map(bg => (
                <option key={bg.id} value={bg.id}>
                  {bg.description}{' '}
                  {bg.sceneIndices.length > 0
                    ? `(${bg.sceneIndices.length} scene${bg.sceneIndices.length !== 1 ? 's' : ''})`
                    : '(custom)'}
                </option>
              ))}
            </select>
          )}

          {!isAddingBackground ? (
            <>
              <input
                type="text"
                value={draft.background || ''}
                onChange={e => onDraftChange(prev => ({ ...prev, background: e.target.value }))}
                placeholder={
                  backgrounds.length > 0
                    ? 'Enter custom background or select from above'
                    : 'Enter background description'
                }
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={onAddBackgroundClick}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:bg-gray-700 hover:text-white"
              >
                + Add New Background to Library
              </button>
            </>
          ) : (
            <div className="space-y-2 rounded border border-gray-600 bg-gray-800/50 p-3">
              <div className="text-xs font-medium text-gray-200">Add Custom Background</div>
              <input
                type="text"
                value={customBackgroundInput}
                onChange={e => {
                  onCustomBackgroundInputChange(e.target.value)
                  onBackgroundInputErrorChange(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddCustomBackground()
                  } else if (e.key === 'Escape') {
                    onCancelAddBackground()
                  }
                }}
                placeholder="e.g., sunset rooftop, medieval castle courtyard"
                className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
                autoFocus
              />
              {backgroundInputError && (
                <p className="text-[10px] text-red-400">{backgroundInputError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onAddCustomBackground}
                  className="flex-1 rounded bg-white/90 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white"
                >
                  Add Background
                </button>
                <button
                  type="button"
                  onClick={onCancelAddBackground}
                  className="flex-1 rounded border border-gray-600 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-gray-400">Press Enter to add, Esc to cancel</p>
            </div>
          )}

          {backgrounds.length > 0 && (
            <p className="text-[10px] text-gray-400">
              Select a background from the script, enter custom text, or add new backgrounds to your
              library. Using consistent backgrounds helps maintain visual continuity across scenes.
            </p>
          )}
        </div>
      </Field>

      <Field label="Mood/Lighting">
        <input
          type="text"
          value={draft.moodLighting || ''}
          onChange={e => onDraftChange(prev => ({ ...prev, moodLighting: e.target.value }))}
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field
        label="Image Prompt"
        help="Prompt for generating images separate from Shot Description. Use @mentions for project characters."
      >
        <textarea
          value={draft.imagePrompt || ''}
          onChange={e => onDraftChange(prev => ({ ...prev, imagePrompt: e.target.value }))}
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
          onChange={e => onModelChange(e.target.value)}
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
                onClick={() => onInsertCharacter(character.slug)}
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
          onChange={e => onDraftChange(prev => ({ ...prev, dialogue: e.target.value }))}
          required
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field label="Sound">
        <input
          type="text"
          value={draft.sound}
          onChange={e => onDraftChange(prev => ({ ...prev, sound: e.target.value }))}
          required
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
        />
      </Field>

      <Field label="Models Used">
        <div className="space-y-2 rounded border border-gray-700 bg-gray-900/60 p-3">
          {draft.characterMetadata && draft.characterMetadata.length > 0 ? (
            <>
              <div className="text-xs text-gray-400">
                Models dragged to this scene during setup:
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.characterMetadata.map((meta, idx) => (
                  <div
                    key={`${meta.characterId}-${idx}`}
                    className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800 px-2 py-1.5"
                  >
                    {meta.characterImageUrl && (
                      <div className="relative h-6 w-6 overflow-hidden rounded-sm border border-gray-700">
                        <Image
                          src={meta.characterImageUrl}
                          alt={meta.characterName}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-200">
                        {meta.characterName}
                      </span>
                      {meta.characterHandle && (
                        <span className="text-[10px] text-gray-400">{meta.characterHandle}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500">No models assigned to this scene yet.</div>
          )}
        </div>
      </Field>
    </>
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

export default DetailsTab
