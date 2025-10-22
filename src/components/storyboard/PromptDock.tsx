"use client"

import React from 'react'
import clsx from 'clsx'
import { ArrowUp, Sparkles, ChevronDown, RefreshCw, Plus, Edit3 } from 'lucide-react'
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
  className?: string
  // Optional external control for mode switching
  mode?: 'generate' | 'edit'
  onModeChange?: (mode: 'generate' | 'edit') => void
  // Reference image URL for edit mode
  referenceImageUrl?: string
}

const ASPECT_RATIO_OPTIONS: StoryboardAspectRatio[] = ['16:9', '4:3', '3:2', '2:3', '3:4', '9:16']

export const PromptDock: React.FC<PromptDockProps> = ({
  projectId,
  aspectRatio = '16:9',
  onAspectRatioChange,
  onCreateFrame,
  selectedShotNumber,
  className,
  mode,
  onModeChange,
  referenceImageUrl,
}) => {
  const [internalMode, setInternalMode] = React.useState<'generate' | 'edit'>('generate')
  const isControlled = typeof mode !== 'undefined'
  const currentMode = isControlled ? (mode as 'generate' | 'edit') : internalMode

  const models = React.useMemo(() => {
    return currentMode === 'edit' ? getModelsForMode('edit') : getImageGenerationModels()
  }, [currentMode])

  const { push: showToast } = useToast()

  const [prompt, setPrompt] = React.useState('')
  const [modelId, setModelId] = React.useState<string>(() => {
    const exists = models.find(m => m.id === DEFAULT_MODEL)
    return exists ? DEFAULT_MODEL : models[0]?.id ?? ''
  })
  const [selectedRatio, setSelectedRatio] = React.useState<StoryboardAspectRatio>(aspectRatio)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // 모델 목록이 변경될 때 현재 선택된 모델이 유효한지 확인
  React.useEffect(() => {
    const currentModelExists = models.find(m => m.id === modelId)
    if (!currentModelExists && models.length > 0) {
      setModelId(models[0].id)
    }
  }, [models, modelId])

  React.useEffect(() => {
    setSelectedRatio(aspectRatio)
  }, [aspectRatio])
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
      aspectRatio: selectedRatio,
      currentMode,
      referenceImageUrl
    })
    
    try {
      // Submit behavior varies by mode; for now both call same endpoint (UI distinction)
      const requestBody: any = { 
        prompt: trimmed, 
        modelId, 
        aspectRatio: selectedRatio 
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

  const selectedModel = models.find(m => m.id === modelId)
  const baseControlTriggerClass =
    'h-9 md:h-10 justify-between rounded-lg border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-900/70 px-3 md:px-4 text-xs md:text-sm text-neutral-800 dark:text-neutral-100 transition-colors hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0'

  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none',
        // 13인치~23인치: 작은 크기 유지
        'w-[min(480px,90%)]',
        // 24인치부터: 큰 크기로 확장 (1536px 이상 - 24인치 모니터 기준)
        '2xl:w-[min(720px,75%)]',
        className
      )}
      aria-live="polite"
    >
      {/* 메인 입력 컨테이너 */}
      <div className="pointer-events-auto relative">
        {/* 배경 그라데이션과 블러 효과 */}
        <div 
          className="absolute inset-0 rounded-2xl blur-xl"
          style={{ backgroundColor: `hsl(var(--glow-bg) / 0.1)` }}
        ></div>
        <div 
          className="absolute inset-0 backdrop-blur-xl rounded-2xl border"
          style={{ 
            backgroundColor: `hsl(var(--glow-bg) / 0.05)`,
            borderColor: `hsl(var(--glow-border) / 0.1)`
          }}
        ></div>
        
        {/* 실제 컨텐츠 */}
        <div className="relative bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-xl p-4 md:p-5">
          <div className="flex flex-col gap-3 md:gap-4">
            {/* 상단: 모드 탭, 배지, 모델/비율 선택 */}
            <div className="flex items-center justify-between gap-3">
              {/* 왼쪽: 탭과 배지 */}
              <div className="flex items-center gap-3 min-w-0">
                <Tabs
                  value={currentMode}
                  onValueChange={(v) => {
                    const next = v as 'generate' | 'edit'
                    if (!isControlled) setInternalMode(next)
                    onModeChange?.(next)
                  }}
                  className="flex-shrink-0"
                >
                  <TabsList className="bg-neutral-100/80 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 h-9 md:h-10 gap-1 p-1 border border-neutral-200/50 dark:border-neutral-700/50">
                    <TabsTrigger 
                      value="generate" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2.5 py-1.5 rounded-md transition-colors data-[state=active]:border-b-2 data-[state=active]:border-blue-500 dark:data-[state=active]:border-blue-400"
                      title="Generate new image"
                    >
                      <Plus className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger 
                      value="edit" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 px-2.5 py-1.5 rounded-md transition-colors data-[state=active]:border-b-2 data-[state=active]:border-purple-500 dark:data-[state=active]:border-purple-400"
                      title="Edit current image"
                    >
                      <Edit3 className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {typeof selectedShotNumber === 'number' && (
                  <span className={clsx(
                    'px-2.5 py-1.5 rounded-md border text-xs font-medium flex-shrink-0 whitespace-nowrap',
                    currentMode === 'edit'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                  )}>
                    {currentMode === 'edit' ? 'Editing' : 'Shot'} {selectedShotNumber}
                  </span>
                )}
              </div>
              
              {/* 오른쪽: 모델과 비율 선택 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={clsx(
                        baseControlTriggerClass, 
                        'min-w-[120px] md:min-w-[140px]',
                        'border-neutral-700/50 hover:border-neutral-600/70'
                      )}
                    >
                      <span className="truncate text-left text-xs md:text-sm">
                        {selectedModel?.name || 'Select model'}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white/95 dark:bg-neutral-900/95 p-1 backdrop-blur-xl z-[80]">
                    {models.map(m => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setModelId(m.id)}
                        className={clsx(
                          'rounded-md px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-100 transition-colors focus:bg-neutral-100 dark:focus:bg-neutral-800 focus:text-neutral-800 dark:focus:text-neutral-100',
                          modelId === m.id && 'bg-neutral-200/60 dark:bg-neutral-700/60'
                        )}
                      >
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={clsx(
                        baseControlTriggerClass,
                        'min-w-[90px] md:min-w-[100px]',
                        'border-neutral-700/50 hover:border-neutral-600/70'
                      )}
                    >
                      <span className="text-xs md:text-sm font-medium">{selectedRatio}</span>
                      <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-44 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white/95 dark:bg-neutral-900/95 p-1 backdrop-blur-xl z-[80]">
                    {ASPECT_RATIO_OPTIONS.map(r => (
                      <DropdownMenuItem
                        key={r}
                        onClick={() => {
                          setSelectedRatio(r)
                          onAspectRatioChange?.(r)
                        }}
                        className={clsx(
                          'rounded-md px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-100 transition-colors focus:bg-neutral-100 dark:focus:bg-neutral-800 focus:text-neutral-800 dark:focus:text-neutral-100',
                          selectedRatio === r && 'bg-neutral-200/60 dark:bg-neutral-700/60'
                        )}
                      >
                        {r}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 중간: 프롬프트 입력 영역 */}
            <div className="group relative isolate">
              <div 
                className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
                style={{ backgroundColor: `hsl(var(--glow-bg) / 0.15)` }}
              ></div>
              <div className="relative flex items-end gap-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-900/80 px-3.5 py-2.5 md:px-4.5 md:py-3 shadow-[0_8px_25px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_25px_-12px_rgba(0,0,0,0.5)] transition-all duration-200 group-focus-within:border-neutral-300/80 dark:group-focus-within:border-neutral-700/100 group-focus-within:bg-neutral-100/90 dark:group-focus-within:bg-neutral-900/90">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentMode === 'edit' ? 'Modify the image…' : 'Create a scene…'}
                  aria-label="prompt input"
                  className="w-full bg-transparent text-sm md:text-base text-neutral-800 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-500 focus:outline-none focus:ring-0 resize-none overflow-y-auto"
                  disabled={submitting}
                  rows={1}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                    minHeight: '1.75rem',
                    maxHeight: '8rem'
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting || !prompt.trim()}
                  className={clsx(
                    'h-8 w-8 rounded-lg p-0 flex items-center justify-center transition-all duration-200 flex-shrink-0 aspect-square',
                    currentMode === 'edit'
                      ? 'bg-purple-500 hover:bg-purple-400 text-white focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-0'
                      : 'bg-blue-500 hover:bg-blue-400 text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0',
                    (submitting || !prompt.trim()) && 'cursor-not-allowed opacity-50'
                  )}
                  aria-label={currentMode === 'edit' ? 'Apply changes' : 'Generate'}
                >
                  {submitting ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white/80"></div>
                  ) : (
                    currentMode === 'edit' ? (
                      <Edit3 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )
                  )}
                </Button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 animate-in fade-in">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptDock


