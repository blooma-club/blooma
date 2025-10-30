'use client'

import React from 'react'
import clsx from 'clsx'
import { ChevronDown, Plus, Edit3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import { DEFAULT_MODEL, getImageGenerationModels, getModelsForMode } from '@/lib/fal-ai'

type PromptDockProps = {
  projectId: string
  aspectRatio?: StoryboardAspectRatio
  onAspectRatioChange?: (ratio: StoryboardAspectRatio) => void
  onCreateFrame: (imageUrl: string) => Promise<void>
  selectedShotNumber?: number
  onClearSelectedShot?: () => void
  className?: string
  // Optional external control for mode switching
  mode?: 'generate' | 'edit'
  onModeChange?: (mode: 'generate' | 'edit') => void
  // Reference image URL for edit mode
  referenceImageUrl?: string
}

export const PromptDock: React.FC<PromptDockProps> = props => {
  const {
    projectId,
    aspectRatio = '16:9',
    onCreateFrame,
    selectedShotNumber,
    onClearSelectedShot,
    className,
    mode,
    onModeChange,
    referenceImageUrl,
  } = props
  const [internalMode, setInternalMode] = React.useState<'generate' | 'edit'>('generate')
  const isControlled = typeof mode !== 'undefined'
  const currentMode = isControlled ? (mode as 'generate' | 'edit') : internalMode

  const models = React.useMemo(() => {
    return currentMode === 'edit' ? getModelsForMode('edit') : getImageGenerationModels()
  }, [currentMode])

  const { push: showToast } = useToast()

  const [prompt, setPrompt] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // 모델 ID state - 초기값을 고정값으로 설정
  const [modelId, setModelId] = React.useState<string>(DEFAULT_MODEL)

  // 현재 선택된 모델이 유효한지 확인하고 필요시 업데이트
  const selectedModel = models.find(m => m.id === modelId) || models[0]

  // 모델이 유효하지 않으면 첫 번째 모델로 업데이트
  React.useEffect(() => {
    if (!selectedModel && models.length > 0) {
      setModelId(models[0].id)
    }
  }, [selectedModel, models])

  React.useEffect(() => {
    if (isControlled && mode) {
      setInternalMode(mode)
    }
  }, [isControlled, mode])

  // textarea 높이 자동 조정
  const adjustTextareaHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 높이를 초기화하고 스크롤 높이에 맞춰 조정
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const maxHeight = 128 // max-h-32 (8rem = 128px)

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`
    } else {
      textarea.style.height = `${scrollHeight}px`
    }
  }, [])

  // 텍스트 변경 시 높이 조정
  React.useEffect(() => {
    adjustTextareaHeight()
  }, [prompt, adjustTextareaHeight])

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || submitting) return

    // Edit 모드에서 레퍼런스 이미지가 없으면 토스트 표시
    if (currentMode === 'edit' && !referenceImageUrl) {
      showToast({
        title: 'Reference image required',
        description: 'Edit mode requires a reference image. Please select a frame with an image.',
      })
      return
    }

    setSubmitting(true)
    setError(null)

    // 디버깅을 위한 로그 추가
    console.log('[PromptDock] Submitting with:', {
      prompt: trimmed,
      modelId,
      aspectRatio,
      currentMode,
      referenceImageUrl,
    })

    try {
      // Submit behavior varies by mode; for now both call same endpoint (UI distinction)
      const requestBody: any = {
        prompt: trimmed,
        modelId,
        aspectRatio,
      }

      // Edit 모드일 때 레퍼런스 이미지 추가
      if (currentMode === 'edit' && referenceImageUrl) {
        requestBody.image_url = referenceImageUrl
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success || !json?.imageUrl) {
        let errorMsg = json?.error || `Failed to generate image (HTTP ${res.status})`

        // 특정 에러에 대한 더 명확한 메시지 제공
        if (res.status === 404) {
          const modelName = selectedModel?.name || modelId
          errorMsg = `Model "${modelName}" not found. Please try a different model.`
        } else if (res.status === 400) {
          errorMsg = 'Invalid request. Please check your prompt and try again.'
        } else if (res.status === 429) {
          errorMsg = 'Rate limit exceeded. Please wait a moment and try again.'
        } else if (res.status >= 500) {
          errorMsg = 'Server error. Please try again later.'
        }

        throw new Error(errorMsg)
      }
      await onCreateFrame(json.imageUrl as string)
      setPrompt('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다'
      setError(msg)

      // 에러 발생 시 토스트로도 표시
      showToast({
        title: 'Image generation failed',
        description: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }


  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none',
        // 13인치~23인치: 작은 크기 유지
        'w-[min(400px,90%)]',
        // 24인치부터: 큰 크기로 확장 (1536px 이상 - 24인치 모니터 기준)
        '2xl:w-[min(600px,75%)]',
        className
      )}
      aria-live="polite"
    >
      {/* 메인 입력 컨테이너 */}
      <div className="pointer-events-auto relative">
        {/* 실제 컨텐츠 */}
        <div className="relative rounded-lg border backdrop-blur-md p-3" style={{ backgroundColor: 'hsl(var(--background) / 0.95)', borderColor: 'hsl(var(--border))' }}>
          <div className="flex flex-col gap-2.5">
            {/* 상단: 모드 탭, 배지, 모델 선택 */}
            <div className="flex items-center justify-between gap-2">
              {/* 왼쪽: 탭과 배지 */}
              <div className="flex items-center gap-3 min-w-0">
                <Tabs
                  value={currentMode}
                  onValueChange={v => {
                    const next = v as 'generate' | 'edit'
                    if (!isControlled) setInternalMode(next)
                    onModeChange?.(next)
                  }}
                  className="flex-shrink-0"
                >
                  <TabsList 
                    className="h-9 gap-1 p-1 bg-[#EDEDED] dark:bg-neutral-800" 
                  >
                    <TabsTrigger
                      value="generate"
                      className="px-3 py-1.5 rounded-md h-8 text-sm transition-colors data-[state=active]:bg-background dark:data-[state=active]:bg-[hsl(var(--background))]"
                      title="Generate new image"
                    >
                      <Plus className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="edit"
                      className="px-3 py-1.5 rounded-md h-8 text-sm transition-colors data-[state=active]:bg-background dark:data-[state=active]:bg-[hsl(var(--background))]"
                      title="Edit current image"
                    >
                      <Edit3 className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {typeof selectedShotNumber === 'number' && (
                  <span
                    className="group relative inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap select-none bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] ring-1 ring-[hsl(var(--border))]/60 shadow-sm"
                    role="status"
                    aria-label={`Selected shot ${selectedShotNumber}`}
                  >
                    {currentMode === 'edit' ? 'Edit' : 'Generate'} {selectedShotNumber}
                    {onClearSelectedShot && (
                      <button
                        type="button"
                        onClick={onClearSelectedShot}
                        className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                        aria-label="Clear selection"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                )}
              </div>

              {/* 오른쪽: 모델 선택 */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 min-w-[126px] px-3 text-sm text-neutral-900 dark:text-white"
                    >
                      <span className="truncate text-left">
                        {selectedModel?.name || 'Model'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60 flex-shrink-0 text-current" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-md p-1.5 z-[80]" style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}>
                    {models.map(m => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => {
                          const validModelId = models.find(model => model.id === m.id)
                            ? m.id
                            : models[0]?.id
                          if (validModelId) {
                            setModelId(validModelId)
                          }
                        }}
                        className="rounded-sm px-2.5 py-2 text-sm"
                        style={{ 
                          backgroundColor: modelId === m.id ? 'hsl(var(--accent))' : 'transparent',
                          color: 'hsl(var(--popover-foreground))'
                        }}
                      >
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 중간: 프롬프트 입력 영역 */}
            <div className="flex items-end gap-2 rounded-md border p-2 transition-colors focus-within:ring-2 focus-within:ring-offset-0" style={{ borderColor: 'hsl(var(--input))', backgroundColor: 'hsl(var(--background))' }}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentMode === 'edit' ? 'Modify the image…' : 'Create a scene…'}
                aria-label="prompt input"
                className="w-full bg-transparent text-sm resize-none overflow-y-auto focus:outline-none focus:ring-0"
                style={{ 
                  color: 'hsl(var(--foreground))',
                  minHeight: '1.5rem',
                  maxHeight: '8rem',
                }}
                disabled={submitting}
                rows={1}
              />
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !prompt.trim()}
                className="h-8 w-8 rounded-md p-0 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                aria-label={currentMode === 'edit' ? 'Apply changes' : 'Generate'}
              >
                {submitting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                ) : currentMode === 'edit' ? (
                  <Edit3 className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-md border px-2.5 py-1.5 animate-in fade-in" style={{ borderColor: 'hsl(var(--destructive))', backgroundColor: 'hsl(var(--destructive) / 0.1)' }}>
                <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptDock
