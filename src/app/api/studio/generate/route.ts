import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors'
import { ApiError } from '@/lib/errors'
import { imageGenerationSchema } from '@/lib/validation'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/google-ai/client'
import { getCreditCostForModel, consumeCredits, refundCredits } from '@/lib/billing/credits'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/infra/ratelimit'
import { getUserById } from '@/lib/db/users'
import { resolveGenerationReferenceImages } from '@/lib/studio/generation/reference-images'
import { preparePromptForGeneration } from '@/lib/studio/generation/prompt'
import { uploadGeneratedImagesToR2 } from '@/lib/studio/generation/r2-upload'

const handleError = createErrorHandler('api/studio/generate')

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
      console.warn('[API] GEMINI_API_KEY is not configured. Image requests will use placeholder output.')
    }

    const body = await request.json()
    const validated = imageGenerationSchema.parse(body)

    const modelId = validated.modelId || DEFAULT_MODEL
    const { modelImageUrl, locationImageUrl, outfitImageUrls, inputImageUrls, usesRoleSeparatedRefs } =
      resolveGenerationReferenceImages(validated, request.url)

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
    if (usesRoleSeparatedRefs) {
      console.log('[API] Reference images (role-separated):', {
        model: Boolean(modelImageUrl),
        outfits: outfitImageUrls.length,
        location: Boolean(locationImageUrl),
      })
    } else if (validated.image_url) {
      console.log('[API] Reference images:', 1)
    } else if (validated.imageUrls?.length) {
      console.log('[API] Reference images:', validated.imageUrls.length)
    }

    const { effectiveModelId, promptForModel, aspectRatioForModel, modelOverrideWarning } =
      await preparePromptForGeneration({
        validated,
        requestedModelId: modelId,
        modelImageUrl,
        outfitImageUrls,
        locationImageUrl,
      })

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
    console.log(`[API] Credit cost: ${baseCreditCost} per image ??${numImages} = ${creditCost} total`)

    await consumeCredits(userId, creditCost)

    const result = await generateImageWithModel(promptForModel, effectiveModelId, {
      style: validated.style,
      aspectRatio: aspectRatioForModel,
      width: validated.width,
      height: validated.height,
      imageUrls: inputImageUrls.length > 0 ? inputImageUrls : undefined,
      numImages,
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
    const r2ImageUrls = await uploadGeneratedImagesToR2(originalImageUrls)

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

