'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
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
  const modalRef = useRef<HTMLDivElement>(null)
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

  const handleSave = useCallback(async () => {
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
  }, [cards, draft, onClose, onSaved, updateCards])

  // keyboard shortcuts: ESC to close, Cmd/Ctrl+S to save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, onClose])


  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Frame editor"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-neutral-200/70 bg-white text-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        style={{ height: MODAL_HEIGHT }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold tracking-tight">Edit frame</h2>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Shot {draft.scene}</span>
            {draft.shot && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">• {draft.shot}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col md:flex-row">
          {/* Left: Image + Prompt */}
          <div className="relative flex h-full w-full flex-col border-r border-neutral-200 dark:border-neutral-800 md:w-1/2">
            <div className="relative flex-1 bg-neutral-50 dark:bg-neutral-950">
              {draft.imageUrl ? (
                <div className="relative h-full w-full p-4">
                  <Image
                    src={draft.imageUrl}
                    alt="frame"
                    fill
                    className="rounded-lg object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  No image available
                </div>
              )}
            </div>
            {/* Prompt */}
            <div className="border-t border-neutral-200 bg-white/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/80">
              <div className="mb-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Image prompt</div>
              <div className="max-h-24 overflow-auto text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                {draft.imagePrompt?.trim() || 'No prompt provided'}
              </div>
            </div>
          </div>

          {/* Right: Editable details + history */}
          <div className="flex h-full w-full flex-col overflow-hidden md:w-1/2">
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {/* Editable Details */}
              <section>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="scene" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Scene
                      </label>
                      <input
                        id="scene"
                        type="number"
                        value={draft.scene ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, scene: parseInt(e.target.value) || 0 }))}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="shot" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Shot Type
                      </label>
                      <input
                        id="shot"
                        type="text"
                        value={draft.shot || ''}
                        onChange={e => setDraft(prev => ({ ...prev, shot: e.target.value }))}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
                        placeholder="e.g., Medium, Close-up"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="shotDescription" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Shot Description
                    </label>
                    <textarea
                      id="shotDescription"
                      value={draft.shotDescription || ''}
                      onChange={e => setDraft(prev => ({ ...prev, shotDescription: e.target.value }))}
                      rows={3}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
                      placeholder="Describe the shot..."
                    />
                  </div>

                  <div>
                    <label htmlFor="dialogue" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Dialogue
                    </label>
                    <textarea
                      id="dialogue"
                      value={draft.dialogue || ''}
                      onChange={e => setDraft(prev => ({ ...prev, dialogue: e.target.value }))}
                      rows={2}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
                      placeholder="Character dialogue..."
                    />
                  </div>

                  <div>
                    <label htmlFor="sound" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Sound
                    </label>
                    <textarea
                      id="sound"
                      value={draft.sound || ''}
                      onChange={e => setDraft(prev => ({ ...prev, sound: e.target.value }))}
                      rows={2}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
                      placeholder="Sound effects, music..."
                    />
                  </div>

                  <div>
                    <label htmlFor="background" className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Background
                    </label>
                    <input
                      id="background"
                      type="text"
                      value={draft.background || ''}
                      onChange={e => setDraft(prev => ({ ...prev, background: e.target.value }))}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
                      placeholder="Background setting..."
                    />
                  </div>
                </div>
              </section>

              {/* History */}
              <section>
                {Array.isArray(draft.imageHistory) && draft.imageHistory.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {draft.imageHistory.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => handleSelectHistoryImage(url)}
                        aria-label={`Select history image ${idx + 1}`}
                        className={`group relative aspect-square overflow-hidden rounded-md transition-transform hover:scale-[1.02] focus:outline-none ${
                          draft.imageUrl === url
                            ? 'ring-2 ring-neutral-900 dark:ring-white'
                            : 'ring-1 ring-neutral-200 hover:ring-neutral-300 dark:ring-neutral-700 dark:hover:ring-neutral-600'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`History ${idx + 1}`} className="h-full w-full object-cover" />
                        {draft.imageUrl === url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/10 dark:bg-white/10 backdrop-blur-[1px]">
                            <div className="rounded-full bg-neutral-900 p-1 shadow-lg dark:bg-white">
                              <svg className="h-3 w-3 text-white dark:text-neutral-900" fill="currentColor" viewBox="0 0 20 20">
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
                  <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 py-8 dark:border-neutral-700 dark:bg-neutral-800/50">
                    <svg
                      className="mb-2 h-8 w-8 text-neutral-400 dark:text-neutral-600"
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
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">No history available</p>
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
