'use client'

import React from 'react'
import clsx from 'clsx'
import { useAuth } from '@clerk/nextjs'
import { Plus, Edit3, X, ImagePlus, Video, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useHandleCreditError } from '@/hooks/useHandleCreditError'
import { useToast } from '@/components/ui/toast'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import { getModelsForMode, getVideoModelsForSelection } from '@/lib/fal-ai'
import CameraLibrary, { type CameraPreset } from '@/components/storyboard/libraries/CameraLibrary'
import ModelLibraryDropdown, { type ModelLibraryAsset } from '@/components/storyboard/libraries/ModelLibraryDropdown'
import BackgroundLibraryDropdown, {
  type BackgroundLibraryAsset,
} from '@/components/storyboard/libraries/BackgroundLibraryDropdown'
import ImagePreviewModal from '@/components/storyboard/ImagePreviewModal'

const mergePromptWithPreset = (current: string, addition: string) => {
  const trimmedAddition = addition.trim()
  if (!trimmedAddition) return current
  const trimmedCurrent = current.trim()
  if (!trimmedCurrent) return trimmedAddition
  if (trimmedCurrent.includes(trimmedAddition)) return trimmedCurrent
  return `${trimmedCurrent}\n${trimmedAddition}`.trim()
}

type ReferenceImage = {
  id: string
  url: string
  type: 'upload' | 'model' | 'background' | 'frame'
  label?: string
}

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
  // Callback before submitting (for landing page flow)
  // Returns false to cancel submission, true/void to continue
  // Can receive prompt text for passing to next page
  onBeforeSubmit?: (prompt: string) => Promise<boolean | void>
}

export const PromptDock: React.FC<PromptDockProps> = props => {
  const {
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
    onBeforeSubmit,
  } = props
  const [internalMode, setInternalMode] = React.useState<'generate' | 'edit' | 'video'>('generate')
  const isControlled = typeof mode !== 'undefined'
  const currentMode = isControlled ? (mode as 'generate' | 'edit' | 'video') : internalMode

  // useProjectCharacters removed as ModelLibraryDropdown handles fetching

  const { handleCreditError } = useHandleCreditError()
  const { push: showToast } = useToast()

  const [prompt, setPrompt] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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

  // 통합된 참조 이미지 관리 (최대 3장)
  const [referenceImages, setReferenceImages] = React.useState<ReferenceImage[]>([])
  const [selectedCameraPreset, setSelectedCameraPreset] = React.useState<CameraPreset | null>(null)
  const [selectedModelAsset, setSelectedModelAsset] = React.useState<ModelLibraryAsset | null>(null)
  const [selectedBackgroundAsset, setSelectedBackgroundAsset] = React.useState<BackgroundLibraryAsset | null>(null)
  const [imageCount, setImageCount] = React.useState(1)
  const [resolution, setResolution] = React.useState<'1K' | '2K' | '4K'>('1K')
  const [duration, setDuration] = React.useState<'5' | '10'>('5')
  const [imagePreview, setImagePreview] = React.useState<string[] | null>(null)
  const [selectedModelId, setSelectedModelId] = React.useState<string | null>(null)

  // 드롭다운 열림 상태 관리
  const [cameraDropdownOpen, setCameraDropdownOpen] = React.useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = React.useState(false)
  const [backgroundDropdownOpen, setBackgroundDropdownOpen] = React.useState(false)

  // Model/Background 선택 시 참조 이미지 배열에 추가
  React.useEffect(() => {
    setReferenceImages(prev => {
      const updated = prev.filter(
        img => img.type !== 'model' && img.type !== 'background'
      )
      
      if (selectedModelAsset) {
        updated.push({
          id: `model-${selectedModelAsset.id}`,
          url: selectedModelAsset.imageUrl,
          type: 'model',
          label: selectedModelAsset.name,
        })
      }
      
      if (selectedBackgroundAsset) {
        updated.push({
          id: `background-${selectedBackgroundAsset.id}`,
          url: selectedBackgroundAsset.imageUrl,
          type: 'background',
          label: selectedBackgroundAsset.name,
        })
      }
      
      return updated.slice(0, 3)
    })
  }, [selectedModelAsset, selectedBackgroundAsset])

  const handleApplyCameraPreset = React.useCallback(
    (preset: CameraPreset) => {
      setSelectedCameraPreset(preset)
      // 프롬프트 입력창에는 표시하지 않고, API 요청 시에만 백그라운드로 포함
    },
    []
  )

  const handleClearCameraPreset = React.useCallback(() => {
    setSelectedCameraPreset(null)
  }, [])

  // 드롭다운 열림/닫힘 핸들러 (하나가 열리면 다른 것들은 닫힘)
  const handleCameraDropdownChange = React.useCallback((open: boolean) => {
    setCameraDropdownOpen(open)
    if (open) {
      setModelDropdownOpen(false)
      setBackgroundDropdownOpen(false)
    }
  }, [])

  const handleModelDropdownChange = React.useCallback((open: boolean) => {
    setModelDropdownOpen(open)
    if (open) {
      setCameraDropdownOpen(false)
      setBackgroundDropdownOpen(false)
    }
  }, [])

  const handleBackgroundDropdownChange = React.useCallback((open: boolean) => {
    setBackgroundDropdownOpen(open)
    if (open) {
      setCameraDropdownOpen(false)
      setModelDropdownOpen(false)
    }
  }, [])

  const handleSelectModelAsset = React.useCallback((asset: ModelLibraryAsset) => {
    setSelectedModelAsset(asset)
  }, [])

  const handleSelectBackgroundAsset = React.useCallback((asset: BackgroundLibraryAsset) => {
    setSelectedBackgroundAsset(asset)
  }, [])

  const handleRemoveReferenceImage = React.useCallback((id: string) => {
    const image = referenceImages.find(img => img.id === id)
    if (!image || image.type === 'frame') {
      return
    }

    if (image.type === 'model') {
      setSelectedModelAsset(null)
    } else if (image.type === 'background') {
      setSelectedBackgroundAsset(null)
    } else {
      // 업로드한 이미지 제거
      setReferenceImages(prev => prev.filter(img => img.id !== id))
    }
  }, [referenceImages])

  // Ensure edit mode always has the selected frame's image as the primary reference
  React.useEffect(() => {
    setReferenceImages(prev => {
      const withoutFrame = prev.filter(img => img.type !== 'frame')

      if (currentMode !== 'edit' || !referenceImageUrl || !selectedFrameId) {
        return withoutFrame
      }

      const frameReference: ReferenceImage = {
        id: `frame-${selectedFrameId}`,
        url: referenceImageUrl,
        type: 'frame',
        label: 'Selected frame',
      }

      return [frameReference, ...withoutFrame].slice(0, 3)
    })
  }, [currentMode, referenceImageUrl, selectedFrameId])

  const handleClearModelAsset = React.useCallback(() => {
    setSelectedModelAsset(null)
  }, [])

  const handleClearBackgroundAsset = React.useCallback(() => {
    setSelectedBackgroundAsset(null)
  }, [])

  const resetAfterGeneration = React.useCallback(() => {
    setReferenceImages([])
    setSelectedModelAsset(null)
    setSelectedBackgroundAsset(null)
    setPrompt('')
  }, [])

  const handleApplyGeneratedImage = React.useCallback(
    async (imageUrl: string) => {
      await onCreateFrame(imageUrl)
      resetAfterGeneration()
      setError(null)
    },
    [onCreateFrame, resetAfterGeneration]
  )

  const handlePreviewApply = React.useCallback(
    async (imageUrl: string) => {
      await handleApplyGeneratedImage(imageUrl)
      setImagePreview(null)
    },
    [handleApplyGeneratedImage]
  )

  const usingImageToImage =
    currentMode !== 'video' && (currentMode === 'edit' || referenceImages.length > 0)

  const models = React.useMemo(() => {
    if (currentMode === 'video') {
      const count =
        Array.isArray(videoSelection) && videoSelection.length > 0
          ? videoSelection.length
          : selectedFrameId
            ? 1
            : 0
      return getVideoModelsForSelection(count)
    }
    if (usingImageToImage) {
      return getModelsForMode('edit')
    }
    return getModelsForMode('generate')
  }, [currentMode, usingImageToImage, videoSelection, selectedFrameId])

  // 모델 자동 선택 로직
  const modelId = React.useMemo(() => {
    if (selectedModelId) return selectedModelId

    if (currentMode === 'video') {
      // 비디오 모델은 getVideoModelsForSelection 등으로 처리되지만, fallback으로 유지
      return 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video' 
    }
    
    if (currentMode === 'edit' || referenceImages.length > 0 || (selectedFrameId && currentMode === 'generate')) {
      return 'fal-ai/nano-banana-pro/edit'
    }
    
    return 'fal-ai/nano-banana-pro'
  }, [currentMode, referenceImages.length, selectedFrameId, selectedModelId])

  const selectedModel = models.find(m => m.id === modelId) ?? models[0]

  // Image Selection for Upload
  const handlePromptImageSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      const currentCount = referenceImages.length
      const available = Math.max(0, 3 - currentCount)
      const toRead = Array.from(files)
        .filter(f => f.type.startsWith('image/'))
        .slice(0, available)

      if (toRead.length === 0) {
        showToast({
          title: 'Unsupported file',
          description: 'Please choose an image file.',
        })
        event.target.value = ''
        return
      }

      let completed = 0
      const results: ReferenceImage[] = []
      toRead.forEach((file, index) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result
          if (typeof result === 'string') {
            results.push({
              id: `upload-${Date.now()}-${index}`,
              url: result,
              type: 'upload',
            })
          }
          completed++
          if (completed === toRead.length) {
            setReferenceImages(prev => {
              const merged = [...prev, ...results].slice(0, 3)
              return merged
            })
          }
        }
        reader.onerror = () => {
          completed++
          if (completed === toRead.length) {
            if (results.length === 0) {
              showToast({
                title: 'Image load failed',
                description: 'Unable to read the selected image.',
              })
            }
          }
        }
        reader.readAsDataURL(file)
      })

      event.target.value = ''
    },
    [referenceImages.length, showToast]
  )

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (submitting) return

    if (currentMode !== 'video' && !trimmed) return

    // Allow landing page to handle authentication/project creation before proceeding
    if (onBeforeSubmit) {
      const shouldContinue = await onBeforeSubmit(trimmed)
      if (shouldContinue === false) {
        // Landing page handled navigation or blocked submission; reset local prompt
        setPrompt('')
        return
      }
    }

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
        // 카메라 프리셋 프롬프트를 백그라운드로 병합 (사용자 입력창에는 표시하지 않음)
        const finalVideoPrompt = selectedCameraPreset
          ? mergePromptWithPreset(trimmed, selectedCameraPreset.prompt)
          : trimmed

        const start = (Array.isArray(videoSelection) && videoSelection.length > 0)
          ? videoSelection[0]
          : (selectedFrameId ? { id: selectedFrameId, imageUrl: referenceImageUrl ?? null } : undefined)
        const end = (Array.isArray(videoSelection) && videoSelection.length > 1) ? videoSelection[1] : undefined

        await onGenerateVideo({
          modelId: selectedModel.id,
          prompt: finalVideoPrompt.length > 0 ? finalVideoPrompt : undefined,
          startFrameId: start?.id as string,
          endFrameId: count >= 2 && end ? (end.id as string) : (undefined as unknown as string),
          startImageUrl: start?.imageUrl ?? null,
          endImageUrl: count >= 2 ? end?.imageUrl ?? null : null,
          duration,
        } as any)
        
        // 비디오 생성 성공 후 프롬프트 초기화
        setPrompt('')
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

    try {
      // 카메라 프리셋 프롬프트를 백그라운드로 병합 (사용자 입력창에는 표시하지 않음)
      const finalPrompt = selectedCameraPreset
        ? mergePromptWithPreset(trimmed, selectedCameraPreset.prompt)
        : trimmed

      const requestBody: any = {
        prompt: finalPrompt,
        modelId,
        aspectRatio,
        numImages: imageCount,
        resolution,
      }

      if (referenceImages.length > 0) {
        requestBody.imageUrls = referenceImages.map(img => img.url)
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
      
      // Check if the response indicates insufficient credits
      if (!res.ok) {
        // Try to handle credit errors - if it returns true, a popup was shown
        if (handleCreditError(json)) {
          return // Popup was shown, no need to show additional error
        }

        let errorMsg =
          json?.error || json?.data?.error || `Failed to generate image (HTTP ${res.status})`
          
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
      
      // API 응답 형식: { success: true, data: { imageUrl: ... } }
      const imageUrl = json?.data?.imageUrl || json?.imageUrl
      const responseImageUrls = json?.data?.imageUrls || json?.imageUrls
      const allImages = Array.isArray(responseImageUrls)
        ? responseImageUrls.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0)
        : []
      
      if (!json?.success || (!imageUrl && allImages.length === 0)) {
        throw new Error(json?.error || json?.data?.error || 'Failed to generate image')
      }
      
      if (allImages.length > 1) {
        setImagePreview(allImages)
      } else {
        await handleApplyGeneratedImage(imageUrl as string)
      }
    } catch (e) {
      // Try to handle credit errors - if it returns true, a popup was shown
      if (handleCreditError(e)) {
        return // Popup was shown, no need to show additional error
      }

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
  const videoCount =
    Array.isArray(videoSelection) && videoSelection.length > 0
      ? videoSelection.length
      : isVideoMode && selectedFrameId
        ? 1
        : 0

  // Check if selected video frames have images
  const hasValidVideoFrames = React.useMemo(() => {
    if (!isVideoMode) return true
    
    // Check external video selection
    if (Array.isArray(videoSelection) && videoSelection.length > 0) {
      // If any selected frame doesn't have an imageUrl, it's invalid
      return videoSelection.every(frame => Boolean(frame.imageUrl))
    }
    
    // Check single selected frame
    if (selectedFrameId) {
      // If we only have an ID but don't know if it has an image here, 
      // we might need to rely on the parent or verify differently.
      // However, videoSelection seems to be the main source of truth for video frames in StoryboardPage.
      // Let's check how videoSelection is populated. It includes imageUrl.
      // So if videoSelection is empty but selectedFrameId is set, it might be a transition state.
      // But typically videoSelection should be populated if video mode is active and frames are selected.
      
      // Fallback: If we just have selectedFrameId (e.g. initial click), we might not have the image URL here easily 
      // without passing it. PromptDock receives `videoSelection` which has `imageUrl`.
      return true // Optimistic default if using single ID, but usually videoSelection is used.
    }
    
    return false
  }, [isVideoMode, videoSelection, selectedFrameId])

  const buttonDisabled =
    submitting ||
    (isVideoMode
      ? videoCount === 0 || !hasValidVideoFrames
        ? true
        : videoCount === 1
          ? !selectedModel
          : videoCount === 2
            ? !selectedModel
            : true
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
      <div className="pointer-events-auto relative flex flex-col gap-3">
          {/* 상단: 모드 탭, 배지, 모델 선택 */}
          <div className="flex items-center justify-between gap-3">
            {/* 왼쪽: 탭과 배지 */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Tabs
                value={currentMode}
                onValueChange={v => {
                  const next = v as 'generate' | 'edit' | 'video'
                  if (!isControlled) setInternalMode(next)
                  onModeChange?.(next)
                }}
                className="flex-shrink-0"
              >
                <TabsList className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 backdrop-blur-md p-1 shadow-sm supports-[backdrop-filter]:bg-background/40">
                  <TabsTrigger
                    value="generate"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground hover:bg-muted/50"
                    title="Generate new image"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">Generate</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="edit"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground hover:bg-muted/50"
                    title="Edit current image"
                  >
                    <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">Edit</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="video"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground hover:bg-muted/50"
                    title="Generate video"
                  >
                    <Video className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">Video</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

            {/* 배지 */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {currentMode === 'video' ? (
                Array.isArray(videoSelection) && videoSelection.length > 0 ? (
                  <span
                    className={clsx(
                      "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap select-none border transition-all duration-300",
                      "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20 backdrop-blur-sm shadow-sm hover:bg-violet-500/20"
                    )}
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
                      <>
                        Start {videoSelection[0]?.shotNumber ?? ''} -&gt; End{' '}
                        {videoSelection[1]?.shotNumber ?? ''}
                      </>
                    )}
                    {onClearSelectedShot && (
                      <button
                        type="button"
                        onClick={onClearSelectedShot}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-300 transition-colors focus:outline-none ml-1"
                        aria-label="Clear selection"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                ) : (
                  selectedFrameId && typeof selectedShotNumber === 'number' ? (
                    <span
                      className={clsx(
                        "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap select-none border transition-all duration-300",
                        "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20 backdrop-blur-sm shadow-sm hover:bg-violet-500/20"
                      )}
                      role="status"
                      aria-label={`Video ${selectedShotNumber}`}
                    >
                      <>Video {selectedShotNumber}</>
                      {onClearSelectedShot && (
                        <button
                          type="button"
                          onClick={onClearSelectedShot}
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-300 transition-colors focus:outline-none ml-1"
                          aria-label="Clear selection"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </span>
                  ) : null
                )
              ) : (
                typeof selectedShotNumber === 'number' && (
                  <span
                    className={clsx(
                      "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap select-none border transition-all duration-300",
                      "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20 backdrop-blur-sm shadow-sm hover:bg-violet-500/20"
                    )}
                    role="status"
                    aria-label={`Selected ${currentMode} shot ${selectedShotNumber}`}
                  >
                    {currentMode === 'edit' ? 'Edit' : 'Generate'} {selectedShotNumber}
                    {onClearSelectedShot && (
                      <button
                        type="button"
                        onClick={onClearSelectedShot}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-300 transition-colors focus:outline-none ml-1"
                        aria-label="Clear selection"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                )
              )}
            </div>
          </div>

            {/* 오른쪽: AI 모델 선택 */}
            <div className="flex items-center gap-2 flex-shrink-0">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-auto px-3 justify-between gap-2 rounded-xl bg-background/50 hover:bg-accent/50 border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm min-w-[140px]"
                      title="Select AI Model"
                    >
                      <span className="text-xs font-medium text-foreground/90 truncate max-w-[120px]">
                        {selectedModel?.name || 'Select Model'}
                      </span>
                      <Check className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="z-[95] w-[200px] rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl p-1.5 text-popover-foreground shadow-2xl"
                    sideOffset={8}
                    align="end"
                  >
                    <div className="px-2 py-1.5 mb-1 border-b border-border/30">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">AI Model</span>
                    </div>
                    {models.map(model => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={clsx(
                          'rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5 justify-between',
                          modelId === model.id
                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                            : 'hover:bg-violet-500/5 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className="truncate">{model.name}</span>
                        {modelId === model.id && <Check className="h-3 w-3 ml-2 flex-shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>

          {/* 중간: 프롬프트 입력 영역 (참조 이미지 미리보기 + 텍스트 입력 + 하단 컨트롤) */}
          <div className="rounded-2xl border border-violet-200/20 dark:border-violet-800/30 bg-background/80 backdrop-blur-xl p-3 flex flex-col gap-3 transition-all focus-within:ring-1 focus-within:ring-violet-500/20 focus-within:ring-offset-0 focus-within:border-violet-500/30 focus-within:bg-background/95 shadow-[0_8px_32px_-8px_rgba(139,92,246,0.15)] dark:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.25)] supports-[backdrop-filter]:bg-background/60">
            {/* 상단: 참조 이미지 미리보기 (업로드/모델/배경 통합, 최대 3장) */}
            {currentMode !== 'video' && referenceImages.length > 0 && (
              <div className="flex items-center gap-2.5 px-1 pt-1">
                {referenceImages.map(img => (
                  <div key={img.id} className="relative group overflow-hidden rounded-xl border border-border/20 bg-muted/20 shadow-sm hover:scale-105 transition-transform duration-300">
                    <img
                      src={img.url}
                      alt={img.label || `Reference ${img.type}`}
                      className="h-14 w-14 md:h-16 md:w-16 object-cover"
                    />
                    {img.label && (
                      <span className="absolute left-0 top-0 rounded-br-lg bg-black/50 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
                        {img.type === 'model'
                          ? 'Model'
                          : img.type === 'background'
                          ? 'BG'
                          : img.type === 'frame'
                          ? 'Frame'
                          : 'Ref'}
                      </span>
                    )}
                    {img.type !== 'frame' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReferenceImage(img.id)}
                        className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/90 hover:bg-black/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        aria-label={`Remove ${img.type} reference`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 상단: 텍스트 입력 */}
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
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none overflow-y-auto focus:outline-none focus:ring-0 min-h-[3rem] max-h-32 leading-relaxed px-1"
              disabled={submitting}
              rows={1}
            />
            
            {/* 하단: 컨트롤 바 (이미지 업로드, 카메라, 배경, 모델, 제출) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 이미지 업로드 */}
              {currentMode !== 'video' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePromptImageSelect}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || referenceImages.length >= 3}
                    className="h-9 w-9 rounded-lg p-0 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Add reference image"
                  >
                    <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </>
              )}
              <CameraLibrary
                selectedPreset={selectedCameraPreset}
                onSelect={handleApplyCameraPreset}
                onClear={handleClearCameraPreset}
                open={cameraDropdownOpen}
                onOpenChange={handleCameraDropdownChange}
              />
              <ModelLibraryDropdown
                selectedAsset={selectedModelAsset}
                onSelect={handleSelectModelAsset}
                onClear={handleClearModelAsset}
                open={modelDropdownOpen}
                onOpenChange={handleModelDropdownChange}
              />
              <BackgroundLibraryDropdown
                selectedAsset={selectedBackgroundAsset}
                onSelect={handleSelectBackgroundAsset}
                onClear={handleClearBackgroundAsset}
                open={backgroundDropdownOpen}
                onOpenChange={handleBackgroundDropdownChange}
              />

              <div className="ml-auto flex items-center gap-2">
                {/* 해상도/Duration 선택 */}
                {currentMode === 'video' ? (
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 w-auto px-2.5 justify-center rounded-xl bg-background/30 hover:bg-accent/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300"
                        title="Video Duration"
                      >
                        <span className="text-xs font-medium text-foreground/90">{duration}s</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="z-[95] w-auto min-w-[80px] rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl p-1.5 text-popover-foreground shadow-2xl"
                      sideOffset={8}
                    >
                      <div className="px-2 py-1.5 mb-1 border-b border-border/30">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Time</span>
                      </div>
                      {(['5', '10'] as const).map(sec => (
                        <DropdownMenuItem
                          key={sec}
                          onClick={() => setDuration(sec)}
                          className={clsx(
                            'rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5 justify-between',
                            duration === sec
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                              : 'hover:bg-violet-500/5 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {sec}s
                          {duration === sec && <Check className="h-3 w-3 ml-2" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 w-auto px-2.5 justify-center rounded-xl bg-background/30 hover:bg-accent/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300"
                        title="Resolution"
                      >
                        <span className="text-xs font-medium text-foreground/90">{resolution}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="z-[95] w-auto min-w-[80px] rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl p-1.5 text-popover-foreground shadow-2xl"
                      sideOffset={8}
                    >
                      <div className="px-2 py-1.5 mb-1 border-b border-border/30">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Res</span>
                      </div>
                      {(['1K', '2K', '4K'] as const).map(res => (
                        <DropdownMenuItem
                          key={res}
                          onClick={() => setResolution(res)}
                          className={clsx(
                            'rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5 justify-between',
                            resolution === res
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                              : 'hover:bg-violet-500/5 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {res}
                          {resolution === res && <Check className="h-3 w-3 ml-2" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="glass"
                        className="h-9 px-3 text-xs font-semibold tracking-wide rounded-xl bg-background/30 border-border/20"
                        aria-label={`Generate ×${imageCount}`}
                      >
                        ×{imageCount}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[95] w-24 p-1.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl">
                      {[1, 2, 3, 4].map(count => (
                        <DropdownMenuItem
                          key={count}
                          onClick={() => setImageCount(count)}
                          className={clsx(
                            "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5",
                            imageCount === count
                              ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                              : "hover:bg-violet-500/5 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          ×{count}
                          {imageCount === count && <Check className="h-3 w-3" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </>
                )}

              {/* 제출 버튼 */}
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={buttonDisabled}
                variant="violet"
                className={clsx(
                  "h-9 w-9 rounded-lg p-0 flex items-center justify-center relative overflow-hidden",
                  buttonDisabled && "bg-muted text-muted-foreground shadow-none hover:bg-muted hover:shadow-none hover:scale-100 opacity-50 cursor-not-allowed"
                )}
                aria-label={
                  currentMode === 'edit'
                    ? 'Apply changes'
                    : currentMode === 'video'
                    ? 'Generate video'
                    : 'Generate'
                }
              >
                {submitting ? (
                  <>
                    <div className="absolute inset-0 bg-black/10 dark:bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent relative z-10"></div>
                  </>
                ) : currentMode === 'video' ? (
                  <Video className="h-3.5 w-3.5" strokeWidth={2} />
                ) : currentMode === 'edit' ? (
                  <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 animate-in fade-in ring-1 ring-destructive/20">
            <p className="text-xs text-destructive font-medium">{error}</p>
          </div>
        )}
      </div>
      {imagePreview && (
        <ImagePreviewModal
          images={imagePreview}
          onApply={handlePreviewApply}
          onClose={() => setImagePreview(null)}
        />
      )}
    </div>
  )
}

export default PromptDock
