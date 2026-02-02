import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors'
import { ApiError } from '@/lib/errors'
import { imageGenerationSchema } from '@/lib/validation'
import {
  generateImageWithModel,
  getModelInfo,
  DEFAULT_MODEL,
  generatePromptFromImages,
} from '@/lib/google-ai/client'
import { getCreditCostForModel } from '@/lib/billing/credits'
import { consumeCredits, refundCredits } from '@/lib/billing/credits'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/infra/ratelimit'
import { uploadImageToR2, reconstructR2Url } from '@/lib/infra/storage'
import { getUserById } from '@/lib/db/users'
import { validateImageUrl } from '@/lib/infra/security'

const handleError = createErrorHandler('api/studio/generate')

// ============================================================================
// [Prompt Presets System]
// ============================================================================

// Analyzed style from user's reference image (High-end streetwear / Editorial)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const rateLimitResult = await checkRateLimit(userId, 'imageGeneration')
    if (!rateLimitResult.success) {
      return NextResponse.json(createRateLimitError(rateLimitResult), {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      })
    }

    const geminiKeyConfigured = !!process.env.GEMINI_API_KEY?.trim()?.length
    if (!geminiKeyConfigured) {
      console.warn(
        '[API] GEMINI_API_KEY is not configured. Image requests will use placeholder output.'
      )
    }

    const body = await request.json()
    const validated = imageGenerationSchema.parse(body)

    const resolveInputUrl = (url?: string): string | undefined => {
      if (!url) return undefined
      if (url.startsWith('blob:') || url.startsWith('data:')) return undefined
      let resolved: string
      if (url.startsWith('http://') || url.startsWith('https://')) {
        resolved = url
      } else if (url.startsWith('/')) {
        resolved = new URL(url, request.url).toString()
      } else {
        resolved = reconstructR2Url(url)
      }

      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        const validation = validateImageUrl(resolved)
        if (!validation.valid) {
          throw ApiError.badRequest(`Invalid image URL: ${validation.reason}`)
        }
      }

      return resolved
    }

    const modelImageUrl = resolveInputUrl(validated.modelImageUrl)
    const locationImageUrl = resolveInputUrl(validated.locationImageUrl)
    const outfitImageUrls =
      validated.outfitImageUrls
        ?.map((url) => resolveInputUrl(url))
        .filter((url): url is string => Boolean(url)) ?? []

    const modelId = validated.modelId || DEFAULT_MODEL
    const userRecord = await getUserById(userId)
    if (!userRecord) {
      throw ApiError.notFound('User not found')
    }

    const tier = userRecord.subscription_tier ?? null
    const isFreeTier = !tier || tier === 'free'
    const isSmallBrands = tier === 'Small Brands'
    const isProModel = [
      'gemini-3-pro-image-preview',
      'fal-ai/nano-banana-pro',
      'fal-ai/nano-banana-pro/edit',
    ].includes(modelId)
    if ((isFreeTier || isSmallBrands) && isProModel && validated.resolution === '4K') {
      throw ApiError.forbidden('This plan does not support 4K on Nano Banana Pro.')
    }

    if (!getModelInfo(modelId)) {
      throw ApiError.badRequest(`Unsupported model: ${modelId}`)
    }

    if (!validated.isModelAutoMode && !modelImageUrl) {
      throw ApiError.badRequest('modelImageUrl must be a public URL when not using auto mode.')
    }

    console.log(`[API] Requested model: ${modelId}`)
    const usesRoleSeparatedRefs =
      typeof validated.modelImageUrl === 'string' ||
      Array.isArray(validated.outfitImageUrls) ||
      typeof validated.locationImageUrl === 'string'

    // Prepare input images for the model (order matters).
    // Indexes are 1-based to match human-readable prompt references.
    let inputImageUrls: string[] = []
    let modelImageIndex: number | null = null
    let locationImageIndex: number | null = null
    let outfitImageIndexes: number[] = []

    const addInputImage = (url: string) => {
      inputImageUrls.push(url)
      return inputImageUrls.length
    }

    if (usesRoleSeparatedRefs) {
      if (modelImageUrl) {
        modelImageIndex = addInputImage(modelImageUrl)
      }

      const outfitUrls = outfitImageUrls
      for (const url of outfitUrls) {
        if (url) outfitImageIndexes.push(addInputImage(url))
      }

      if (locationImageUrl) {
        locationImageIndex = addInputImage(locationImageUrl)
      }

      console.log('[API] Reference images (role-separated):', {
        model: Boolean(modelImageIndex),
        outfits: outfitImageIndexes.length,
        location: Boolean(locationImageIndex),
      })
    } else if (validated.image_url) {
      modelImageIndex = addInputImage(validated.image_url)
      console.log('[API] Reference images:', 1)
    } else if (validated.imageUrls?.length) {
      inputImageUrls = validated.imageUrls
      modelImageIndex = inputImageUrls.length > 0 ? 1 : null
      outfitImageIndexes = inputImageUrls.slice(1).map((_, idx) => idx + 2)
      console.log('[API] Reference images:', inputImageUrls.length)
    }

    let effectiveModelId = modelId
    let modelOverrideWarning: string | undefined
    let promptForModel = validated.prompt
    let aspectRatioForModel = validated.aspectRatio
    const inpaintEnabled = validated.inpaint === true
    const defaultInpaintPrompt =
      'Place the model into the background. Preserve the background, lighting, and outfit details.'

    if (validated.shotSize) {
      const shotSizeMap: Record<string, string> = {
        'extreme-close-up': 'Extreme Close Up Shot',
        'close-up': 'Close Up Shot',
        'medium-shot': 'Medium Shot',
        'full-body': 'Full Body Shot',
      }
      const shotText = shotSizeMap[validated.shotSize] || ''
      if (shotText) {
        promptForModel = `${promptForModel ? promptForModel + ', ' : ''}${shotText}`
      }
    }

    // Gemini models support image editing natively
    const editModels = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
    if (editModels.includes(effectiveModelId)) {
      const desiredAspectRatio = validated.aspectRatio || '3:4'
      aspectRatioForModel = desiredAspectRatio

      if (!inpaintEnabled) {
        // Use LLM to generate structured JSON prompt from images + user hint
        const llmGeneratedPrompt = await generatePromptFromImages({
          modelImageUrl: validated.isModelAutoMode ? undefined : modelImageUrl,
          outfitImageUrls,
          locationImageUrl,
          userPrompt: validated.prompt,
          isModelAutoMode: validated.isModelAutoMode,
          backgroundMode: validated.backgroundMode,
        })

        if (llmGeneratedPrompt) {
          promptForModel = llmGeneratedPrompt
          console.log('[API] Using LLM-generated JSON prompt.')
          console.log('[API] JSON prompt length:', llmGeneratedPrompt.length)
        } else {
          // Fallback to user prompt if LLM fails
          promptForModel = validated.prompt?.trim() || ''
          console.log('[API] LLM prompt generation failed, using raw user prompt.')
        }
        console.log('[API] Prompt for model:', promptForModel?.substring(0, 200) + '...')
      }
    }

    if (inpaintEnabled && (!promptForModel || !promptForModel.trim())) {
      promptForModel = defaultInpaintPrompt
    }

    if (effectiveModelId !== modelId) {
      console.log('[API] Overriding requested model', {
        requestedModel: modelId,
        effectiveModel: effectiveModelId,
      })
    }

    const modelInfo = getModelInfo(effectiveModelId)
    if (!modelInfo) {
      throw ApiError.badRequest(`Unsupported model: ${effectiveModelId}`)
    }

    if (validated.resolution) {
      const resolutionRank: Record<string, number> = { '1K': 1, '2K': 2, '4K': 4 }
      const requestedRank = resolutionRank[validated.resolution] ?? 0
      const supportedRank = resolutionRank[modelInfo.maxResolution] ?? 0

      if (requestedRank > 0 && supportedRank > 0 && requestedRank > supportedRank) {
        throw ApiError.badRequest(
          `Resolution ${validated.resolution} is not supported by model ${effectiveModelId} (max: ${modelInfo.maxResolution}).`
        )
      }
    }

    console.log(`[API] Generating image with model: ${effectiveModelId}`)

    const fallbackCategory = modelInfo.category === 'image-editing' ? 'IMAGE_EDIT' : 'IMAGE'
    const baseCreditCost = getCreditCostForModel(effectiveModelId, fallbackCategory, {
      resolution: validated.resolution,
    })
    const numImages = validated.numImages ?? 1
    const creditCost = baseCreditCost * numImages
    console.log(
      `[API] Credit cost: ${baseCreditCost} per image ??${numImages} = ${creditCost} total`
    )
    await consumeCredits(userId, creditCost)

      const result = await generateImageWithModel(promptForModel, effectiveModelId, {
        style: validated.style,
        aspectRatio: aspectRatioForModel,
        width: validated.width,
        height: validated.height,
        imageUrls: inputImageUrls.length > 0 ? inputImageUrls : undefined,
        numImages: validated.numImages ?? 1,
        resolution: validated.resolution,
      })

    if (!result.success) {
      await refundCredits(userId, creditCost)
      const status = typeof result.status === 'number' && result.status >= 400 ? result.status : 500
      throw ApiError.externalApiError(result.error || 'Image generation failed', { status })
    }

    if (result.warning && /placeholder/i.test(result.warning)) {
      await refundCredits(userId, creditCost)
    }

    const warnings = [result.warning, modelOverrideWarning].filter((value): value is string =>
      Boolean(value)
    )
    const originalImageUrls = result.imageUrls || (result.imageUrl ? [result.imageUrl] : [])
    const r2ImageUrls = await Promise.all(
      originalImageUrls.map(async (url, index) => {
        try {
          const uploadResult = await uploadImageToR2(
            'studio',
            `generated-${crypto.randomUUID().slice(0, 8)}-${index}`,
            url
          )
          console.log(
            `[API] Image ${index + 1} uploaded to R2: ${uploadResult.publicUrl?.substring(0, 80)}...`
          )
          return uploadResult.publicUrl || url
        } catch (uploadError) {
          console.error(
            `[API] R2 upload failed for image ${index + 1}, using original URL:`,
            uploadError
          )
          return url
        }
      })
    )

    return createApiResponse({
      imageUrl: r2ImageUrls[0] || result.imageUrl,
      imageUrls: r2ImageUrls.length > 0 ? r2ImageUrls : result.imageUrls,
      prompt: promptForModel,
      modelUsed: effectiveModelId,
      modelInfo: {
        name: modelInfo.name,
        description: modelInfo.description,
      },
      ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
    })
  } catch (error) {
    return handleError(error)
  }
}
