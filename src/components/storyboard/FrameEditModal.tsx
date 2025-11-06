'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Save, X } from 'lucide-react'
import type { StoryboardFrame } from '@/types/storyboard'
import type { Card } from '@/types'
import { useCards } from '@/lib/api'

const MODAL_HEIGHT = 'min(85vh, 700px)'

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
  const [isSaving, setIsSaving] = useState(false)
  const { cards, updateCards } = useCards(projectId)

  useEffect(() => {
    setDraft({ ...frame, imageHistory: frame.imageHistory ?? [] })
  }, [frame])

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

  const handleSave = async () => {
    setIsSaving(true)
    try {
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
              image_url: draft.imageUrl,
              image_urls: cleanedHistory,
              background: draft.background || null,
            }
          : card
      )

      await updateCards(updatedCards)
      onSaved?.(draft)
      onClose()
    } catch (error) {
      console.error('Failed to save frame:', error)
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Frame editor"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-zinc-200/80 bg-white text-zinc-900 shadow-2xl dark:border-zinc-700/50 dark:bg-zinc-900 dark:text-zinc-100"
        style={{ height: MODAL_HEIGHT }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-zinc-100 px-6 py-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Frame Information</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Shot {draft.scene} • {draft.shot || 'Unknown'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col md:flex-row">
          {/* Left: Image + Prompt */}
          <div className="relative flex h-full w-full flex-col border-r border-zinc-200 dark:border-zinc-800 md:w-1/2">
            <div className="relative flex-1 bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
              {draft.imageUrl ? (
                <div className="relative h-full w-full p-4">
                  <Image
                    src={draft.imageUrl}
                    alt="frame"
                    fill
                    className="rounded-lg object-contain shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                  No image available
                </div>
              )}
            </div>
            {/* Prompt */}
            <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Image Prompt
              </div>
              <div className="max-h-20 overflow-auto text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {draft.imagePrompt?.trim() || 'No prompt provided'}
              </div>
            </div>
          </div>

          {/* Right: Editable details + history */}
          <div className="flex h-full w-full flex-col overflow-hidden md:w-1/2">
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Editable Details */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="scene" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Scene
                      </label>
                      <input
                        id="scene"
                        type="number"
                        value={draft.scene ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, scene: parseInt(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="shot" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Shot Type
                      </label>
                      <input
                        id="shot"
                        type="text"
                        value={draft.shot || ''}
                        onChange={e => setDraft(prev => ({ ...prev, shot: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-400"
                        placeholder="e.g., Medium, Close-up"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="shotDescription" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Shot Description
                    </label>
                    <textarea
                      id="shotDescription"
                      value={draft.shotDescription || ''}
                      onChange={e => setDraft(prev => ({ ...prev, shotDescription: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-400"
                      placeholder="Describe the shot..."
                    />
                  </div>

                  <div>
                    <label htmlFor="dialogue" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Dialogue
                    </label>
                    <textarea
                      id="dialogue"
                      value={draft.dialogue || ''}
                      onChange={e => setDraft(prev => ({ ...prev, dialogue: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-400"
                      placeholder="Character dialogue..."
                    />
                  </div>

                  <div>
                    <label htmlFor="sound" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Sound
                    </label>
                    <textarea
                      id="sound"
                      value={draft.sound || ''}
                      onChange={e => setDraft(prev => ({ ...prev, sound: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-400"
                      placeholder="Sound effects, music..."
                    />
                  </div>

                  <div>
                    <label htmlFor="background" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Background
                    </label>
                    <input
                      id="background"
                      type="text"
                      value={draft.background || ''}
                      onChange={e => setDraft(prev => ({ ...prev, background: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-400"
                      placeholder="Background setting..."
                    />
                  </div>
                </div>
              </section>

              {/* History */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Image History
                </h3>
                {Array.isArray(draft.imageHistory) && draft.imageHistory.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {draft.imageHistory.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => handleSelectHistoryImage(url)}
                        aria-label={`Select history image ${idx + 1}`}
                        className={`group relative aspect-square overflow-hidden rounded-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          draft.imageUrl === url
                            ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/30'
                            : 'ring-1 ring-zinc-200 hover:ring-zinc-300 dark:ring-zinc-700 dark:hover:ring-zinc-600'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`History ${idx + 1}`} className="h-full w-full object-cover" />
                        {draft.imageUrl === url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/20 backdrop-blur-[1px]">
                            <div className="rounded-full bg-indigo-600 p-1 shadow-lg">
                              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-8 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <svg
                      className="mb-2 h-8 w-8 text-zinc-400 dark:text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">No history available</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FrameEditModal
