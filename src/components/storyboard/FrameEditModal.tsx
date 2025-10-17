'use client'
import React, { useEffect, useMemo, useState } from 'react'
import type { StoryboardFrame } from '@/types/storyboard'
import type { Card } from '@/types'
import { useStoryboardStore } from '@/store/storyboard'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import Image from 'next/image'
import { getSupabaseClient, isSupabaseConfigured, type SupabaseCharacter } from '@/lib/supabase'
import { buildCharacterSnippet, getCharacterMentionSlug } from '@/lib/characterMentions'
export interface FrameEditModalProps {
  frame: StoryboardFrame
  projectId: string
  onClose: () => void
  onSaved?: (updated: StoryboardFrame) => void
}
const FrameEditModal: React.FC<FrameEditModalProps> = ({ frame, projectId, onClose, onSaved }) => {
  const [draft, setDraft] = useState<StoryboardFrame>({ ...frame })
  const setCards = useStoryboardStore(s => s.setCards)
  const { session, user } = useSupabase()
  const [characters, setCharacters] = useState<SupabaseCharacter[]>([])
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false)
  useEffect(() => {
    if (!projectId || !user?.id) {
      setCharacters([])
      return
    }
    let isMounted = true
    const fetchCharacters = async () => {
      setIsLoadingCharacters(true)

      if (!isSupabaseConfigured()) {
        console.warn('[FrameEditModal] Supabase environment variables are not configured.')
        if (isMounted) {
          setCharacters([])
          setIsLoadingCharacters(false)
        }
        return
      }

      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (!isMounted) return
      if (error) {
        console.warn('[FrameEditModal] Failed to load characters:', error)
        setCharacters([])
      } else {
        setCharacters(data ?? [])
      }
      setIsLoadingCharacters(false)
    }
    fetchCharacters()
    return () => {
      isMounted = false
    }
  }, [projectId, user?.id])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const state = useStoryboardStore.getState()
    const currentCards = state.cards[projectId] || []
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
          }
        : card
    )
    setCards(projectId, updatedCards)
    const cardToPersist = updatedCards.find((c: Card) => c.id === draft.id)
    if (cardToPersist) {
      try {
        const res = await fetch('/api/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            cards: [
              {
                id: cardToPersist.id,
                project_id: cardToPersist.project_id,
                user_id: cardToPersist.user_id,
                type: cardToPersist.type,
                title: cardToPersist.title,
                content: cardToPersist.content,
                user_input: cardToPersist.user_input,
                image_urls: cardToPersist.image_urls,
                selected_image_url: cardToPersist.selected_image_url,
                order_index: cardToPersist.order_index,
                scene_number: cardToPersist.scene_number,
                shot_type: cardToPersist.shot_type,
                dialogue: cardToPersist.dialogue,
                sound: cardToPersist.sound,
                image_prompt: cardToPersist.image_prompt,
                storyboard_status: cardToPersist.storyboard_status,
                shot_description: cardToPersist.shot_description,
                next_card_id: cardToPersist.next_card_id,
                prev_card_id: cardToPersist.prev_card_id,
              },
            ],
          }),
        })
        if (!res.ok) {
          console.warn('⚠️ 메타데이터 저장 실패', await res.text())
        }
      } catch (err) {
        console.warn('⚠️ 메타데이터 저장 중 오류', err)
      }
    }
    onSaved?.(draft)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-gray-900 rounded-xl border border-gray-700 shadow-xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
          <div className="md:w-1/2 w-full bg-gray-900 relative flex items-center justify-center">
            {draft.imageUrl ? (
              <div className="relative w-full h-full">
                <Image src={draft.imageUrl} alt="frame" fill className="object-contain" />
              </div>
            ) : (
              <div className="text-gray-400 text-xs">No image</div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 bg-black/80 text-white rounded-md px-2 py-1 text-[11px] hover:bg-black"
            >
              Close
            </button>
            <div className="absolute bottom-2 left-2 bg-gray-800/80 backdrop-blur px-2 py-0.5 rounded text-[11px] font-light text-white">
              Shot {draft.scene}
            </div>
          </div>
          <div className="md:w-1/2 w-full flex flex-col p-6 overflow-y-auto text-sm">
            <h3 className="text-sm font-semibold mb-4 text-white">Frame editing</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Shot #">
                <input
                  type="number"
                  min={1}
                  value={draft.scene || 1}
                  onChange={e => setDraft(d => ({ ...d, scene: Number(e.target.value) }))}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field label="Shot Description">
                <textarea
                  value={draft.shotDescription || ''}
                  onChange={e => setDraft(d => ({ ...d, shotDescription: e.target.value }))}
                  rows={4}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs resize-y w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field label="Camera Shot">
                <input
                  type="text"
                  value={draft.shot || ''}
                  onChange={e => setDraft(d => ({ ...d, shot: e.target.value }))}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field label="Angle">
                <input
                  type="text"
                  value={draft.angle || ''}
                  onChange={e => setDraft(d => ({ ...d, angle: e.target.value }))}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field label="Background">
                <input
                  type="text"
                  value={draft.background || ''}
                  onChange={e => setDraft(d => ({ ...d, background: e.target.value }))}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field label="Mood/Lighting">
                <input
                  type="text"
                  value={draft.moodLighting || ''}
                  onChange={e => setDraft(d => ({ ...d, moodLighting: e.target.value }))}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field
                label="Image Prompt"
                help="Prompt for generating images separate from Shot Description. Use @mentions to reference project characters."
              >
                <textarea
                  value={draft.imagePrompt || ''}
                  onChange={e => setDraft(d => ({ ...d, imagePrompt: e.target.value }))}
                  rows={4}
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs resize-y font-mono w-full focus:border-gray-500 focus:outline-none"
                />
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
                        className="group flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[11px] text-gray-200 hover:border-gray-500 hover:text-white"
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
                  onChange={e => setDraft(d => ({ ...d, dialogue: e.target.value }))}
                  required
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <Field label="Sound">
                <input
                  type="text"
                  value={draft.sound}
                  onChange={e => setDraft(d => ({ ...d, sound: e.target.value }))}
                  required
                  className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 text-xs hover:border-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded bg-white text-black text-xs hover:bg-gray-200 transition-colors"
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
