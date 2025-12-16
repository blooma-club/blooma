import React from 'react'
import { useToast } from '@/components/ui/toast'
import type { CameraPreset } from '@/components/libraries/CameraLibrary'
import type { ModelLibraryAsset } from '@/components/libraries/ModelLibraryDropdown'
import type { BackgroundLibraryAsset } from '@/components/libraries/BackgroundLibraryDropdown'
import { getModelsForMode, getVideoModelsForSelection } from '@/lib/fal-ai'
import type { ReferenceImage, PromptDockProps } from '../types'

export const useDockState = (props: PromptDockProps) => {
    const {
        mode,
        onModeChange,
        referenceImageUrl,
        selectedFrameId,
        videoSelection = [],
    } = props

    const [internalMode, setInternalMode] = React.useState<'generate' | 'edit' | 'video'>('generate')
    const isControlled = typeof mode !== 'undefined'
    const currentMode = isControlled ? (mode as 'generate' | 'edit' | 'video') : internalMode

    const { push: showToast } = useToast()

    const [prompt, setPrompt] = React.useState('')
    const [referenceImages, setReferenceImages] = React.useState<ReferenceImage[]>([])
    const [selectedCameraPreset, setSelectedCameraPreset] = React.useState<CameraPreset | null>(null)
    const [selectedModelAsset, setSelectedModelAsset] = React.useState<ModelLibraryAsset | null>(null)
    const [selectedBackgroundAsset, setSelectedBackgroundAsset] = React.useState<BackgroundLibraryAsset | null>(null)
    const [imageCount, setImageCount] = React.useState(1)
    const [resolution, setResolution] = React.useState<'1K' | '2K' | '4K'>('1K')
    const [duration, setDuration] = React.useState<'5' | '10'>('5')
    const [selectedModelId, setSelectedModelId] = React.useState<string | null>(null)

    // Dropdown states
    const [cameraDropdownOpen, setCameraDropdownOpen] = React.useState(false)
    const [modelDropdownOpen, setModelDropdownOpen] = React.useState(false)
    const [backgroundDropdownOpen, setBackgroundDropdownOpen] = React.useState(false)

    React.useEffect(() => {
        if (isControlled && mode) {
            setInternalMode(mode)
        }
    }, [isControlled, mode])

    // Sync reference images with selections
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

    // Ensure edit mode always has the selected frame's image as the primary reference
    React.useEffect(() => {
        setReferenceImages(prev => {
            const withoutFrame = prev.filter(img => img.type !== 'frame')

            // Only add frame reference if we have a valid image URL
            if (currentMode !== 'edit' || !referenceImageUrl || !selectedFrameId) {
                return withoutFrame
            }

            // Validate that referenceImageUrl is a valid URL or Base64 data URI
            const isValidImageUrl =
                typeof referenceImageUrl === 'string' &&
                referenceImageUrl.trim().length > 0 &&
                (referenceImageUrl.startsWith('http://') ||
                    referenceImageUrl.startsWith('https://') ||
                    referenceImageUrl.startsWith('data:image/') ||
                    referenceImageUrl.startsWith('blob:'))

            if (!isValidImageUrl) {
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

    const modelId = React.useMemo(() => {
        if (selectedModelId) return selectedModelId

        if (currentMode === 'video') {
            return 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'
        }

        if (currentMode === 'edit' || referenceImages.length > 0) {
            return 'fal-ai/nano-banana-pro/edit'
        }

        return 'fal-ai/nano-banana-pro'
    }, [currentMode, referenceImages.length, selectedFrameId, selectedModelId])

    const selectedModel = models.find(m => m.id === modelId) ?? models[0]

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
            setReferenceImages(prev => prev.filter(img => img.id !== id))
        }
    }, [referenceImages])

    const resetAfterGeneration = React.useCallback(() => {
        setReferenceImages([])
        setSelectedModelAsset(null)
        setSelectedBackgroundAsset(null)
        setPrompt('')
    }, [])

    const handleApplyCameraPreset = React.useCallback(
        (preset: CameraPreset) => {
            setSelectedCameraPreset(preset)
        },
        []
    )

    const handleClearCameraPreset = React.useCallback(() => {
        setSelectedCameraPreset(null)
    }, [])

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

    const handleClearModelAsset = React.useCallback(() => {
        setSelectedModelAsset(null)
    }, [])

    const handleClearBackgroundAsset = React.useCallback(() => {
        setSelectedBackgroundAsset(null)
    }, [])

    return {
        currentMode,
        setInternalMode,
        isControlled,
        prompt,
        setPrompt,
        referenceImages,
        setReferenceImages,
        selectedCameraPreset,
        setSelectedCameraPreset,
        selectedModelAsset,
        setSelectedModelAsset,
        selectedBackgroundAsset,
        setSelectedBackgroundAsset,
        imageCount,
        setImageCount,
        resolution,
        setResolution,
        duration,
        setDuration,
        selectedModelId,
        setSelectedModelId,
        cameraDropdownOpen,
        setCameraDropdownOpen,
        modelDropdownOpen,
        setModelDropdownOpen,
        backgroundDropdownOpen,
        setBackgroundDropdownOpen,
        models,
        modelId,
        selectedModel,
        handlePromptImageSelect,
        handleRemoveReferenceImage,
        resetAfterGeneration,
        handleApplyCameraPreset,
        handleClearCameraPreset,
        handleCameraDropdownChange,
        handleModelDropdownChange,
        handleBackgroundDropdownChange,
        handleSelectModelAsset,
        handleSelectBackgroundAsset,
        handleClearModelAsset,
        handleClearBackgroundAsset,
        videoSelection,
    }
}
