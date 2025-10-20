"use client"

import React from 'react'
import clsx from 'clsx'
import { ArrowUp, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import { DEFAULT_MODEL, getImageGenerationModels } from '@/lib/fal-ai'

type PromptDockProps = {
  projectId: string
  aspectRatio?: StoryboardAspectRatio
  onAspectRatioChange?: (ratio: StoryboardAspectRatio) => void
  onCreateFrame: (imageUrl: string) => Promise<void>
  selectedShotNumber?: number
  className?: string
}

const ASPECT_RATIO_OPTIONS: StoryboardAspectRatio[] = ['16:9', '4:3', '3:2', '2:3', '3:4', '9:16']

export const PromptDock: React.FC<PromptDockProps> = ({
  projectId,
  aspectRatio = '16:9',
  onAspectRatioChange,
  onCreateFrame,
  selectedShotNumber,
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
  const baseControlTriggerClass =
    'h-9 justify-between rounded-lg border-neutral-700/60 bg-neutral-900/70 px-3 text-xs text-neutral-100 transition-colors hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0'

  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(640px,85%)] z-[70] pointer-events-none',
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
        <div className="relative bg-neutral-900/95 backdrop-blur-xl rounded-xl border border-neutral-700/50 shadow-xl p-3">
          <div className="flex flex-col gap-2">
            {/* 상단: 배지 행 */}
            <div className="flex items-center gap-1 text-xs text-neutral-200">
              {typeof selectedShotNumber === 'number' && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-600/20 text-blue-200 border border-blue-500/40">Shot {selectedShotNumber}</span>
              )}
            </div>

            {/* 중간: 프롬프트 입력 영역 */}
            <div className="group relative isolate">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"></div>
              <div className="relative flex items-center gap-2 rounded-xl border border-neutral-700/60 bg-neutral-900/80 px-4 py-2.5 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.5)]">
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the scene you want to create..."
                  aria-label="프롬프트 입력"
                  className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-0"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* 하단: 설정 도구 및 전송 버튼 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/60 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={clsx(baseControlTriggerClass, 'min-w-[130px]')}>
                      <span className="truncate text-left">
                        {selectedModel?.name || 'Select model'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-lg border border-neutral-800/60 bg-neutral-900/95 p-1 backdrop-blur-xl">
                    {models.map(m => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setModelId(m.id)}
                        className={clsx(
                          'rounded-md px-2.5 py-1.5 text-xs text-neutral-100 transition-colors focus:bg-neutral-800 focus:text-neutral-100',
                          modelId === m.id && 'bg-neutral-800/80'
                        )}
                      >
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={clsx(baseControlTriggerClass, 'min-w-[100px]')}>
                      <span>{selectedRatio}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 rounded-lg border border-neutral-800/60 bg-neutral-900/95 p-1 backdrop-blur-xl">
                    {ASPECT_RATIO_OPTIONS.map(r => (
                      <DropdownMenuItem
                        key={r}
                        onClick={() => {
                          setSelectedRatio(r)
                          onAspectRatioChange?.(r)
                        }}
                        className={clsx(
                          'rounded-md px-2.5 py-1.5 text-xs text-neutral-100 transition-colors focus:bg-neutral-800 focus:text-neutral-100',
                          selectedRatio === r && 'bg-neutral-800/80'
                        )}
                      >
                        {r}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !prompt.trim()}
                className={clsx(
                  'h-9 rounded-lg bg-blue-500 px-4 text-xs font-semibold text-white shadow-[0_4px_12px_-8px_rgba(59,130,246,0.8)] transition-colors hover:bg-blue-400/90 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0',
                  (submitting || !prompt.trim()) && 'cursor-not-allowed opacity-60'
                )}
                aria-label="Send"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <ArrowUp className="h-4 w-4" />
                    <span>Send</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-900/20 p-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default PromptDock


