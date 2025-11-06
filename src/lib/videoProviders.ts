import { fal } from '@fal-ai/client'
import { START_TO_END_FRAME_MODEL_IDS } from '@/lib/fal-ai'
import { uploadVideoToR2, UploadResult } from './r2'

export interface VideoGenerationParams {
  projectId: string
  frameId: string
  imageUrl: string
  startImageUrl?: string | null
  endImageUrl?: string | null
  prompt?: string
  modelId?: string
  aspectRatio?: string
  durationSeconds?: number
  guidanceScale?: number
  negativePrompt?: string
  seed?: number
}

export interface VideoGenerationResult {
  videoUrl: string
  signedUrl?: string | null
  key: string | null
  contentType: string | null
  provider: string
  rawUrl: string
}

const DEFAULT_MODEL = 'fal-ai/veo3.1/image-to-video'

const START_END_MODELS = new Set(START_TO_END_FRAME_MODEL_IDS)
const VEO_START_END_MODELS = new Set([
  'fal-ai/veo3.1/first-last-frame-to-video',
])
const KLING_START_END_MODELS = new Set([
  'fal-ai/kling-video/v2.1/pro/image-to-video',
])

function ensureFalConfigured() {
  const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY
  if (!falKey) {
    throw new Error('FAL_KEY is not configured for image-to-video generation')
  }
  fal.config({ credentials: falKey })
}

function resolveModelId(preferred?: string) {
  return (
    preferred ||
    process.env.FAL_IMAGE_TO_VIDEO_MODEL ||
    process.env.NEXT_PUBLIC_FAL_IMAGE_TO_VIDEO_MODEL ||
    DEFAULT_MODEL
  )
}

function isLikelyVideoUrl(candidate: string): boolean {
  const lower = candidate.toLowerCase()
  if (!/^https?:\/\//.test(candidate)) return false
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.includes('/video/') ||
    lower.includes('.mp4?')
  )
}

function extractVideoUrl(submission: unknown, modelId: string): string {
  let videoUrl: string | undefined
  let base64Fallback: string | undefined

  const stack: unknown[] = [submission]
  const seen = new Set<unknown>()

  // Veo 모델의 경우 video.url 형태로 응답이 올 수 있음
  if (typeof submission === 'object' && submission !== null) {
    const record = submission as Record<string, unknown>
    if (record.video && typeof record.video === 'object' && record.video !== null) {
      const video = record.video as Record<string, unknown>
      if (typeof video.url === 'string' && isLikelyVideoUrl(video.url)) {
        videoUrl = video.url
      }
    }
  }

  while (stack.length && !videoUrl) {
    const current = stack.pop()
    if (!current || seen.has(current)) continue
    seen.add(current)

    if (typeof current === 'string') {
      if (!videoUrl && isLikelyVideoUrl(current)) {
        videoUrl = current
        break
      }
      continue
    }

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>
      const candidate = record.url
      if (!videoUrl && typeof candidate === 'string' && isLikelyVideoUrl(candidate)) {
        videoUrl = candidate
        break
      }

      const base64Candidate =
        typeof record.base64 === 'string'
          ? record.base64
          : typeof record.b64 === 'string'
          ? record.b64
          : undefined

      if (!videoUrl && base64Candidate && base64Candidate.length > 50) {
        base64Fallback = base64Candidate
      }

      for (const value of Object.values(record)) {
        stack.push(value)
      }
    }
  }

  if (!videoUrl && base64Fallback) {
    videoUrl = base64Fallback.startsWith('data:')
      ? base64Fallback
      : `data:video/mp4;base64,${base64Fallback}`
  }

  if (!videoUrl) {
    throw new Error(`Provider ${modelId} did not return a video URL`)
  }

  return videoUrl
}

async function fetchVideoBuffer(url: string, attempts = 3) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120000),
        headers: {
          'User-Agent': 'Blooma/1.0',
        },
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Failed to download generated video: ${response.status} ${response.statusText} - ${errText}`
        )
      }

      const contentType = response.headers.get('content-type') || 'video/mp4'
      const buffer = new Uint8Array(await response.arrayBuffer())

      return { buffer, contentType }
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        const delay = Math.min(4000 * attempt, 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to download generated video')
}

export async function generateVideoFromImage({
  projectId,
  frameId,
  imageUrl,
  startImageUrl,
  endImageUrl,
  prompt,
  modelId,
  aspectRatio = '16:9',
  durationSeconds = 5,
  guidanceScale,
  negativePrompt,
  seed,
}: VideoGenerationParams): Promise<VideoGenerationResult> {
  ensureFalConfigured()
  const resolvedModel = resolveModelId(modelId)
  const requiresStartEnd = START_END_MODELS.has(resolvedModel)

  const startImage = (startImageUrl || imageUrl || '').trim()
  const endImage = (endImageUrl || '').trim()

  if (!startImage) {
    throw new Error('A start image URL is required to generate a video')
  }

  if (requiresStartEnd && !endImage) {
    throw new Error(`Model "${resolvedModel}" requires an end image URL.`)
  }

  const input: Record<string, unknown> = {
    prompt: prompt || 'Animate this storyboard frame as a short cinematic clip',
  }

  // Veo 3.1 Image to Video는 image_url만 필요
  if (!requiresStartEnd && resolvedModel === 'fal-ai/veo3.1/image-to-video') {
    input.image_url = startImage
    if (aspectRatio) input.aspect_ratio = aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '16:9'
    input.duration = '8s'
    input.generate_audio = true
    input.resolution = '720p'
  } else if (requiresStartEnd) {
    if (VEO_START_END_MODELS.has(resolvedModel)) {
      input.first_frame_url = startImage
      input.last_frame_url = endImage
      if (aspectRatio) {
        const veoAspectRatio = aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : 'auto'
        input.aspect_ratio = veoAspectRatio
      } else {
        input.aspect_ratio = 'auto'
      }
      input.duration = '8s'
      input.generate_audio = true
      input.resolution = '720p'
    } else if (KLING_START_END_MODELS.has(resolvedModel)) {
      input.image_url = startImage
      input.tail_image_url = endImage
      if (aspectRatio) input.aspect_ratio = aspectRatio
      if (durationSeconds) input.duration = durationSeconds === 10 ? '10' : '5'
      if (guidanceScale !== undefined) input.cfg_scale = guidanceScale
      if (negativePrompt) input.negative_prompt = negativePrompt
    } else {
      input.start_image_url = startImage
      input.end_image_url = endImage
      if (aspectRatio) input.aspect_ratio = aspectRatio
      if (durationSeconds) input.seconds = durationSeconds
    }
  } else {
    input.image_url = startImage
    if (aspectRatio) input.aspect_ratio = aspectRatio
    if (durationSeconds) input.seconds = durationSeconds
  }

  if (guidanceScale !== undefined && !KLING_START_END_MODELS.has(resolvedModel)) {
    input.guidance_scale = guidanceScale
  }
  if (negativePrompt && !KLING_START_END_MODELS.has(resolvedModel)) {
    input.negative_prompt = negativePrompt
  }
  if (seed !== undefined) input.seed = seed

  const submission: unknown = await fal.subscribe(resolvedModel, {
    input,
    logs: true,
    onQueueUpdate(status) {
      if (status.status === 'IN_PROGRESS') {
        console.log(`[videoProviders][${resolvedModel}]`, status.status)
      }
    },
  })

  const rawUrl = extractVideoUrl(submission, resolvedModel)
  let uploadResult: UploadResult | null = null
  let finalUrl: string | null = null
  let contentType: string | null = null

  try {
    const downloaded = await fetchVideoBuffer(rawUrl)
    contentType = downloaded.contentType
    uploadResult = await uploadVideoToR2({
      projectId,
      frameId,
      buffer: downloaded.buffer,
      contentType,
      kind: 'storyboard',
    })

    finalUrl = uploadResult.publicUrl || uploadResult.signedUrl || null
  } catch (error) {
    console.error('[videoProviders] Failed to cache video to R2. Falling back to provider URL.', {
      model: resolvedModel,
      error,
    })
    finalUrl = rawUrl
  }

  if (!finalUrl) {
    throw new Error('Video generation completed but no accessible URL is available')
  }

  return {
    videoUrl: finalUrl,
    signedUrl: uploadResult?.signedUrl,
    key: uploadResult?.key ?? null,
    contentType: uploadResult?.contentType ?? contentType ?? 'video/mp4',
    provider: resolvedModel,
    rawUrl,
  }
}
