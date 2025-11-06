'use client'

import React from 'react'
import clsx from 'clsx'
import { ChevronDown, Plus, Edit3, X, ImagePlus, Video } from 'lucide-react'
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
import { DEFAULT_MODEL, getModelsForMode, isImageToImageModel, getVideoModelsForSelection } from '@/lib/fal-ai'

type VideoGenerationRequest = {
  modelId: string
  prompt?: string
  startFrameId: string
  endFrameId?: string
  startImageUrl?: string | null
  endImageUrl?: string | null
}

type PromptDockProps = {
  projectId: string
  aspectRatio?: StoryboardAspectRatio
  onAspectRatioChange?: (ratio: StoryboardAspectRatio) => void
  onCreateFrame: (imageUrl: string) => Promise<void>
  selectedShotNumber?: number
  selectedFrameId?: string
  onClearSelectedShot?: () => void
  className?: string
  // Optional external control for mode switching
  mode?: 'generate' | 'edit' | 'video'
  onModeChange?: (mode: 'generate' | 'edit' | 'video') => void
  // Reference image URL for edit mode
  referenceImageUrl?: string
  onGenerateVideo?: (request: VideoGenerationRequest) => Promise<void>
  // External video selection (up to two frames when in video mode)
  videoSelection?: Array<{ id: string; shotNumber?: number; imageUrl?: string | null }>
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
    selectedFrameId,
    onGenerateVideo,
    videoSelection = [],
  } = props
  const [internalMode, setInternalMode] = React.useState<'generate' | 'edit' | 'video'>('generate')
  const isControlled = typeof mode !== 'undefined'
  const currentMode = isControlled ? (mode as 'generate' | 'edit' | 'video') : internalMode

  const { push: showToast } = useToast()

  const [prompt, setPrompt] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  // Start/End 수동 선택 로직 제거됨 (Grid 멀티선택 사용)

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

  const [promptImageDataUrl, setPromptImageDataUrl] = React.useState<string | null>(null)

  const usingImageToImage =
    currentMode !== 'video' && (currentMode === 'edit' || Boolean(promptImageDataUrl))

  // 비디오 모드 보조 상태 제거됨

  const models = React.useMemo(() => {
    if (currentMode === 'video') {
      const count = Array.isArray(videoSelection) && videoSelection.length > 0
        ? videoSelection.length
        : (selectedFrameId ? 1 : 0)
      return getVideoModelsForSelection(count)
    }
    if (usingImageToImage) {
      return getModelsForMode('edit')
    }
    return getModelsForMode('generate')
  }, [currentMode, usingImageToImage, videoSelection, selectedFrameId])

  // Start/End 수동 선택 핸들러 제거됨

  // 모델 ID state - 초기값을 고정값으로 설정
  const [modelId, setModelId] = React.useState<string>(DEFAULT_MODEL)

  // 현재 선택된 모델이 유효한지 확인하고 필요시 업데이트
  const matchedModel = models.find(m => m.id === modelId)
  const selectedModel = matchedModel ?? models[0]

  // 모델이 유효하지 않으면 현재 모드의 첫 번째 모델로 업데이트
  React.useEffect(() => {
    if (!matchedModel && selectedModel) {
      setModelId(selectedModel.id)
    }
  }, [matchedModel, selectedModel?.id])

  // Start/End Chip UI 관련 클래스 제거됨

  const handlePromptImageSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        showToast({
          title: 'Unsupported file',
          description: 'Please choose an image file.',
        })
        event.target.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setPromptImageDataUrl(result)
          if (!isImageToImageModel(modelId)) {
            const fallbackModel = getModelsForMode('edit')[0]
            if (fallbackModel) {
              setModelId(fallbackModel.id)
            }
          }
        } else {
          showToast({
            title: 'Image load failed',
            description: 'Unable to read the selected image.',
          })
        }
      }
      reader.onerror = () => {
        showToast({
          title: 'Image load failed',
          description: 'Unable to read the selected image.',
        })
      }
      reader.readAsDataURL(file)
      event.target.value = ''
    },
    [modelId, showToast]
  )

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (submitting) return

    if (currentMode === 'video') {
      if (!onGenerateVideo) {
        showToast({
          title: 'Video generation unavailable',
          description: 'No video handler is configured for this project.',
        })
        return
      }

      const count = videoCount
      if (!selectedModel?.id) {
        const message = 'Select a model to generate a video.'
        setError(message)
        showToast({ title: 'Select a model', description: message })
        return
      }
      if (count === 0) {
        const message = 'Select at least one frame.'
        setError(message)
        showToast({ title: 'Select frame', description: message })
        return
      }

      setSubmitting(true)
      setError(null)

      try {
        const start = (Array.isArray(videoSelection) && videoSelection.length > 0)
          ? videoSelection[0]
          : (selectedFrameId ? { id: selectedFrameId, imageUrl: referenceImageUrl ?? null } : undefined)
        const end = (Array.isArray(videoSelection) && videoSelection.length > 1) ? videoSelection[1] : undefined
        await onGenerateVideo({
          modelId: selectedModel.id,
          prompt: trimmed.length > 0 ? trimmed : undefined,
          startFrameId: start?.id as string,
          endFrameId: count >= 2 && end ? (end.id as string) : (undefined as unknown as string),
          startImageUrl: start?.imageUrl ?? null,
          endImageUrl: count >= 2 ? end?.imageUrl ?? null : null,
        })
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Failed to generate video with the selected frames.'
        setError(msg)
        showToast({
          title: 'Video generation failed',
          description: msg,
        })
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!trimmed) return

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
      attachedImage: usingImageToImage && promptImageDataUrl ? 'inline-data-url' : null,
    })

    try {
      const requestBody: any = {
        prompt: trimmed,
        modelId,
        aspectRatio,
      }

      if (promptImageDataUrl) {
        requestBody.imageUrls = [promptImageDataUrl]
      }

      if (currentMode === 'edit' && referenceImageUrl) {
        requestBody.image_url = referenceImageUrl
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await res.json().catch(() => ({}))
      
      // API 응답 형식: { success: true, data: { imageUrl: ... } }
      const imageUrl = json?.data?.imageUrl || json?.imageUrl
      
      if (!res.ok || !json?.success || !imageUrl) {
        let errorMsg = json?.error || json?.data?.error || `Failed to generate image (HTTP ${res.status})`

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
      await onCreateFrame(imageUrl as string)
      setPrompt('')
      setPromptImageDataUrl(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다'
      setError(msg)

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

  const isVideoMode = currentMode === 'video'
  const videoCount = Array.isArray(videoSelection) && videoSelection.length > 0
    ? videoSelection.length
    : (isVideoMode && selectedFrameId ? 1 : 0)
  const buttonDisabled =
    submitting ||
    (isVideoMode
      ? (videoCount === 1 ? !selectedModel : videoCount === 2 ? !selectedModel : true)
      : !prompt.trim())

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
        <div
          className="relative rounded-lg border border-border bg-background/95 backdrop-blur-md p-3 shadow-lg"
        >
          <div className="flex flex-col gap-2.5">
            {/* 상단: 모드 탭, 배지, 모델 선택 */}
            <div className="flex items-center justify-between gap-2">
              {/* 왼쪽: 탭과 배지 */}
              <div className="flex items-center gap-3 min-w-0">
                <Tabs
                  value={currentMode}
                  onValueChange={v => {
                    const next = v as 'generate' | 'edit' | 'video'
                    if (!isControlled) setInternalMode(next)
                    onModeChange?.(next)
                  }}
                  className="flex-shrink-0"
                >
                  <TabsList className="h-9 gap-1 p-1 bg-muted">
                    <TabsTrigger
                      value="generate"
                      className="px-3 py-1.5 rounded-md h-8 text-sm transition-colors data-[state=active]:bg-background"
                      title="Generate new image"
                    >
                      <Plus className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="edit"
                      className="px-3 py-1.5 rounded-md h-8 text-sm transition-colors data-[state=active]:bg-background"
                      title="Edit current image"
                    >
                      <Edit3 className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="video"
                      className="px-3 py-1.5 rounded-md h-8 text-sm transition-colors data-[state=active]:bg-background"
                      title="Generate video"
                    >
                      <Video className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {currentMode === 'video' ? (
                  (Array.isArray(videoSelection) && videoSelection.length > 0) ? (
                    <span
                      className="group relative inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap select-none bg-muted text-muted-foreground ring-1 ring-border/60 shadow-sm"
                      role="status"
                      aria-label={
                        videoCount === 1
                          ? `Video ${videoSelection[0]?.shotNumber ?? ''}`
                          : `Start ${videoSelection[0]?.shotNumber ?? ''} -> End ${videoSelection[1]?.shotNumber ?? ''}`
                      }
                    >
                      {videoCount === 1 ? (
                        <>Video {videoSelection[0]?.shotNumber ?? ''}</>
                      ) : (
                        <>Start {videoSelection[0]?.shotNumber ?? ''} -&gt; End {videoSelection[1]?.shotNumber ?? ''}</>
                      )}
                    </span>
                  ) : (
                    selectedFrameId && typeof selectedShotNumber === 'number' ? (
                      <span
                        className="group relative inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap select-none bg-muted text-muted-foreground ring-1 ring-border/60 shadow-sm"
                        role="status"
                        aria-label={`Video ${selectedShotNumber}`}
                      >
                        <>Video {selectedShotNumber}</>
                      </span>
                    ) : null
                  )
                ) : (
                  typeof selectedShotNumber === 'number' && (
                    <span
                      className="group relative inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap select-none bg-muted text-muted-foreground ring-1 ring-border/60 shadow-sm"
                      role="status"
                      aria-label={`Selected ${currentMode} shot ${selectedShotNumber}`}
                    >
                      {currentMode === 'edit' ? 'Edit' : 'Generate'} {selectedShotNumber}
                      {onClearSelectedShot && (
                        <button
                          type="button"
                          onClick={onClearSelectedShot}
                          className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground border border-border shadow-sm hover:bg-accent hover:text-accent-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                          aria-label="Clear selection"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  )
                )}
              </div>

              {/* 오른쪽: 모델 선택 */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 min-w-[126px] px-3 text-sm"
                    >
                      <span className="truncate text-left">{selectedModel?.name || 'Model'}</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60 flex-shrink-0 text-current" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 rounded-md p-1.5 z-[80] border border-border bg-popover text-popover-foreground"
                  >
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
                        className={clsx(
                          'rounded-sm px-2.5 py-2 text-sm',
                          modelId === m.id && 'bg-accent text-accent-foreground'
                        )}
                      >
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 중간: 프롬프트 입력 영역 */}
            <div
              className="flex items-center gap-2 rounded-md border border-input bg-background p-2 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0"
            >
              {currentMode !== 'video' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePromptImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="h-8 w-8 rounded-md p-0 flex items-center justify-center flex-shrink-0"
                    aria-label="Add reference image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </>
              )}
              {currentMode !== 'video' && promptImageDataUrl && (
                <div className="relative group overflow-hidden rounded-md ring-1 ring-border bg-muted/30 animate-in fade-in">
                  <img
                    src={promptImageDataUrl}
                    alt="Prompt reference preview"
                    className="h-10 w-10 md:h-12 md:w-12 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPromptImageDataUrl(null)}
                    className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground border border-border shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Remove reference image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentMode === 'edit'
                    ? 'Modify the image…'
                    : currentMode === 'video'
                    ? 'Describe the video direction… (optional)'
                    : 'Create a scene…'
                }
                aria-label="prompt input"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none overflow-y-auto focus:outline-none focus:ring-0 min-h-6 max-h-32"
                disabled={submitting}
                rows={1}
              />
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={buttonDisabled}
                className="h-8 w-8 rounded-md p-0 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                aria-label={
                  currentMode === 'edit'
                    ? 'Apply changes'
                    : currentMode === 'video'
                    ? 'Generate video'
                    : 'Generate'
                }
              >
                {submitting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                ) : currentMode === 'video' ? (
                  <Video className="h-3.5 w-3.5" />
                ) : currentMode === 'edit' ? (
                  <Edit3 className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 px-2.5 py-1.5 animate-in fade-in">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptDock
