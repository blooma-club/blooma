import React from 'react'
import { useToast } from '@/components/ui/toast'
import { useHandleCreditError } from '@/hooks/useHandleCreditError'
import type { PromptDockProps } from '../types'
import type { useDockState } from './useDockState'

type UseDockStateReturn = ReturnType<typeof useDockState>

export const useSubmitAction = (
    props: PromptDockProps,
    state: UseDockStateReturn
) => {
    const {
        projectId,
        aspectRatio = '16:9',
        onCreateFrame,
        onGenerateVideo,
        videoSelection = [],
        onBeforeSubmit,
        selectedFrameId,
        referenceImageUrl,
        // 비동기 이미지 생성 콜백
        onStartImageGeneration,
        onImageGenerated,
        onImageGenerationError,
    } = props

    const {
        currentMode,
        prompt,
        setPrompt,
        referenceImages,
        selectedCameraPreset,
        imageCount,
        resolution,
        duration,
        selectedModel,
        modelId,
        resetAfterGeneration,
    } = state

    const { handleCreditError } = useHandleCreditError()
    const { push: showToast } = useToast()

    // submitting은 Video 모드에서만 사용 (이미지는 비동기 처리)
    const [submitting, setSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const mergePromptWithPreset = (current: string, addition: string) => {
        const trimmedAddition = addition.trim()
        if (!trimmedAddition) return current
        const trimmedCurrent = current.trim()
        if (!trimmedCurrent) return trimmedAddition
        if (trimmedCurrent.includes(trimmedAddition)) return trimmedCurrent
        return `${trimmedCurrent}\n${trimmedAddition}`.trim()
    }

    const handleApplyGeneratedImage = React.useCallback(
        async (imageUrl: string) => {
            await onCreateFrame(imageUrl)
            resetAfterGeneration()
            setError(null)
        },
        [onCreateFrame, resetAfterGeneration]
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

            const videoCount =
                Array.isArray(videoSelection) && videoSelection.length > 0
                    ? videoSelection.length
                    : selectedFrameId
                        ? 1
                        : 0

            if (!selectedModel?.id) {
                const message = 'Select a model to generate a video.'
                setError(message)
                showToast({ title: 'Select a model', description: message })
                return
            }
            if (videoCount === 0) {
                const message = 'Select at least one frame.'
                setError(message)
                showToast({ title: 'Select frame', description: message })
                return
            }

            setSubmitting(true)
            setError(null)

            try {
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
                    endFrameId: videoCount >= 2 && end ? (end.id as string) : (undefined as unknown as string),
                    startImageUrl: start?.imageUrl ?? null,
                    endImageUrl: videoCount >= 2 ? end?.imageUrl ?? null : null,
                    duration,
                } as any)

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

        if (currentMode === 'edit' && !referenceImageUrl) {
            showToast({
                title: 'Reference image required',
                description: 'Edit mode requires a reference image. Please select a frame with an image.',
            })
            return
        }

        // 비동기 이미지 생성 모드: 즉시 프롬프트 초기화하고 백그라운드에서 생성
        const targetFrameId = selectedFrameId || `new-${Date.now()}`
        const finalPrompt = selectedCameraPreset
            ? mergePromptWithPreset(trimmed, selectedCameraPreset.prompt)
            : trimmed

        const requestBody: any = {
            prompt: finalPrompt,
            modelId,
            aspectRatio,
            numImages: imageCount,
            resolution,
            isGenerateMode: currentMode === 'generate',
        }

        if (referenceImages.length > 0) {
            requestBody.imageUrls = referenceImages.map(img => img.url)
        }

        if (currentMode === 'edit' && referenceImageUrl) {
            requestBody.image_url = referenceImageUrl
        }

        // 즉시 UI 초기화 (다음 요청 가능)
        setPrompt('')
        resetAfterGeneration()
        setError(null)

        // 로딩 상태 시작 알림
        if (onStartImageGeneration && selectedFrameId) {
            onStartImageGeneration(selectedFrameId)
        }

        // 비동기로 이미지 생성 (await 없이)
        generateImageAsync(requestBody, targetFrameId, finalPrompt)
    }

    // 비동기 이미지 생성 함수
    const generateImageAsync = async (
        requestBody: any,
        targetFrameId: string,
        finalPrompt: string
    ) => {
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            })
            const json = await res.json().catch(() => ({}))

            if (!res.ok) {
                if (handleCreditError(json)) {
                    onImageGenerationError?.(targetFrameId, 'Credit error')
                    return
                }

                let errorMsg =
                    json?.error || json?.data?.error || `Failed to generate image (HTTP ${res.status})`

                if (res.status === 404) {
                    errorMsg = `Model not found. Please try a different model.`
                } else if (res.status === 400) {
                    errorMsg = 'Invalid request. Please check your prompt and try again.'
                } else if (res.status === 429) {
                    errorMsg = 'Rate limit exceeded. Please wait a moment and try again.'
                } else if (res.status >= 500) {
                    errorMsg = 'Server error. Please try again later.'
                }

                throw new Error(errorMsg)
            }

            const imageUrl = json?.data?.imageUrl || json?.imageUrl
            const responseImageUrls = json?.data?.imageUrls || json?.imageUrls
            const allImages = Array.isArray(responseImageUrls)
                ? responseImageUrls.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0)
                : imageUrl ? [imageUrl] : []

            if (!json?.success || allImages.length === 0) {
                throw new Error(json?.error || json?.data?.error || 'Failed to generate image')
            }

            // 비동기 콜백이 있으면 사용, 없으면 기존 방식 (첫 번째 이미지 적용)
            if (onImageGenerated && selectedFrameId) {
                onImageGenerated(selectedFrameId, allImages)
                showToast({
                    title: 'Image generated',
                    description: allImages.length > 1
                        ? `${allImages.length} images saved to history`
                        : 'Image applied to frame',
                })
            } else {
                // 기존 방식: 첫 번째 이미지 적용
                await handleApplyGeneratedImage(allImages[0])
            }
        } catch (e) {
            if (handleCreditError(e)) {
                onImageGenerationError?.(targetFrameId, 'Credit error')
                return
            }

            const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다'
            setError(msg)

            onImageGenerationError?.(targetFrameId, msg)

            showToast({
                title: 'Image generation failed',
                description: msg,
            })
        }
    }

    return {
        submitting,
        error,
        handleSubmit,
        handleApplyGeneratedImage,
    }
}
