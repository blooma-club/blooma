import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imageGenerationSchema } from '@/lib/validation/schemas'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/fal-ai'
import { getCreditCostForModel } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/ratelimit'

const handleError = createErrorHandler('api/generate-image')

// ============================================================================
// [Prompt Presets System]
// ============================================================================

// Analyzed style from user's reference image (High-end streetwear / Editorial)
const FASHION_PROMPT_TEMPLATE = {
  "image_type": "commercial_fashion_photography",
  "sub_type": "studio_lookbook, e-commerce_catalog, full_body_shot",
  "subject": {
    "model_source": "Use the face and body of the model from the reference image",
    "expression": "neutral_expression, looking_straight_at_camera, confident",
    "pose": "standing_straight, front_view, arms_relaxed_at_sides",
    "skin": "natural_skin_texture, realistic_pores, raw_photo_style, not_airbrushed"
  },
  "apparel": {
    "instruction": "Wear the exact outfit provided in the reference image",
    "fit": "Maintain the original fit, silhouette, and volume of the reference outfit",
    "details": "Keep all details, materials, textures, and colors strictly from the reference outfit",
    "styling": "High-end streetwear, minimalist styling",
    "realism": "natural_fabric_drape, realistic_folds, soft_wrinkles, fabric_weight, interaction_with_body"
  },
  "environment": {
    "background": "seamless_pure_white_studio_background, cyclorama_wall, infinite_white",
    "props": "none, minimalist"
  },
  "technical_specs": {
    "lighting": "soft_even_studio_lighting, subtle_shadows_for_depth, cinematic_soft_light",
    "image_quality": "high_resolution, photorealistic, sharp_focus, 8k, masterpiece, raw_photo",
    "composition": "centered_subject, full_body_frame",
    "finish": "natural_film_grain, no_plastic_skin, true_to_life_colors"
  }
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

    // Seedream 모델 (fitting-room)에 JSON 템플릿 적용
    if (effectiveModelId === 'fal-ai/bytedance/seedream/v4.5/edit') {
      const userPrompt = validated.prompt?.trim() || ''

      // 1. 템플릿 복사
      const promptObj: Record<string, any> = { ...FASHION_PROMPT_TEMPLATE }

      // 2. 사용자 프롬프트가 있다면 맨 마지막에 추가
      if (userPrompt) {
        promptObj["user_add_prompt"] = userPrompt
      }

      // 3. JSON 구조를 문자열로 변환하여 프롬프트로 사용
      // 대부분의 최신 모델은 구조화된 텍스트(JSON 형태)를 잘 이해합니다.
      // 콤마로 구분된 key: value 형태로 변환하여 토큰 절약 및 가독성 확보
      const formattedPrompt = Object.entries(promptObj).map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: { ${Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ')} }`
        }
        return `${key}: ${value}`
      }).join(', ')

      validated.prompt = formattedPrompt

      console.log(`[API] Applied JSON Template prompt:`, validated.prompt)
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
