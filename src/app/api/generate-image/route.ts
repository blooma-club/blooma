import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imageGenerationSchema } from '@/lib/validation/schemas'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/fal-ai'
import { getCreditCostForModel } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/ratelimit'
import { uploadImageToR2 } from '@/lib/r2'

const handleError = createErrorHandler('api/generate-image')

// ============================================================================
// [Prompt Presets System]
// ============================================================================

// Analyzed style from user's reference image (High-end streetwear / Editorial)

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
    // Log only if imageUrls exist
    if (validated.imageUrls?.length) {
      console.log(`[API] Reference images:`, validated.imageUrls.length)
    }

    // Prepare image URLs for the generation
    let inputImageUrls: string[] = []
    if (validated.image_url) {
      inputImageUrls = [validated.image_url]
    } else if (validated.imageUrls && Array.isArray(validated.imageUrls)) {
      inputImageUrls = validated.imageUrls
    }

    let effectiveModelId = modelId
    let modelOverrideWarning: string | undefined

    // 이미지 편집 모델 - JSON 기반 프롬프트 (GPT Image 1.5, Nano Banana Pro)
    const editModels = ['fal-ai/gpt-image-1.5/edit', 'fal-ai/nano-banana-pro/edit']
    if (editModels.includes(effectiveModelId)) {
      const userPrompt = validated.prompt?.trim() || ''
      const viewType = validated.viewType || 'front'

      // View별 포즈 설정
      const viewPoses: Record<string, string> = {
        front: 'standing_straight, front_view, arms_relaxed_at_sides',
        behind: 'standing_straight, back_view, arms_relaxed_at_sides',
        side: 'standing_straight, side_view, profile, arms_relaxed',
        quarter: 'standing_straight, three_quarter_view, slight_angle, arms_relaxed, looking_in_body_direction, gaze_matches_body_angle',
      }

      const pose = viewPoses[viewType] || viewPoses.front

      // JSON 구조 기반 프롬프트
      const promptData = {
        image_type: 'commercial_fashion_photography',
        sub_type: 'fashion_studio_lookbook, e-commerce_catalog, full_body_shot',
        subject: {
          model_source: 'Use the face and body of the model from the reference image',
          expression: 'neutral_expression, looking_straight_at_camera, confident',
          pose,
          skin: 'natural_skin_texture, realistic_pores, raw_photo_style, not_airbrushed',
          body_framing: 'COMPLETE full body from head to toes, MUST include feet and shoes',
        },
        apparel: {
          instruction: 'Wear the exact outfit provided in the reference image',
          fit: 'Maintain the original fit, silhouette, and volume of the reference outfit',
          details: 'Keep all details, materials, textures, and colors strictly from the reference outfit',
          styling: 'High-end streetwear, minimalist styling',
          realism: 'natural_fabric_drape, realistic_folds, soft_wrinkles, fabric_weight, interaction_with_body',
          footwear: 'If no shoes provided, add clean minimal white sneakers',
        },
        environment: {
          background: 'seamless_pure_white_background, infinite_white, #FFFFFF',
        },
        technical_specs: {
          lighting: 'soft_even_lighting',
          image_quality: 'high_resolution, photorealistic, sharp_focus, 8k, raw_photo',
          composition: 'centered_subject, leave_space_above_head_and_below_feet',
        },
        negative_prompt: 'cropped_body, partial_body, cut_off_legs, missing_feet, no_shoes',
        ...(userPrompt ? { user_details: userPrompt } : {}),
      }

      validated.prompt = JSON.stringify(promptData)
      console.log(`[API] JSON prompt (${viewType}):`, validated.prompt.substring(0, 200) + '...')
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
    // numImages? ?? ? ??? ??
    const fallbackCategory = modelInfo.category === 'inpainting'
      ? 'IMAGE_EDIT'
      : 'IMAGE'
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

    // 생성된 이미지를 R2에 업로드하여 CDN URL로 변환 (Gallery 로딩 속도 개선)
    const originalImageUrls = result.imageUrls || (result.imageUrl ? [result.imageUrl] : [])
    const r2ImageUrls = await Promise.all(
      originalImageUrls.map(async (url, index) => {
        try {
          // base64 또는 Fal URL을 R2에 업로드
          const uploadResult = await uploadImageToR2(
            'studio',
            `generated-${crypto.randomUUID().slice(0, 8)}-${index}`,
            url
          )
          console.log(`[API] Image ${index + 1} uploaded to R2: ${uploadResult.publicUrl?.substring(0, 80)}...`)
          return uploadResult.publicUrl || url
        } catch (uploadError) {
          console.error(`[API] R2 upload failed for image ${index + 1}, using original URL:`, uploadError)
          return url  // 업로드 실패 시 원본 URL 사용
        }
      })
    )

    return createApiResponse({
      imageUrl: r2ImageUrls[0] || result.imageUrl,
      imageUrls: r2ImageUrls.length > 0 ? r2ImageUrls : result.imageUrls,
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
