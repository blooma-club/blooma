/**
 * 비디오 작업 상태 조회 API
 * 
 * 클라이언트에서 폴링하여 비디오 생성 작업 상태를 확인합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { getVideoJob, getPendingVideoJobForFrame } from '@/lib/db/videoJobs'

const handleError = createErrorHandler('api/video/status')

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const frameId = searchParams.get('frameId')

    if (!jobId && !frameId) {
      throw ApiError.badRequest('jobId or frameId is required')
    }

    let job = null

    if (jobId) {
      job = await getVideoJob(jobId)
    } else if (frameId) {
      job = await getPendingVideoJobForFrame(frameId)
    }

    if (!job) {
      return createApiResponse({
        found: false,
        status: null,
        message: 'No video job found',
      })
    }

    // 권한 확인
    if (job.user_id !== userId) {
      throw ApiError.forbidden('Access denied')
    }

    return createApiResponse({
      found: true,
      jobId: job.id,
      frameId: job.frame_id,
      status: job.status,
      videoUrl: job.video_url,
      videoKey: job.video_key,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    })

  } catch (error) {
    return handleError(error)
  }
}

