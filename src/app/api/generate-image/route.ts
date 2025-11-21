import { NextRequest } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imageGenerationSchema } from '@/lib/validation/schemas'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/fal-ai'
import { getCreditCostForModel, InsufficientCreditsError } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'

const handleError = createErrorHandler('api/generate-image')

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const falKeyConfigured = !!process.env.FAL_KEY?.trim()?.length
    if (!falKeyConfigured) {
      console.warn('[API] FAL_KEY is not configured. Image requests will use placeholder output.')
    }

    const body = await request.json()
    const validated = imageGenerationSchema.parse(body)

    const modelId = validated.modelId || DEFAULT_MODEL

    if (!getModelInfo(modelId)) {
      throw ApiError.badRequest(`Unsupported model: ${modelId}`)
    }

    console.log(`[API] Requested model: ${modelId}`)
    console.log(`[API] Options:`, {
      style: validated.style,
      aspectRatio: validated.aspectRatio,
      width: validated.width,
      height: validated.height,
      image_url: validated.image_url,
      imageUrls: validated.imageUrls,
    })

    // Prepare image URLs for the generation
    let inputImageUrls: string[] = []
    if (validated.image_url) {
      inputImageUrls = [validated.image_url]
    } else if (validated.imageUrls && Array.isArray(validated.imageUrls)) {
      inputImageUrls = validated.imageUrls
    }

    let effectiveModelId = modelId
    let modelOverrideWarning: string | undefined

    // Note: kontext model was removed, but keeping this check for safety
    if (modelId === 'fal-ai/flux-pro/kontext' && inputImageUrls.length === 0) {
      effectiveModelId = DEFAULT_MODEL
      modelOverrideWarning = `Model fal-ai/flux-pro/kontext requires a reference image. Using ${DEFAULT_MODEL} instead.`
    }

    if (effectiveModelId !== modelId) {
      console.log('[API] Overriding requested model due to missing reference image', {
        requestedModel: modelId,
        effectiveModel: effectiveModelId,
      })
    }

    const modelInfo = getModelInfo(effectiveModelId)
    if (!modelInfo) {
      throw ApiError.badRequest(`Unsupported model: ${effectiveModelId}`)
    }

    console.log(`[API] Generating image with model: ${effectiveModelId}`)

    // 모델 크레딧 기반 선차감 (실패/플레이스홀더 시 환불)
    const fallbackCategory = modelInfo.category === 'inpainting'
      ? 'IMAGE_EDIT'
      : (modelInfo.category === 'video-generation' ? 'VIDEO' : 'IMAGE')
    const creditCost = getCreditCostForModel(effectiveModelId, fallbackCategory)
    try {
      await consumeCredits(userId, creditCost)
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        throw ApiError.forbidden('Insufficient credits')
      }
      throw e
    }

    const result = await generateImageWithModel(validated.prompt, effectiveModelId, {
      style: validated.style,
      aspectRatio: validated.aspectRatio,
      width: validated.width,
      height: validated.height,
      imageUrls: inputImageUrls.length > 0 ? inputImageUrls : undefined,
      numImages: validated.numImages ?? 1,
      resolution: validated.resolution,
    })

    if (!result.success) {
      // 실패 시 환불
      await refundCredits(userId, creditCost)
      const status = typeof result.status === 'number' && result.status >= 400 ? result.status : 500
      throw ApiError.externalApiError(result.error || 'Image generation failed', { status })
    }

    // 플레이스홀더 결과면 환불 (경고 메시지로 판단)
    if (result.warning && /placeholder/i.test(result.warning)) {
      await refundCredits(userId, creditCost)
    }

    const warnings = [result.warning, modelOverrideWarning].filter(
      (value): value is string => Boolean(value)
    )

    return createApiResponse({
      imageUrl: result.imageUrl,
      imageUrls: result.imageUrls,
      prompt: validated.prompt,
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
