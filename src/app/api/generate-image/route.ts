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

    // GPT Image 1.5 Edit 모델 - 간단한 키워드 프롬프트
    if (effectiveModelId === 'fal-ai/gpt-image-1.5/edit') {
      const userPrompt = validated.prompt?.trim() || ''
      const viewType = validated.viewType || 'front'

      // View별 간단한 키워드
      const viewKeywords: Record<string, string> = {
        front: 'front view',
        behind: 'back view',
        side: 'side view',
        quarter: '3/4 view'
      }

      // 기본 프롬프트 (간단한 키워드만)
      const promptParts = [
        'E-commerce cutout photography of high fashion lookbook style',
        'use the face and body of the model from the reference image',
        'maintain the original fit, silhouette, and volume of the reference outfit',
        'if no shoes provided, add clean minimal white sneakers',
        'natural skin texture',
        viewKeywords[viewType],
        'full body shot',
        'standing pose',
        'arms naturally at sides',
        'seamless white background',
        'soft even lighting',
        'sharp focus',
        '8k, raw photo, high resolution, photorealistic',
      ]

      // Quarter view 추가
      if (viewType === 'quarter') {
        promptParts.push('body turned 45 degrees')
      }

      // 사용자 입력
      if (userPrompt) {
        promptParts.push(userPrompt)
      }

      validated.prompt = promptParts.join(', ')
      console.log(`[API] Simple prompt (${viewType}):`, validated.prompt)
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

    // 생성된 이미지를 R2에 업로드하여 CDN URL로 변환 (Gallery 로딩 속도 개선)
    const originalImageUrls = result.imageUrls || (result.imageUrl ? [result.imageUrl] : [])
    const r2ImageUrls = await Promise.all(
      originalImageUrls.map(async (url, index) => {
        try {
          // base64 또는 Fal URL을 R2에 업로드
          const uploadResult = await uploadImageToR2(
            'studio',
            `generated-${Date.now()}-${index}`,
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
