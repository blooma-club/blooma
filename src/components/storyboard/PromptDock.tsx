"use client"

import React from 'react'
import clsx from 'clsx'
import { ArrowUp, Sparkles, Settings2 } from 'lucide-react'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import { DEFAULT_MODEL, getImageGenerationModels } from '@/lib/fal-ai'

type PromptDockProps = {
  projectId: string
  aspectRatio?: StoryboardAspectRatio
  onAspectRatioChange?: (ratio: StoryboardAspectRatio) => void
  onCreateFrame: (imageUrl: string) => Promise<void>
  className?: string
}

const ASPECT_RATIO_OPTIONS: StoryboardAspectRatio[] = ['16:9', '4:3', '3:2', '2:3', '3:4', '9:16']

export const PromptDock: React.FC<PromptDockProps> = ({
  projectId,
  aspectRatio = '16:9',
  onAspectRatioChange,
  onCreateFrame,
  className,
}) => {
  const models = React.useMemo(() => getImageGenerationModels(), [])

  const [prompt, setPrompt] = React.useState('')
  const [modelId, setModelId] = React.useState<string>(() => {
    const exists = models.find(m => m.id === DEFAULT_MODEL)
    return exists ? DEFAULT_MODEL : models[0]?.id ?? ''
  })
  const [selectedRatio, setSelectedRatio] = React.useState<StoryboardAspectRatio>(aspectRatio)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showSettings, setShowSettings] = React.useState(false)

  React.useEffect(() => {
    setSelectedRatio(aspectRatio)
  }, [aspectRatio])

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, modelId, aspectRatio: selectedRatio }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success || !json?.imageUrl) {
        const msg = json?.error || `Failed to generate image (HTTP ${res.status})`
        throw new Error(msg)
      }
      await onCreateFrame(json.imageUrl as string)
      setPrompt('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const selectedModel = models.find(m => m.id === modelId)

  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(800px,90%)] z-[70] pointer-events-none',
        className
      )}
      aria-live="polite"
    >
      {/* 메인 입력 컨테이너 */}
      <div className="pointer-events-auto relative">
        {/* 배경 그라데이션과 블러 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
        <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10"></div>
        
        {/* 실제 컨텐츠 */}
        <div className="relative bg-neutral-900/95 backdrop-blur-xl rounded-2xl border border-neutral-700/50 shadow-2xl p-4">
          {/* 설정 패널 */}
          {showSettings && (
            <div className="mb-4 p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/30">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Model</label>
                  <select
                    className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id} className="bg-neutral-800">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Aspect Ratio</label>
                  <select
                    className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedRatio}
                    onChange={e => {
                      const next = e.target.value as StoryboardAspectRatio
                      setSelectedRatio(next)
                      onAspectRatioChange?.(next)
                    }}
                  >
                    {ASPECT_RATIO_OPTIONS.map(r => (
                      <option key={r} value={r} className="bg-neutral-800">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 메인 입력 영역 */}
          <div className="flex items-end gap-3">
            {/* 프롬프트 입력 */}
            <div className="flex-1 relative">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the scene you want to create..."
                  className="w-full rounded-xl border border-neutral-600 bg-neutral-800/50 px-4 py-3 pr-12 text-sm text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={submitting}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                      'p-1.5 rounded-lg transition-colors',
                      showSettings 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-700/50'
                    )}
                    aria-label="Toggle settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
            </div>

            {/* 생성 버튼 */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !prompt.trim()}
              className={clsx(
                'flex items-center justify-center w-12 h-12 rounded-xl font-medium transition-all duration-200',
                submitting || !prompt.trim()
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-xl transform hover:scale-105'
              )}
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent"></div>
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default PromptDock


