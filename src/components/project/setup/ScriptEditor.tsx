'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, Edit3 } from 'lucide-react'
import ScriptChatModal from '@/components/project/setup/ScriptChatModal'

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)
  const [chatSessionKey, setChatSessionKey] = useState<number>(() => Date.now())
  const [chatSeedPrompt, setChatSeedPrompt] = useState<string | null>(null)
  const [completedScript, setCompletedScript] = useState<string | null>(null)

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


  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (textValue.trim()) {
        void handleStartChat()
      }
    }
  }

  const handleStartChat = () => {
    const prompt = textValue.trim()
    if (!prompt) return

    setChatSeedPrompt(prompt)
    setTextValue('')
    setIsChatModalOpen(true)
    setChatSessionKey(Date.now())
  }

  const handleCompleteScript = (script: string) => {
    setCompletedScript(script)
    setIsChatModalOpen(false)
  }

  const handleEditScript = () => {
    setChatSeedPrompt(completedScript ?? null)
    setIsChatModalOpen(true)
    setChatSessionKey(Date.now())
  }

  return (
    <>
      <div className="w-full min-h-[70vh] flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-4xl">
          <form onSubmit={onSubmit} className="w-full rounded-[24px] text-white">
            <div className="flex flex-col items-center gap-16 text-center">
              <div className="flex flex-col items-center gap-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-[14px] font-medium text-white/80 shadow-[0_12px_45px_-35px_rgba(255,255,255,0.65)]">
                  <Sparkles className="h-4 w-4" /> AI Script Assistant
                </span>
                <h1 className="text-5xl font-semibold tracking-tight text-white">
                  {completedScript ? 'Your Storyboard Script' : "What's your idea today?"}
                </h1>
                <p className="text-lg text-white/50 max-w-2xl leading-relaxed">
                  {completedScript ? 'Review and edit your script below.' : 'Describe your storyboard idea below.'}
                </p>
              </div>

              <div className="w-full max-w-2xl">
                {completedScript ? (
                  // 완성된 스크립트 표시
                  <div className="rounded-[20px] border border-white/10 bg-black/50 px-4 py-4 shadow-[0_40px_100px_-70px_rgba(0,0,0,0.85)]">
                    <div className="rounded-[12px] border border-white/8 bg-black/40 px-4 py-4 text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                      {completedScript}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleEditScript}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white/80 transition hover:bg-black/40"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit Script
                      </button>
                      <button
                        type="button"
                        onClick={onNext}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                      >
                        Continue to Models
                      </button>
                    </div>
                  </div>
                ) : (
                  // 입력창
                  <div
                    data-testid="script-input-shell"
                    className="group relative rounded-[26px] bg-gradient-to-r from-white/15 via-indigo-400/30 to-white/15 p-[2px] shadow-[0_0_45px_rgba(99,102,241,0.18)] transition-all duration-500 hover:from-white/25 hover:via-indigo-300/40 hover:to-white/25"
                  >
                    {/* Soft glow wrapper keeps the requested beam effect without overpowering the dark theme */}
                    <div className="rounded-[22px] border border-white/12 bg-black/60 px-4 py-4 backdrop-blur-sm transition-colors duration-300 group-hover:border-white/20">
                      <textarea
                        ref={textareaRef}
                        value={textValue}
                        onChange={event => setTextValue(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe your idea..."
                        aria-label="Storyboard idea input"
                        className="h-16 w-full resize-none rounded-[14px] border border-white/10 bg-black/50 px-4 py-3 text-md text-white/85 placeholder:text-white/45 transition focus-visible:outline-none focus-visible:border-blue-200/40 focus-visible:ring-2 focus-visible:ring-blue-300/40"
                      />
                      <div className="mt-3 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleStartChat}
                          disabled={!textValue.trim()}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-white/60"
                          aria-label="Send script idea"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <ScriptChatModal
        key={chatSessionKey}
        open={isChatModalOpen}
        seedPrompt={chatSeedPrompt || ''}
        onClose={() => setIsChatModalOpen(false)}
        onComplete={handleCompleteScript}
        defaultModel="google/gemini-2.5-flash"
      />
    </>
  )
}
