import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imageGenerationSchema } from '@/lib/validation/schemas'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/google-ai'
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

    const geminiKeyConfigured = !!process.env.GEMINI_API_KEY?.trim()?.length
    if (!geminiKeyConfigured) {
      console.warn('[API] GEMINI_API_KEY is not configured. Image requests will use placeholder output.')
    }

    const body = await request.json()
    const validated = imageGenerationSchema.parse(body)

    const modelId = validated.modelId || DEFAULT_MODEL

    if (!getModelInfo(modelId)) {
      throw ApiError.badRequest(`Unsupported model: ${modelId}`)
    }

    console.log(`[API] Requested model: ${modelId}`)
    const usesRoleSeparatedRefs =
      typeof body.modelImageUrl === 'string' ||
      Array.isArray(body.outfitImageUrls) ||
      typeof body.locationImageUrl === 'string'

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
      if (validated.modelImageUrl) {
        modelImageIndex = addInputImage(validated.modelImageUrl)
      }

      const outfitUrls = validated.outfitImageUrls ?? []
      for (const url of outfitUrls) {
        outfitImageIndexes.push(addInputImage(url))
      }

      if (validated.locationImageUrl) {
        locationImageIndex = addInputImage(validated.locationImageUrl)
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

    // 이미지 편집 모델 - JSON 기반 프롬프트 (GPT Image 1.5, Nano Banana Pro)
    // Gemini models support image editing natively
    const editModels = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
    if (editModels.includes(effectiveModelId)) {
      const userPrompt = validated.prompt?.trim() || ''
      const viewType = validated.viewType || 'front'

      const cameraPrompt = validated.cameraPrompt // 카메라 프롬프트 (렌즈, 조명, 앵글 등)

      // View별 포즈 설정
      const viewPoses: Record<string, string> = {
        front: 'standing_straight, front_view, arms_relaxed_at_sides',
        behind: 'standing_straight, back_view, arms_relaxed_at_sides',
        side: 'standing_straight, side_view, profile, arms_relaxed',
        quarter: 'standing_straight, three_quarter_view, slight_angle, arms_relaxed, looking_in_body_direction, gaze_matches_body_angle',
      }

      const pose = viewPoses[viewType] || viewPoses.front

      // JSON 구조 기반 프롬프트

      if (!modelImageIndex) {

        throw ApiError.badRequest('Model reference image is required')

      }

      if (outfitImageIndexes.length === 0) {

        throw ApiError.badRequest('At least one outfit reference image is required')

      }


      const references = {
        note: 'Image indexes are 1-based and refer to the order of input images provided with this request.',
        model: { mode: 'reference', image_index: modelImageIndex, face_id_strength: 0.9 },
        outfits: { mode: 'reference', image_indexes: outfitImageIndexes },
        location: locationImageIndex
          ? { mode: 'reference', image_index: locationImageIndex }
          : { mode: 'studio_neutral' },
      }

      const modelRefInstruction = `Use the face and body identity from reference Image #${modelImageIndex}.`

      const outfitRefInstruction = `Wear the exact outfit from reference Image(s): ${outfitImageIndexes.map((n) => `#${n}`).join(', ')}.`

      const backgroundInstruction = locationImageIndex
        ? `Match the environment/background from reference Image #${locationImageIndex}.`
        : 'Use a clean, neutral studio background.'

      const promptData = {
        version: '1.0',
        image_type: 'fashion_photography',
        intent: 'high_end_editorial_product_showcase',
        priorities: [
          'apparel_fidelity',
          'identity_fidelity',
          'pose_fidelity',
          'lighting_consistency',
          'background_consistency',
        ],
        references,
        subject: {
          model_source: modelRefInstruction,
          expression: 'neutral_expression, confident',
          skin: 'natural_skin_texture, raw_photo_style, not_airbrushed',
          pose,
        },
        apparel: {
          instruction: outfitRefInstruction,
          fit: 'Maintain the original fit, silhouette, and volume of the reference outfit',
          details: 'Keep all details, materials, textures, and colors strictly from the reference outfit',
          realism: 'natural_fabric_drape, realistic_folds, soft_wrinkles, fabric_weight, interaction_with_body',
        },
        environment: {
          background: backgroundInstruction,
        },
        technical_specs: {
          camera_settings: cameraPrompt || 'Professional editorial fashion photography setup. 50mm lens, clean focus, controlled contrast.',
          lighting: 'Soft editorial lighting, flattering but realistic. Avoid harsh specular highlights and muddy shadows.',
          image_quality: 'high_resolution, photorealistic, clean detail, no oversharpening',
          composition: 'Full-body or outfit-focused framing that clearly showcases fit and fabric details. Keep proportions natural.',
          aspect_ratio: '3:4',
        },
        quality_gates: [
          'logos_and_patterns_not_warped',
          'fabric_texture_realistic_not_painted',
          'no_extra_accessories_or_garments',
          'no_text_or_watermarks',
          'anatomy_correct_no_extra_limbs',
          'colors_match_reference_no_hue_shift',
        ],
        negative_constraints: [
          'Do not add text, captions, or watermarks',
          'Do not change the outfit design, layers, or branding',
          'Avoid plastic skin or heavy beauty retouching',
          'Avoid exaggerated wide-angle distortion or unnatural proportions',
          'Do not introduce extra props unless explicitly requested',
        ],
        ...(userPrompt ? { user_details: userPrompt } : {}),
      }

      promptForModel = JSON.stringify(promptData)
      console.log(`[API] JSON prompt (${viewType}):`, promptForModel.substring(0, 200) + '...')
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

    console.log(`[API] Generating image with model: ${effectiveModelId}`)

    // 모델 크레딧 기반 선차감 (실패/플레이스홀더 시 환불)
    // numImages? ?? ? ??? ??
    const fallbackCategory = modelInfo.category === 'image-editing'
      ? 'IMAGE_EDIT'
      : 'IMAGE'
    const baseCreditCost = getCreditCostForModel(effectiveModelId, fallbackCategory, {
      resolution: validated.resolution,
    })
    const numImages = validated.numImages ?? 1
    const creditCost = baseCreditCost * numImages
    console.log(`[API] Credit cost: ${baseCreditCost} per image × ${numImages} = ${creditCost} total`)
    await consumeCredits(userId, creditCost)

    const result = await generateImageWithModel(promptForModel, effectiveModelId, {
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
