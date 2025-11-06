import { NextRequest } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { videoGenerationSchema } from '@/lib/validation/schemas'
import { generateVideoFromImage } from '@/lib/videoProviders'
import { START_TO_END_FRAME_MODEL_IDS, getModelInfo } from '@/lib/fal-ai'
import { queryD1 } from '@/lib/db/d1'
import { getCreditCostForModel, InsufficientCreditsError } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'

const handleError = createErrorHandler('api/video/generate')

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    const validated = videoGenerationSchema.parse(body)

    const normalizeUrl = (value?: string | null) =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

    const normalizedImageUrl = normalizeUrl(validated.imageUrl)
    const normalizedStartImageUrl = normalizeUrl(validated.startImageUrl)
    const normalizedEndImageUrl = normalizeUrl(validated.endImageUrl)

    const effectiveImageUrl = normalizedImageUrl || normalizedStartImageUrl

    if (!effectiveImageUrl) {
      throw ApiError.badRequest('At least one image URL is required')
    }

    if (
      START_TO_END_FRAME_MODEL_IDS.includes(validated.modelId) &&
      !normalizedEndImageUrl
    ) {
      throw ApiError.badRequest('Selected model requires both start and end image URLs.')
    }

    type CardRow = {
      id: string
      project_id: string
      user_id: string
      image_url?: string | null
    }

    const fetchCard = async (id: string): Promise<CardRow | null> => {
      const rows = await queryD1<CardRow>(
        `SELECT id, project_id, user_id, image_url FROM cards WHERE id = ?1`,
        [id]
      )
      return rows.length > 0 ? rows[0] : null
    }

    const primaryCard = await fetchCard(validated.frameId)
    if (!primaryCard) {
      throw ApiError.notFound('Frame not found')
    }

    if (primaryCard.user_id !== userId || primaryCard.project_id !== validated.projectId) {
      throw ApiError.forbidden('Access denied for this frame')
    }

    let verifiedEndCard: CardRow | null = null
    if (validated.endFrameId) {
      verifiedEndCard = await fetchCard(validated.endFrameId)
      if (!verifiedEndCard) {
        throw ApiError.notFound('End frame not found')
      }
      if (verifiedEndCard.user_id !== userId || verifiedEndCard.project_id !== validated.projectId) {
        throw ApiError.forbidden('Access denied for the selected end frame')
      }
    }

    const videoPrompt: string = validated.prompt && validated.prompt.trim().length > 0
      ? validated.prompt.trim()
      : 'Animate this storyboard frame as a short cinematic clip'

    const resolvedStartImageUrl =
      normalizedStartImageUrl ?? effectiveImageUrl ?? primaryCard.image_url ?? null
    const resolvedEndImageUrl = normalizedEndImageUrl ?? verifiedEndCard?.image_url ?? null

    // 선차감 (실패 시 환불) - 모델 크레딧 기반
    const modelInfo = getModelInfo(validated.modelId)
    if (!modelInfo) {
      throw ApiError.badRequest(`Unsupported model: ${validated.modelId}`)
    }
    const creditCost = getCreditCostForModel(validated.modelId, 'VIDEO')
    try {
      await consumeCredits(userId, creditCost)
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        throw ApiError.forbidden('Insufficient credits')
      }
      throw e
    }

    let videoResult: Awaited<ReturnType<typeof generateVideoFromImage>>
    try {
      videoResult = await generateVideoFromImage({
        projectId: validated.projectId,
        frameId: validated.frameId,
        imageUrl: effectiveImageUrl,
        startImageUrl: resolvedStartImageUrl,
        endImageUrl: resolvedEndImageUrl,
        prompt: videoPrompt,
        modelId: validated.modelId,
      })
    } catch (err) {
      await refundCredits(userId, creditCost)
      throw err
    }

    return createApiResponse({
      videoUrl: videoResult.videoUrl,
      videoKey: videoResult.key,
      videoPrompt,
      provider: videoResult.provider,
      rawUrl: videoResult.rawUrl,
      signedUrl: videoResult.signedUrl,
      contentType: videoResult.contentType,
    })
  } catch (error) {
    return handleError(error)
  }
}
