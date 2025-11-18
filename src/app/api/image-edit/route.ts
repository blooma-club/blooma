import { NextRequest } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imageEditSchema } from '@/lib/validation/schemas'
import { uploadImageToR2 } from '@/lib/r2'
import { generateImageWithModel, getModelInfo } from '@/lib/fal-ai'
import { getCreditCostForModel, InsufficientCreditsError } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'

const handleError = createErrorHandler('api/image-edit')

// 헬퍼: 여러 이미지 업로드
async function uploadImagesToR2(imageUrls: string[], projectId: string, frameId: string) {
  const uploads = await Promise.all(imageUrls.map(url => uploadImageToR2(projectId, frameId, url)))
  return uploads.map(u => u.publicUrl || u.key).filter(Boolean)
}

// Multi-image edit via Gemini 2.5 Flash Image
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()
    const validated = imageEditSchema.parse(body)

    const resolvedProjectId = validated.projectId || validated.storyboardId

    if (!resolvedProjectId) {
      throw ApiError.badRequest('projectId or storyboardId is required')
    }

    // 참조 이미지 제한 (최대 6장)
    const refs = validated.image_urls.slice(0, 6)

    // 모델 정보 가져오기
    const modelInfo = getModelInfo('fal-ai/gemini-25-flash-image/edit')
    if (!modelInfo) {
      throw ApiError.badRequest('Unsupported model')
    }

    // 크레딧 소비
    const creditCost = getCreditCostForModel('fal-ai/gemini-25-flash-image/edit', 'IMAGE_EDIT')
    await consumeCredits(userId, creditCost)

    // Gemini 모델 호출
    const result = await generateImageWithModel(validated.prompt, 'fal-ai/gemini-25-flash-image/edit', {
      imageUrls: refs,
      numImages: Math.min(Math.max(validated.numImages || 1, 1), 4),
      outputFormat: validated.output_format === 'png' ? 'png' : 'jpeg',
    })

    if (!result.success || !result.imageUrls?.length) {
      // 실패 시 환불
      await refundCredits(userId, creditCost)
      const status = typeof result.status === 'number' && result.status >= 400 ? result.status : 500
      throw ApiError.externalApiError(result.error || 'No images generated', { status })
    }

    // 생성된 이미지들 R2에 업로드
    const uploadedUrls = await uploadImagesToR2(result.imageUrls, resolvedProjectId, validated.frameId)

    if (!uploadedUrls.length) {
      // 실패 시 환불
      await refundCredits(userId, creditCost)
      throw ApiError.internal('Failed to upload images')
    }

    return createApiResponse({
      images: uploadedUrls,
      description: 'Images edited successfully',
      ...(result.warning ? { warning: result.warning } : {}),
    })
  } catch (error) {
    return handleError(error)
  }
}