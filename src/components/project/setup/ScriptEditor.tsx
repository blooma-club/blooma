'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'

type Mode = 'paste' | 'upload'

type Props = {
  mode: Mode
  setMode: (mode: Mode) => void
  textValue: string
  setTextValue: (value: string) => void
  file: File | null
  fileError: string | null
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  fileRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (event?: React.FormEvent) => void
  onNext: () => void
}

type ChatTurn = {
  id: string
  role: 'user' | 'assistant'
  content: string
  improvedPrompt?: string
  suggestions?: string[]
  createdAt: number
}

export default function ScriptEditor({
  mode,
  setMode,
  textValue,
  setTextValue,
  file,
  fileError,
  onFileChange,
  onDrop,
  fileRef,
  onSubmit,
  onNext,
}: Props) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const setInputValue = (value: string, options?: { advance?: boolean }) => {
    setTextValue(value)
    setTimeout(() => textareaRef.current?.focus(), 0)
    if (options?.advance) {
      handleSend()
    }
  }
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content:
        'Hello! Please describe the image you’re imagining in detail. If you have a preferred mood, style, or camera angle, let me know 😊  I’ll use them to create a richer and more detailed prompt for you.',
      createdAt: Date.now(),
    },
  ])

  void file
  void fileError
  void onFileChange
  void onDrop
  void fileRef

  useEffect(() => {
    if (mode !== 'paste') {
      setMode('paste')
    }
  }, [mode, setMode])

  const characterCount = useMemo(() => textValue.length, [textValue])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (textValue.trim()) {
        handleSend()
      }
    }
  }

  const handleSend = async () => {
    const prompt = textValue.trim()
    if (!prompt || isSending) return

    setIsSending(true)
    setErrorMessage(null)

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: Date.now(),
    }

    const conversation = [...chatMessages, userTurn]
    setChatMessages(conversation)
    setInputValue('')

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...conversation.map(turn => {
              if (turn.role === 'assistant' && turn.improvedPrompt) {
                const suggestionText = (turn.suggestions || []).map(item => `- ${item}`).join('\n')
                return {
                  role: 'assistant',
                  content: `Improved Prompt: ${turn.improvedPrompt}${
                    suggestionText ? `\nSuggestions:\n${suggestionText}` : ''
                  }`,
                }
              }
              return { role: turn.role, content: turn.content }
            }),
            {
              role: 'user',
              content:
                'You are a concise creative director. Rewrite the following prompt into a richer version with specific style, lighting, lens, and background details. After that, provide three short suggestion questions asking if the user would like alternative styles, angles, or moods. Format precisely as:\nImproved Prompt: <text>\nSuggestions:\n- <option 1>\n- <option 2>\n- <option 3>.',
            },
            { role: 'user', content: prompt },
          ],
          useGemini: true,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to refine prompt.')
      }

      const raw = typeof data?.script === 'string' ? data.script : ''
      if (!raw.trim()) {
        throw new Error('AI did not return an improved prompt.')
      }

      const improvedMatch = raw.match(/Improved Prompt:\s*([\s\S]*?)(?:\nSuggestions:|$)/i)
      const suggestionMatch = raw.match(/Suggestions:\s*([\s\S]*)/i)

      const improved = improvedMatch ? improvedMatch[1].trim() : raw.trim()
      const suggestionLines = suggestionMatch
        ? suggestionMatch[1]
            .split(/\n+/)
            .map((line: string) => line.replace(/^[-•]\s*/, '').trim())
            .filter(Boolean)
        : []

      const assistantTurn: ChatTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: raw.trim(),
        improvedPrompt: improved,
        suggestions: suggestionLines.slice(0, 3),
        createdAt: Date.now(),
      }

      setChatMessages(prev => [...prev, assistantTurn])
    } catch (error) {
      console.error('Prompt refinement failed:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to improve prompt. Please try again.'
      )
      setInputValue(prompt)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-h-screen w-full rounded-[30px] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 pb-24 pt-12">
        <div className="mt-24 flex flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-medium text-white/80 shadow-[0_18px_60px_-40px_rgba(255,255,255,0.65)]">
            <Sparkles className="h-4 w-4" /> AI Script Assistant
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            What's your idea today?
          </h1>
        </div>

        <div className="mt-16 w-full max-w-3xl space-y-4">
          {chatMessages.map(turn => {
            if (turn.role === 'user') {
              return (
                <div key={turn.id} className="flex justify-end">
                  <div className="max-w-[75%] rounded-3xl bg-white px-5 py-4 text-right text-sm text-black shadow-[0_18px_60px_-40px_rgba(255,255,255,0.75)]">
                    {turn.content}
                  </div>
                </div>
              )
            }

            const hasImproved = Boolean(turn.improvedPrompt)
            return (
              <div key={turn.id} className="flex justify-start">
                <div className="w-full max-w-[85%] rounded-3xl border border-white/10 bg-black/40 px-6 py-6 text-left text-sm leading-relaxed text-white/85">
                  {hasImproved ? (
                    <>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                        Improved Prompt
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">{turn.improvedPrompt}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setInputValue(turn.improvedPrompt || '', { advance: true })
                          onNext()
                        }}
                        className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/20"
                      >
                        Use this prompt
                      </button>
                      {turn.suggestions && turn.suggestions.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                            Suggestions
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {turn.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setInputValue(suggestion, { advance: true })}
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-white/70">{turn.content}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-20 w-full">
          <div className="mx-auto w-full max-w-3xl rounded-[44px] border border-white/6 bg-white/5 p-[1px] shadow-[0_65px_160px_-90px_rgba(0,0,0,0.85)]">
            <div className="rounded-[42px] bg-black/55 px-10 py-10">
              <div className="mb-4 flex items-center justify-between text-xs text-white/40">
                <span>{characterCount} characters</span>
                <span className="italic">Press ⌘/Ctrl + Enter to skip ahead</span>
              </div>
              <textarea
                ref={textareaRef}
                value={textValue}
                onChange={event => setTextValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your idea. What style do you want? What is background or camera angle?"
                className="h-40 w-full resize-none rounded-[32px] border border-white/8 bg-black/30 px-8 py-6 text-base text-white/85 placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              />
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!textValue.trim() || isSending}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-white/60"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{isSending ? 'Refining…' : 'Send'}</span>
                </button>
              </div>
              {errorMessage && (
                <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
