/**
 * 비디오 생성 큐 워커 API
 * 
 * QStash에서 호출되어 실제 비디오 생성 작업을 수행합니다.
 * Vercel Serverless 타임아웃 제한(10초)을 우회하기 위해
 * 이 엔드포인트는 Vercel Edge나 별도의 백그라운드 작업으로 실행됩니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, VideoJobPayload } from '@/lib/queue/qstash'
import { generateVideoFromImage } from '@/lib/videoProviders'
import { updateVideoJobStatus, getVideoJob } from '@/lib/db/videoJobs'
import { refundCredits } from '@/lib/credits'
import { queryD1 } from '@/lib/db/d1'

// Vercel에서 실행 시간 연장 (Pro 플랜 필요, 최대 300초)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 읽기
    const body = await request.text()
    
    // QStash 서명 검증
    const signature = request.headers.get('upstash-signature')
    if (signature) {
      const isValid = await verifyWebhook(signature, body)
      if (!isValid) {
        console.error('[VideoQueue] Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      // 개발 환경에서는 서명 없이도 허용 (로컬 테스트용)
      if (process.env.NODE_ENV === 'production') {
        console.error('[VideoQueue] Missing webhook signature in production')
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
    }

    const payload: VideoJobPayload = JSON.parse(body)
    const { jobId, userId, frameId, projectId, imageUrl, startImageUrl, endImageUrl, prompt, modelId, creditCost } = payload

    console.log('[VideoQueue] Processing video job:', { jobId, frameId, modelId })

    // 작업 상태를 processing으로 업데이트
    await updateVideoJobStatus(jobId, 'processing')

    try {
      // 비디오 생성 실행
      const videoResult = await generateVideoFromImage({
        projectId,
        frameId,
        imageUrl,
        startImageUrl,
        endImageUrl,
        prompt,
        modelId,
      })

      // 작업 완료 - DB 업데이트
      await updateVideoJobStatus(jobId, 'completed', {
        video_url: videoResult.videoUrl,
        video_key: videoResult.key,
      })

      // 카드에도 비디오 URL 업데이트
      await queryD1(
        `UPDATE cards 
         SET video_url = ?1, video_key = ?2, video_prompt = ?3, updated_at = ?4
         WHERE id = ?5`,
        [videoResult.videoUrl, videoResult.key, prompt, new Date().toISOString(), frameId]
      )

      console.log('[VideoQueue] Video job completed:', { jobId, frameId, videoUrl: videoResult.videoUrl })

      return NextResponse.json({
        success: true,
        jobId,
        videoUrl: videoResult.videoUrl,
        videoKey: videoResult.key,
      })

    } catch (error) {
      console.error('[VideoQueue] Video generation failed:', error)

      // 작업 실패 - 크레딧 환불
      try {
        await refundCredits(userId, creditCost)
        console.log('[VideoQueue] Credits refunded:', { userId, creditCost })
      } catch (refundError) {
        console.error('[VideoQueue] Failed to refund credits:', refundError)
      }

      // 작업 상태를 failed로 업데이트
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await updateVideoJobStatus(jobId, 'failed', {
        error_message: errorMessage,
      })

      // QStash에게 실패 응답 (재시도 트리거)
      return NextResponse.json(
        { error: 'Video generation failed', message: errorMessage },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[VideoQueue] Request processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

