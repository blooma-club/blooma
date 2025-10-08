'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Send, X, ChevronDown } from 'lucide-react'
import { AVAILABLE_MODELS, type ModelKey } from '@/lib/openrouter'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  improvedPrompt?: string
  suggestions?: string[]
  createdAt: number
}

type ScriptChatModalProps = {
  open: boolean
  seedPrompt?: string
  onClose: () => void
  onComplete: (script: string) => void
  defaultModel?: ModelKey
}

const GREETING_MESSAGE =
  "Hello! Let's craft a production-ready storyboard script together. Share your idea or describe the scene you're imagining. I'll help refine it with visual, camera, and mood details."

const parseImprovedPrompt = (raw: string) => {
  const improvedMatch = raw.match(/Improved Prompt:\s*([\s\S]*?)(?:\nSuggestions:|$)/i)
  const suggestionMatch = raw.match(/Suggestions:\s*([\s\S]*)/i)

  const improved = improvedMatch ? improvedMatch[1].trim() : raw.trim()
  const suggestionLines = suggestionMatch
    ? suggestionMatch[1]
        .split(/\n+/)
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean)
    : []

  return {
    improved,
    suggestions: suggestionLines.slice(0, 3),
  }
}

const DEFAULT_MODEL_FALLBACK: ModelKey = 'google/gemini-2.5-flash'

export default function ScriptChatModal({
  open,
  seedPrompt,
  onClose,
  onComplete,
  defaultModel = DEFAULT_MODEL_FALLBACK,
}: ScriptChatModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelKey>(defaultModel)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)

  const messagesRef = useRef<ChatMessage[]>([])
  const modelRef = useRef<ModelKey>(defaultModel)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    modelRef.current = selectedModel
  }, [selectedModel])

  useEffect(() => {
    setSelectedModel(defaultModel)
  }, [defaultModel])

  useEffect(() => {
    if (!open) {
      return
    }

    const greeting: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: GREETING_MESSAGE,
      createdAt: Date.now(),
    }

    setMessages([greeting])
    messagesRef.current = [greeting]
    setInputValue('')
    setErrorMessage(null)
    setSelectedModel(defaultModel ?? DEFAULT_MODEL_FALLBACK)
    setModelDropdownOpen(false)

    const trimmedSeed = seedPrompt?.trim()
    if (trimmedSeed && trimmedSeed.length > 0) {
      void sendMessage(trimmedSeed, { skipInputReset: true })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, seedPrompt, defaultModel, onClose])

  useEffect(() => {
    if (open) {
      // 포커스 이동
      const timeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [open])

  const visibleModels = useMemo(() => Object.entries(AVAILABLE_MODELS), [])

  const sendMessage = useCallback(async (
    messageContent: string,
    options?: { skipInputReset?: boolean }
  ) => {
    const trimmed = messageContent.trim()
    if (!trimmed || isSending) {
      return
    }

    setIsSending(true)
    setErrorMessage(null)

    if (!options?.skipInputReset) {
      setInputValue('')
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    }

    const base = messagesRef.current
    const conversation = [...base, userMessage]
    setMessages(conversation)
    messagesRef.current = conversation

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation.map(message => ({ role: message.role, content: message.content })),
          model: modelRef.current ?? defaultModel ?? DEFAULT_MODEL_FALLBACK,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate script.')
      }

      const rawScript = typeof data?.script === 'string' ? data.script.trim() : ''
      if (!rawScript) {
        throw new Error('AI returned an empty response. Please try again.')
      }

      const { improved, suggestions } = parseImprovedPrompt(rawScript)

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: rawScript,
        improvedPrompt: improved,
        suggestions,
        createdAt: Date.now(),
      }

      const updatedConversation = [...conversation, assistantMessage]
      setMessages(updatedConversation)
      messagesRef.current = updatedConversation
    } catch (error) {
      console.error('Script chat error:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to connect to the AI assistant. Please retry.'
      )
    } finally {
      setIsSending(false)
    }
  }, [defaultModel, isSending])

  const handleSend = () => {
    if (!inputValue.trim()) return
    void sendMessage(inputValue)
  }

  const handleComplete = () => {
    const lastAssistantMessage = [...messagesRef.current]
      .reverse()
      .find(message => message.role === 'assistant')

    if (!lastAssistantMessage) {
      setErrorMessage('No AI response to save yet. Try sending a prompt.')
      return
    }

    const script = lastAssistantMessage.improvedPrompt || lastAssistantMessage.content
    onComplete(script)
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="flex w-full max-w-2xl max-h-[82vh] flex-col rounded-[20px] border border-white/10 bg-black/50 shadow-[0_40px_100px_-60px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-semibold">Script Chat</span>
            <span className="text-xs text-white/50">LLM Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(open => !open)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white/70 transition hover:bg-black/40"
              >
                <span>{AVAILABLE_MODELS[selectedModel]?.name ?? 'Custom Model'}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {modelDropdownOpen ? (
                <div className="absolute right-0 top-full mt-1 min-w-[200px] rounded-lg border border-white/15 bg-black/90 py-1 shadow-lg">
                  {visibleModels.map(([key, model]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedModel(key as ModelKey)
                        setModelDropdownOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10"
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-[10px] uppercase tracking-wide text-white/40">
                        {model.provider}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm transition ${
                  message.role === 'user' ? 'bg-white text-black' : 'bg-white/10 text-white'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.improvedPrompt && (
                  <div className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-white/80">
                    <div className="mb-1 font-semibold uppercase tracking-wide text-white/60">
                      Improved Script
                    </div>
                    <div className="whitespace-pre-wrap">{message.improvedPrompt}</div>
                  </div>
                )}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 text-xs text-white/70">
                    <div className="mb-1 font-semibold uppercase tracking-wide text-white/50">
                      Suggestions
                    </div>
                    <ul className="space-y-1">
                      {message.suggestions.map((suggestion, index) => (
                        <li key={`${message.id}-suggestion-${index}`} className="leading-snug">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          {errorMessage ? (
            <div className="mb-2 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <textarea
                ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Add more detail, request changes, or ask for variations..."
                className="h-16 w-full resize-none rounded-md bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !inputValue.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-white/60"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-white/40">
              Using model: {AVAILABLE_MODELS[selectedModel]?.name ?? selectedModel}
            </span>
            <button
              type="button"
              onClick={handleComplete}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-600/40"
            >
              Use This Script
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


