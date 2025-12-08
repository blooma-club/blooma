import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imageGenerationSchema } from '@/lib/validation/schemas'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/fal-ai'
import { getCreditCostForModel, InsufficientCreditsError } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/ratelimit'

const handleError = createErrorHandler('api/generate-image')

// ============================================================================
// [Prompt Presets System]
// 프리셋을 통해 일관된 프롬프트 품질을 보장합니다.
// 나중에 'lookbook', 'editorial', 'casual' 등 추가 가능
// ============================================================================
const PROMPT_PRESETS: Record<string, { base: string; suffix?: string }> = {
  'fitting-room': {
    base: "A fashion photoshoot featuring the model wearing the outfit from the reference image. Professional lighting, studio quality, high-end fashion photography style. Maintain the model's face and body proportions exactly.",
    suffix: ""
  },
  // 나중에 추가할 프리셋 예시:
  // 'lookbook': {
  //   base: "Studio lookbook shot, full body, standing pose, white background",
  //   suffix: ", professional fashion photography, 8k"
  // },
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    // Rate Limit 확인
    const rateLimitResult = await checkRateLimit(userId, 'imageGeneration')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      )
    }

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

    // Seedream 모델 (fitting-room)에 프리셋 적용
    if (effectiveModelId === 'fal-ai/bytedance/seedream/v4.5/edit') {
      const preset = PROMPT_PRESETS['fitting-room']
      const userPrompt = validated.prompt?.trim() || ''

      // 사용자 입력이 있으면 base + userPrompt, 없으면 base만
      if (userPrompt) {
        validated.prompt = `${preset.base} ${userPrompt}${preset.suffix ? ` ${preset.suffix}` : ''}`
      } else {
        validated.prompt = preset.base
      }

      console.log(`[API] Applied fitting-room preset. Final prompt: ${validated.prompt.slice(0, 100)}...`)
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
    // numImages에 따라 총 크레딧 계산 (Seedream v4.5 Edit = 15 크레딧/이미지)
    const fallbackCategory = modelInfo.category === 'inpainting'
      ? 'IMAGE_EDIT'
      : (modelInfo.category === 'video-generation' ? 'VIDEO' : 'IMAGE')
    const baseCreditCost = getCreditCostForModel(effectiveModelId, fallbackCategory, {
      resolution: validated.resolution,
    })
    const numImages = validated.numImages ?? 1
    const creditCost = baseCreditCost * numImages
    console.log(`[API] Credit cost: ${baseCreditCost} per image × ${numImages} = ${creditCost} total`)
    await consumeCredits(userId, creditCost)

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
