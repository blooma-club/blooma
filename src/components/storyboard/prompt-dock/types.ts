import type { StoryboardAspectRatio } from '@/types/storyboard'

export type ReferenceImage = {
    id: string
    url: string
    type: 'upload' | 'model' | 'background' | 'frame'
    label?: string
}

export type VideoGenerationRequest = {
    modelId: string
    prompt?: string
    startFrameId: string
    endFrameId?: string
    startImageUrl?: string | null
    endImageUrl?: string | null
    duration?: '5' | '10'
}

export type PromptDockProps = {
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
    // 비동기 이미지 생성 콜백 (기다림 없이 다음 요청 가능)
    onStartImageGeneration?: (frameId: string) => void
    onImageGenerated?: (frameId: string, imageUrls: string[]) => void
    onImageGenerationError?: (frameId: string, error: string) => void
}
