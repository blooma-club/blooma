import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { videoGenerationSchema } from '@/lib/validation/schemas'
import { generateVideoFromImage } from '@/lib/videoProviders'
import { START_TO_END_FRAME_MODEL_IDS, getModelInfo } from '@/lib/fal-ai'
import { getCreditCostForModel } from '@/lib/credits-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/ratelimit'
import { isQStashConfigured, enqueueVideoJob, VideoJobPayload } from '@/lib/queue/qstash'
import { createVideoJob, getPendingVideoJobForFrame } from '@/lib/db/videoJobs'
import { randomUUID } from 'crypto'

const handleError = createErrorHandler('api/video/generate')

// QStash 큐를 사용할지 여부 결정
const USE_QUEUE = isQStashConfigured()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    // Rate Limit 확인
    const rateLimitResult = await checkRateLimit(userId, 'videoGeneration')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      )
    }

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

    // NOTE: Card-based validation removed since cards table was deleted
    // Video generation now works with just frameId, projectId, and imageUrl from request

    // 이미 진행 중인 작업이 있는지 확인
    const pendingJob = await getPendingVideoJobForFrame(validated.frameId)
    if (pendingJob) {
      return createApiResponse({
        queued: true,
        jobId: pendingJob.id,
        status: pendingJob.status,
        message: 'Video generation already in progress',
      })
    }

    const videoPrompt: string = validated.prompt && validated.prompt.trim().length > 0
      ? validated.prompt.trim()
      : 'Animate this image as a short cinematic clip'

    const resolvedStartImageUrl = normalizedStartImageUrl ?? effectiveImageUrl
    const resolvedEndImageUrl = normalizedEndImageUrl ?? null

    // 모델 검증 및 크레딧 계산
    const modelInfo = getModelInfo(validated.modelId)
    if (!modelInfo) {
      throw ApiError.badRequest(`Unsupported model: ${validated.modelId}`)
    }
    // 기본 크레딧 비용 계산
    let creditCost = getCreditCostForModel(validated.modelId, 'VIDEO')
    // 10초 이상 비디오는 크레딧 2배 (기본 5초 기준)
    if (validated.duration && validated.duration > 5) {
      creditCost = Math.ceil(creditCost * (validated.duration / 5))
    }

    // 크레딧 선차감
    await consumeCredits(userId, creditCost)

    // QStash가 설정되어 있으면 큐 사용
    if (USE_QUEUE) {
      const jobId = randomUUID()

      // 작업 데이터 생성
      const jobPayload: VideoJobPayload = {
        jobId,
        userId,
        frameId: validated.frameId,
        projectId: validated.projectId,
        imageUrl: effectiveImageUrl,
        startImageUrl: resolvedStartImageUrl,
        endImageUrl: resolvedEndImageUrl,
        prompt: videoPrompt,
        modelId: validated.modelId,
        creditCost,
      }

      // DB에 작업 기록
      await createVideoJob({
        id: jobId,
        user_id: userId,
        frame_id: validated.frameId,
        project_id: validated.projectId,
        status: 'pending',
        video_url: null,
        video_key: null,
        error_message: null,
        model_id: validated.modelId,
        prompt: videoPrompt,
        credit_cost: creditCost,
        qstash_message_id: null,
      })

      // 큐에 작업 추가
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      const webhookUrl = `${baseUrl}/api/video/queue`

      try {
        const messageId = await enqueueVideoJob(jobPayload, webhookUrl)

        if (messageId) {
          console.log('[VideoGenerate] Job queued:', { jobId, messageId })
        }

        return createApiResponse({
          queued: true,
          jobId,
          status: 'pending',
          message: 'Video generation queued. Poll /api/video/status?jobId=' + jobId,
        })
      } catch (queueError) {
        // 큐 실패 시 크레딧 환불 및 동기 처리로 폴백
        console.error('[VideoGenerate] Queue failed, falling back to sync:', queueError)
        await refundCredits(userId, creditCost)
        await consumeCredits(userId, creditCost) // 동기 처리를 위해 다시 차감
      }
    }

    // 동기 처리 (QStash 미설정 또는 큐 실패 시)
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
