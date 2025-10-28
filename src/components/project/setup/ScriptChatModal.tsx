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
  isQuestion?: boolean
  questionNumber?: number
  isFinalScript?: boolean
}

type ScriptChatModalProps = {
  open: boolean
  seedPrompt?: string
  onClose: () => void
  onComplete: (script: string) => void
  defaultModel?: ModelKey
}

const TOTAL_QUESTIONS = 5

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
const STORAGE_KEY = 'blooma_script_conversation'

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<ChatMessage>
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'number'
  )
}

type StoredConversation = {
  messages: ChatMessage[]
  currentQuestionNumber: number
  isScriptReady: boolean
  generatedScript: string
  currentTab: 'conversation' | 'script'
  selectedModel?: ModelKey
  inputValue?: string
  timestamp?: number
}

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
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0)
  const [isScriptReady, setIsScriptReady] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [currentTab, setCurrentTab] = useState<'conversation' | 'script'>('conversation')
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [editedScript, setEditedScript] = useState('')

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

  // Load from localStorage on mount - only when modal opens
  useEffect(() => {
    if (!open) {
      return
    }

    let isInitialized = false
    const initializeConversation = async () => {
      if (isInitialized) return
      isInitialized = true

      // Reset input states
      setInputValue('')
      setErrorMessage(null)
      setModelDropdownOpen(false)

      // Try to load from localStorage first
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData) as StoredConversation
          if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            // Validate and reconstruct messages safely
            const validMessages = parsed.messages.filter(isChatMessage)

            if (validMessages.length > 0) {
              setMessages(validMessages)
              messagesRef.current = validMessages
              setCurrentQuestionNumber(parsed.currentQuestionNumber || 1)
              setIsScriptReady(parsed.isScriptReady || false)
              setGeneratedScript(parsed.generatedScript || '')
              // Default back to the script tab when a completed script exists
              setCurrentTab(parsed.isScriptReady ? 'script' : parsed.currentTab || 'conversation')
              if (typeof parsed.inputValue === 'string') {
                setInputValue(parsed.inputValue)
              }
              const savedModel = parsed.selectedModel
              if (savedModel && AVAILABLE_MODELS[savedModel]) {
                setSelectedModel(savedModel)
                modelRef.current = savedModel
              }
              console.log('✅ Loaded conversation from localStorage')
              return
            }
          }
        } catch (error) {
          console.error('Failed to parse saved conversation:', error)
          localStorage.removeItem(STORAGE_KEY)
        }
      }

      // If no saved data, initialize fresh
      const initialMessages: ChatMessage[] = []

      // Always show first question
      const firstQuestion: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'What are you creating? (e.g., fashion ad, music video, product showcase)',
        createdAt: Date.now(),
        isQuestion: true,
        questionNumber: 1,
      }
      initialMessages.push(firstQuestion)

      // If seedPrompt exists (from onboarding), add it as user's answer to first question
      const trimmedSeed = seedPrompt?.trim()
      if (trimmedSeed && trimmedSeed.length > 0) {
        initialMessages.push({
          id: `user-${Date.now() + 1}`,
          role: 'user',
          content: trimmedSeed,
          createdAt: Date.now() + 1,
        })

        setMessages(initialMessages)
        messagesRef.current = initialMessages
        setCurrentQuestionNumber(1)
        setIsScriptReady(false)
        setGeneratedScript('')
        setCurrentTab('conversation')

        // Automatically get second question from LLM
        setIsSending(true)
        try {
          const response = await fetch('/api/script/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: initialMessages.map(m => ({ role: m.role, content: m.content })),
              model: modelRef.current ?? defaultModel ?? DEFAULT_MODEL_FALLBACK,
              questionMode: true,
            }),
          })

          const data = await response.json()
          if (response.ok && data?.script) {
            const secondQuestion: ChatMessage = {
              id: `assistant-${Date.now() + 2}`,
              role: 'assistant',
              content: data.script,
              createdAt: Date.now() + 2,
              isQuestion: true,
              questionNumber: 2,
            }

            const updatedMessages = [...initialMessages, secondQuestion]
            setMessages(updatedMessages)
            messagesRef.current = updatedMessages
            setCurrentQuestionNumber(2)
          }
        } catch (error) {
          console.error('Failed to get second question:', error)
        } finally {
          setIsSending(false)
        }
      } else {
        setMessages(initialMessages)
        messagesRef.current = initialMessages
        setCurrentQuestionNumber(1)
        setIsScriptReady(false)
        setGeneratedScript('')
        setCurrentTab('conversation')
      }
    }

    void initializeConversation()
  }, [open, seedPrompt, defaultModel])

  // Separate effect for keyboard handler to avoid dependency issues
  useEffect(() => {
    if (!open) return

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
  }, [open, onClose])

  // Auto-save to localStorage whenever conversation state changes
  useEffect(() => {
    if (!open || messages.length === 0) return

    // Debounce the save to avoid excessive writes
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        messages,
        currentQuestionNumber,
        isScriptReady,
        generatedScript,
        currentTab,
        selectedModel,
        inputValue,
        timestamp: Date.now(),
      }

      try {
        // Safely serialize messages for localStorage
        const safeMessages = messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          improvedPrompt: msg.improvedPrompt,
          suggestions: msg.suggestions,
          createdAt: msg.createdAt,
          isQuestion: msg.isQuestion,
          questionNumber: msg.questionNumber,
          isFinalScript: msg.isFinalScript,
        }))

        const safeDataToSave = {
          ...dataToSave,
          messages: safeMessages,
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeDataToSave))
        console.log('💾 Auto-saved conversation to localStorage', {
          messageCount: safeMessages.length,
          questionNumber: dataToSave.currentQuestionNumber,
          isScriptReady: dataToSave.isScriptReady,
        })
      } catch (error) {
        console.error('Failed to save conversation:', error)
        // Clear corrupted data if needed
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch (cleanupError) {
          console.warn('Failed to remove stale conversation from storage:', cleanupError)
        }
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [
    open,
    messages,
    currentQuestionNumber,
    isScriptReady,
    generatedScript,
    currentTab,
    selectedModel,
    inputValue,
  ])

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

  const sendMessage = useCallback(
    async (messageContent: string, options?: { skipInputReset?: boolean }) => {
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
            messages: conversation.map(message => ({
              role: message.role,
              content: message.content,
            })),
            model: modelRef.current ?? defaultModel ?? DEFAULT_MODEL_FALLBACK,
            questionMode: true,
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

        const isQuestion = data?.isQuestion === true
        const questionNumber = data?.questionNumber || 0
        const isFinalScript = data?.isFinalScript === true

        // Update current question number
        if (questionNumber > 0) {
          setCurrentQuestionNumber(questionNumber)
        }

        // Check if this is the final script
        if (isFinalScript) {
          setIsScriptReady(true)
          setGeneratedScript(rawScript)
          // Auto-switch to script tab
          setCurrentTab('script')
        }

        const { improved, suggestions } = parseImprovedPrompt(rawScript)

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: rawScript,
          improvedPrompt: improved,
          suggestions,
          createdAt: Date.now(),
          isQuestion,
          questionNumber,
          isFinalScript,
        }

        const updatedConversation = [...conversation, assistantMessage]
        setMessages(updatedConversation)
        messagesRef.current = updatedConversation
      } catch (error) {
        console.error('Script chat error:', error)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to connect to the AI assistant. Please retry.'
        )
      } finally {
        setIsSending(false)
      }
    },
    [defaultModel, isSending]
  )

  const handleSend = () => {
    if (!inputValue.trim()) return
    void sendMessage(inputValue)
  }

  const handleComplete = () => {
    if (!generatedScript || !isScriptReady) {
      setErrorMessage('Please complete all questions to generate the script first.')
      return
    }

    onComplete(generatedScript)
  }

  const handleClearConversation = () => {
    if (
      confirm('Are you sure you want to start over? This will clear your current conversation.')
    ) {
      localStorage.removeItem(STORAGE_KEY)
      setMessages([])
      setCurrentQuestionNumber(0)
      setIsScriptReady(false)
      setGeneratedScript('')
      setCurrentTab('conversation')
      setInputValue('')
      setErrorMessage(null)

      // Reinitialize
      const firstQuestion: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'What are you creating? (e.g., fashion ad, music video, product showcase)',
        createdAt: Date.now(),
        isQuestion: true,
        questionNumber: 1,
      }
      setMessages([firstQuestion])
      messagesRef.current = [firstQuestion]
      setCurrentQuestionNumber(1)
    }
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
        <div className="border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 text-white">
              <div>
                <span className="text-sm font-semibold">Script Generator</span>
                <span className="text-xs text-white/50 ml-2">AI Consultant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearConversation}
                className="rounded-lg px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Start over"
              >
                Reset
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTabDropdownOpen(open => !open)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white/70 transition hover:bg-black/40"
                >
                  <span>{currentTab === 'conversation' ? 'Conversation' : 'Generated Script'}</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${tabDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {tabDropdownOpen ? (
                  <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border border-white/15 bg-black/90 py-1 shadow-lg z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('conversation')
                        setTabDropdownOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10"
                    >
                      Conversation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('script')
                        setTabDropdownOpen(false)
                      }}
                      disabled={!isScriptReady}
                      className={`block w-full px-3 py-2 text-left text-xs transition ${
                        isScriptReady
                          ? 'text-white/80 hover:bg-white/10'
                          : 'text-white/30 cursor-not-allowed'
                      }`}
                    >
                      Generated Script {isScriptReady && '✓'}
                    </button>
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
        </div>

        {currentTab === 'conversation' ? (
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {messages.map(message => {
              // Parse AI message to separate insight and question
              let insight = null
              let question = null
              let examples = null

              if (message.role === 'assistant' && message.isQuestion) {
                const parts = message.content.split(/\*\*Question:\*\*/i)
                if (parts.length === 2) {
                  // Has insight and question
                  insight = parts[0].replace(/💡/g, '').trim()
                  const questionParts = parts[1].split(/\(Examples?:/i)
                  question = questionParts[0].trim()
                  if (questionParts.length > 1) {
                    examples = questionParts[1].replace(/\)$/, '').trim()
                  }
                } else {
                  // No structured format, show as is
                  question = message.content
                }
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-xl overflow-hidden shadow-sm transition ${
                      message.role === 'user'
                        ? 'bg-white text-black px-4 py-3'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    ) : insight || question ? (
                      <div className="space-y-0">
                        {insight && (
                          <div className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-400 text-base mt-0.5">💡</span>
                              <p className="text-sm text-neutral-300 leading-relaxed">{insight}</p>
                            </div>
                          </div>
                        )}
                        {question && (
                          <div className="px-4 py-3">
                            <div className="mb-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                                Question {message.questionNumber}/{TOTAL_QUESTIONS}
                              </span>
                            </div>
                            <p className="text-base font-medium text-white leading-relaxed mb-2">
                              {question}
                            </p>
                            {examples && (
                              <p className="text-xs text-neutral-400 leading-relaxed">
                                Examples: {examples}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed px-4 py-3">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {isSending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Your Generated Script</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">
                    {(isEditingScript ? editedScript : generatedScript).split('\n').length} lines
                  </span>
                  {!isEditingScript ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedScript(generatedScript)
                        setIsEditingScript(true)
                      }}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/20"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedScript(editedScript)
                          setIsEditingScript(false)
                        }}
                        className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedScript('')
                          setIsEditingScript(false)
                        }}
                        className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                {isEditingScript ? (
                  <textarea
                    value={editedScript}
                    onChange={e => setEditedScript(e.target.value)}
                    className="w-full min-h-[400px] resize-y rounded-md bg-black/40 p-4 text-sm text-neutral-200 leading-relaxed font-mono border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Edit your script here..."
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-neutral-200 leading-relaxed font-mono">
                    {generatedScript}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-white/10 px-4 py-3">
          {errorMessage ? (
            <div className="mb-2 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </div>
          ) : null}

          {currentTab === 'conversation' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/60">AI Model:</span>
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
                    <div className="absolute right-0 bottom-full mb-1 min-w-[200px] rounded-lg border border-white/15 bg-black/90 py-1 shadow-lg z-50">
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
              </div>
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
                    placeholder="Type your answer here..."
                    disabled={isScriptReady}
                    className="h-16 w-full resize-none rounded-md bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !inputValue.trim() || isScriptReady}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-white/60"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">
                Review your generated script and use it when ready
              </span>
              <button
                type="button"
                onClick={handleComplete}
                className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600"
              >
                Use This Script
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
