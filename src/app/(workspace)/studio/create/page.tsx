'use client'

import React, { useState, useRef, useMemo } from 'react'
import Image from 'next/image'
import { Loader2, Image as ImageIcon, X } from 'lucide-react'
import { useUserCredits } from '@/hooks/useUserCredits'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { useHandleCreditError } from '@/hooks/useHandleCreditError'
import { ensureR2Url } from '@/lib/infra/storage-client'
import type { ModelLibraryAsset } from '@/components/libraries/ModelLibraryDropdown'
import type { LocationLibraryAsset } from '@/components/libraries/LocationLibraryDropdown'
import { ModelSection } from './_components/ModelSection'
import { OutfitSection } from './_components/OutfitSection'
import { LocationSection } from './_components/LocationSection'
import { CompositionControls } from './_components/CompositionControls'
import { GenerationPanel } from './_components/GenerationPanel'
import { PreviewPanel } from './_components/PreviewPanel'

// View presets for camera angles
const COMPOSITION_PRESETS: Array<{
  id: string
  label: string
  title: string
  prompt: string
  image?: string
}> = [
  {
    id: 'front',
    label: 'Front',
    title: 'Front',
    prompt: 'front view, facing camera directly',
    image: '/front-view-v2-thumb.png',
  },
  {
    id: 'behind',
    label: 'Behind',
    title: 'Back',
    prompt: 'back view, facing away from camera',
    image: '/behind-view-v2-thumb.png',
  },
  {
    id: 'side',
    label: 'Side',
    title: 'Side',
    prompt: 'side profile view, facing left or right',
    image: '/side-view-v2-thumb.png',
  },
  {
    id: 'quarter',
    label: 'Quarter',
    title: '3/4',
    prompt: 'three-quarter view, 45 degree angle',
    image: '/front-side-view-v2-thumb.png',
  },
]

type CompositionPreset = (typeof COMPOSITION_PRESETS)[number]
const VIEW_TYPES = ['front', 'behind', 'side', 'quarter'] as const
type ViewType = (typeof VIEW_TYPES)[number]

const MAX_TOTAL_IMAGES = 8
const accordionCardClass =
  'rounded-2xl border border-transparent bg-white shadow-sm ring-1 ring-border/50 overflow-hidden'
const glassCardClass =
  'rounded-2xl border border-transparent bg-white/60 backdrop-blur-md shadow-sm ring-1 ring-border/50 overflow-hidden'

export default function FittingRoomCreatePage() {
  const { refresh: refreshCredits, subscriptionTier } = useUserCredits()
  const { push: toast } = useToast()
  const { handleCreditError } = useHandleCreditError()

  // Assets state
  const [selectedModels, setSelectedModels] = useState<ModelLibraryAsset[]>([])
  const [selectedLocations, setSelectedLocations] = useState<LocationLibraryAsset[]>([])
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')

  // UI state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isLocationLibraryOpen, setIsLocationLibraryOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isLocationAddMenuOpen, setIsLocationAddMenuOpen] = useState(false)
  const [isModelAutoMode, setIsModelAutoMode] = useState(false)

  // Generation settings
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K')
  const [numImages, setNumImages] = useState<1 | 2 | 4>(2)
  const [selectedCameraPreset, setSelectedCameraPreset] = useState<CompositionPreset>(
    COMPOSITION_PRESETS[0]
  )
  const [shotSize, setShotSize] = useState<string>('medium-shot')
  const [modelTier, setModelTier] = useState<'standard' | 'pro'>('standard')

  // Generation state
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const modelFileInputRef = useRef<HTMLInputElement>(null)
  const locationFileInputRef = useRef<HTMLInputElement>(null)
  const outfitFileInputRef = useRef<HTMLInputElement>(null)

  // Hydration fix
  const [isMounted, setIsMounted] = useState(false)
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Computed values
  const isFreeTier = !subscriptionTier || subscriptionTier === 'free'
  const isSmallBrands = subscriptionTier === 'Small Brands'
  const isPro4kRestricted = isFreeTier || isSmallBrands
  const availableProResolutions = useMemo(
    () => (isPro4kRestricted ? ['2K'] : ['2K', '4K']),
    [isPro4kRestricted]
  )
  const estimatedCredits = useMemo(() => {
    const baseCost = modelTier === 'pro' ? (resolution === '4K' ? 100 : 50) : 15
    return baseCost * numImages
  }, [modelTier, resolution, numImages])

  if (!isMounted) return null

  // Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const currentCount = selectedModels.length + referenceImages.length
    const remainingSlots = MAX_TOTAL_IMAGES - currentCount

    if (remainingSlots <= 0) {
      toast({ title: 'Limit reached', description: `Maximum ${MAX_TOTAL_IMAGES} images allowed` })
      return
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots)
    const newImages = filesToAdd.map(file => URL.createObjectURL(file))
    setReferenceImages(prev => [...prev, ...newImages])

    if (files.length > remainingSlots) {
      toast({
        title: 'Some images skipped',
        description: `Only ${remainingSlots} more image(s) could be added`,
      })
    }
  }

  const removeReferenceImage = (index: number) => {
    const urlToRevoke = referenceImages[index]
    if (urlToRevoke?.startsWith('blob:')) URL.revokeObjectURL(urlToRevoke)
    setReferenceImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleModelSelect = (asset: ModelLibraryAsset) => setSelectedModels([asset])
  const handleLocationSelect = (asset: LocationLibraryAsset) => setSelectedLocations([asset])

  const handleGenerate = async () => {
    if (!isModelAutoMode && selectedModels.length === 0) {
      toast({ title: 'Model required', description: 'Please select a model or enable Auto mode' })
      return
    }
    if (referenceImages.length === 0) {
      toast({ title: 'Outfit required', description: 'Add at least 1 outfit reference image' })
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const selectedModel = selectedModels[0] || null
      const selectedLocation = selectedLocations[0] || null

      const uploadOptions = { projectId: 'studio', frameId: crypto.randomUUID() }
      const modelImagePromise = selectedModel?.imageUrl
        ? ensureR2Url(selectedModel.imageUrl, uploadOptions)
        : Promise.resolve(null)
      const locationImagePromise = selectedLocation?.imageUrl
        ? ensureR2Url(selectedLocation.imageUrl, uploadOptions)
        : Promise.resolve(null)
      const outfitImagesPromise = Promise.all(
        referenceImages.map(url => ensureR2Url(url, uploadOptions))
      )

      const [modelImageUrlPublic, outfitImageUrlsPublic, locationImageUrlPublic] =
        await Promise.all([modelImagePromise, outfitImagesPromise, locationImagePromise])

      const userPromptBase = prompt?.trim() || ''
      const viewType: ViewType = VIEW_TYPES.includes(selectedCameraPreset.id as ViewType)
        ? (selectedCameraPreset.id as ViewType)
        : 'front'
      const promptContextLines = [
        viewType ? `View: ${viewType}` : '',
        shotSize ? `Shot: ${shotSize}` : '',
      ].filter(Boolean)
      const userPromptWithContext = [userPromptBase, ...promptContextLines]
        .filter(Boolean)
        .join('\n')
      let finalPrompt = userPromptWithContext

      // Generate refined prompt
      try {
        const promptResponse = await fetch('/api/studio/refine-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: userPromptWithContext,
            modelImageUrl: isModelAutoMode ? undefined : modelImageUrlPublic || undefined,
            outfitImageUrls: outfitImageUrlsPublic,
            locationImageUrl: locationImageUrlPublic || undefined,
            isModelAutoMode,
          }),
        })

        const promptResult = await promptResponse.json()
        const generatedPrompt = promptResult.data?.prompt

        if (promptResponse.ok && generatedPrompt) {
          finalPrompt = generatedPrompt
        }
      } catch (promptError) {
        console.error('Prompt generation failed:', promptError)
      }

      const selectedModelId =
        modelTier === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'

      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModelId,
          prompt: finalPrompt,
          modelImageUrl: isModelAutoMode ? undefined : modelImageUrlPublic || undefined,
          outfitImageUrls: outfitImageUrlsPublic,
          locationImageUrl: locationImageUrlPublic || undefined,
          resolution,
          numImages,
          viewType,
          cameraPrompt: selectedCameraPreset.prompt,
          shotSize,
          isModelAutoMode,
        }),
      })

      const result = await response.json()

      if (!result.success && handleCreditError(result)) return

      const generatedImageUrls = [
        ...(result.data?.imageUrls ?? []),
        ...(result.data?.imageUrl ? [result.data.imageUrl] : []),
        ...(result.imageUrl ? [result.imageUrl] : []),
      ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      const uniqueGeneratedImageUrls = Array.from(new Set(generatedImageUrls))

      const firstImageUrl = uniqueGeneratedImageUrls[0] || null

      if (result.success && firstImageUrl) {
        setGeneratedImages(uniqueGeneratedImageUrls)
        setPreviewImage(firstImageUrl)

        // Save to database
        const batchId = crypto.randomUUID()
        await Promise.allSettled(
          uniqueGeneratedImageUrls.map(imgUrl =>
            fetch('/api/studio/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: imgUrl,
                group_id: batchId,
                prompt: finalPrompt || null,
                model_id: selectedModelId,
                source_model_url: selectedModel?.imageUrl || null,
                source_outfit_urls: outfitImageUrlsPublic.length > 0 ? outfitImageUrlsPublic : null,
                generation_params: null,
              }),
            })
          )
        )

        refreshCredits()
      } else {
        const errorObj = result.error || result.data?.error
        const errorMessage =
          typeof errorObj === 'object' && errorObj?.message
            ? errorObj.message
            : typeof errorObj === 'string'
              ? errorObj
              : 'Failed to generate image'
        setError(errorMessage)
        toast({ title: 'Generation failed', description: errorMessage })
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError('An error occurred while generating the image')
      toast({ title: 'Error', description: 'An error occurred while generating the image' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 bg-white flex flex-col">
      <div className="px-4 py-2 flex-1 flex">
        <Card className="bg-secondary/60 p-4 rounded-3xl flex-1 w-full">
          <div className="flex flex-col lg:flex-row items-start justify-center gap-6">
            {/* Left Panel: Assets */}
            <div className="order-2 lg:order-1 w-full lg:w-72 flex flex-col gap-3 shrink-0">
              <Accordion
                type="multiple"
                defaultValue={['model', 'outfit', 'location']}
                className="w-full space-y-3"
              >
                <AccordionItem value="model">
                  <ModelSection
                    selectedModels={selectedModels}
                    setSelectedModels={setSelectedModels}
                    isModelAutoMode={isModelAutoMode}
                    setIsModelAutoMode={setIsModelAutoMode}
                    isLibraryOpen={isLibraryOpen}
                    setIsLibraryOpen={setIsLibraryOpen}
                    isAddMenuOpen={isAddMenuOpen}
                    setIsAddMenuOpen={setIsAddMenuOpen}
                    modelFileInputRef={modelFileInputRef}
                    handleModelSelect={handleModelSelect}
                    accordionCardClass={accordionCardClass}
                  />
                </AccordionItem>

                <AccordionItem value="outfit">
                  <OutfitSection
                    referenceImages={referenceImages}
                    selectedModelsLength={selectedModels.length}
                    maxTotalImages={MAX_TOTAL_IMAGES}
                    outfitFileInputRef={outfitFileInputRef}
                    handleImageUpload={handleImageUpload}
                    removeReferenceImage={removeReferenceImage}
                    accordionCardClass={accordionCardClass}
                  />
                </AccordionItem>

                <AccordionItem value="location">
                  <LocationSection
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    isLocationLibraryOpen={isLocationLibraryOpen}
                    setIsLocationLibraryOpen={setIsLocationLibraryOpen}
                    isLocationAddMenuOpen={isLocationAddMenuOpen}
                    setIsLocationAddMenuOpen={setIsLocationAddMenuOpen}
                    locationFileInputRef={locationFileInputRef}
                    handleLocationSelect={handleLocationSelect}
                    accordionCardClass={accordionCardClass}
                  />
                </AccordionItem>
              </Accordion>
            </div>

            {/* Center Panel: Preview */}
            <div className="order-1 lg:order-2 w-full lg:flex-1 flex flex-col items-center">
              <PreviewPanel
                isGenerating={isGenerating}
                previewImage={previewImage}
                generatedImages={generatedImages}
                setPreviewImage={setPreviewImage}
              />
            </div>

            {/* Right Panel: Controls */}
            <div className="order-3 lg:order-3 w-full lg:w-72 flex flex-col gap-5 shrink-0">
              <Accordion
                type="multiple"
                defaultValue={['view', 'prompt']}
                className="w-full space-y-3"
              >
                <AccordionItem value="view">
                  <CompositionControls
                    presets={COMPOSITION_PRESETS}
                    selectedPreset={selectedCameraPreset}
                    setSelectedPreset={setSelectedCameraPreset}
                    shotSize={shotSize}
                    setShotSize={setShotSize}
                    accordionCardClass={accordionCardClass}
                  />
                </AccordionItem>

                <AccordionItem value="prompt">
                  <div className={glassCardClass}>
                    <div className="px-4 py-3 border-b border-border/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        Prompt
                      </span>
                    </div>
                    <div className="px-4 pt-2 pb-6">
                      <Textarea
                        placeholder="Optional prompt details..."
                        className="min-h-[80px] resize-none bg-muted/30 border-1 rounded-xl text-sm placeholder:text-muted-foreground/50"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionItem>
              </Accordion>

              <GenerationPanel
                modelTier={modelTier}
                setModelTier={setModelTier}
                numImages={numImages}
                setNumImages={setNumImages}
                resolution={resolution}
                setResolution={setResolution}
                availableProResolutions={availableProResolutions}
                estimatedCredits={estimatedCredits}
                isGenerating={isGenerating}
                isDisabled={
                  referenceImages.length === 0 || (!isModelAutoMode && selectedModels.length === 0)
                }
                onGenerate={handleGenerate}
                accordionCardClass={accordionCardClass}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
