import { fal } from '@fal-ai/client'
import type { ImageSize } from '@fal-ai/client/endpoints'
import type {
  FalAIModel,
  FalAIInputSchema,
  FalAISubmission,
  FalAIGenerationOptions,
  FalAIGenerationResult,
  FalAISubmissionUpdate,
  FalAIImageResult,
} from './types'
import { isFalAIModel } from './types'

const FALLBACK_PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAAAAgAB9HFkPgAAAABJRU5ErkJggg=='

function createPlaceholderImageResult(reason: string): FalAIGenerationResult {
  const warning = reason && reason.trim().length > 0 ? reason : 'Image generation placeholder used.'
  return {
    success: true,
    imageUrl: FALLBACK_PLACEHOLDER_IMAGE,
    imageUrls: [FALLBACK_PLACEHOLDER_IMAGE],
    warning,
  }
}

// 지원하는 Fal AI 모델들
export const FAL_AI_MODELS: FalAIModel[] = [
  {
    id: 'fal-ai/nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Fal Nano Banana Pro text-to-image generation workflow',
    category: 'image-generation',
    maxResolution: '1024x1024',
    credits: 3,
    inputSchema: {
      prompt: 'string',
      num_images: 'number?',
      output_format: 'string?',
      resolution: 'string?',
      aspect_ratio: 'string?',
    },
  },
  {
    id: 'fal-ai/nano-banana-pro/edit',
    name: 'Nano Banana Pro',
    description:
      'Fal Nano Banana Pro edit workflow - advanced image editing with improved quality and precision',
    category: 'inpainting',
    maxResolution: '2048x2048',
    credits: 5,
    inputSchema: {
      prompt: 'string',
      image_urls: 'list<string>',
      num_images: 'number?',
      output_format: 'string?',
      strength: 'number?',
      resolution: 'string?',
      aspect_ratio: 'string?',
    },
  },
  // Kling 2.1 Pro - Start Frame to End Frame
  {
    id: 'fal-ai/kling-video/v2.1/pro/image-to-video',
    name: 'Kling Video v2.1 Pro',
    description: 'Kling Video v2.1 Pro start/end frame guided video generation.',
    category: 'video-generation',
    maxResolution: '1920x1080',
    credits: 40,
    inputSchema: {
      image_url: 'string',
      tail_image_url: 'string?',
      prompt: 'string?',
      duration: 'string?',
      aspect_ratio: 'string?',
      negative_prompt: 'string?',
      cfg_scale: 'number?',
    },
  },
  // Kling 2.5 Turbo Pro - Image to Video
  {
    id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    name: 'Kling Video v2.5 Turbo Pro',
    description: 'Kling Video v2.5 Turbo Pro image-to-video generation model.',
    category: 'video-generation',
    maxResolution: '1920x1080',
    credits: 50,
    inputSchema: {
      image_url: 'string',
      prompt: 'string',
      duration: 'string?',
      negative_prompt: 'string?',
      cfg_scale: 'number?',
    },
  },
  // Kling 2.5 Turbo Standard - Image to Video
  {
    id: 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video',
    name: 'Kling Video v2.5 Turbo Standard',
    description: 'Kling Video v2.5 Turbo Standard image-to-video generation model.',
    category: 'video-generation',
    maxResolution: '1920x1080',
    credits: 40,
    inputSchema: {
      image_url: 'string',
      prompt: 'string',
      duration: 'string?',
      negative_prompt: 'string?',
      cfg_scale: 'number?',
    },
  },
]

// 기본 모델 설정 (프로덕션용)
export const DEFAULT_MODEL = 'fal-ai/nano-banana-pro/edit'

export const IMAGE_TO_VIDEO_MODEL_IDS = [
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'fal-ai/kling-video/v2.5-turbo/standard/image-to-video',
]

export const START_TO_END_FRAME_MODEL_IDS = [
  'fal-ai/kling-video/v2.1/pro/image-to-video',
]

// Fal AI 클라이언트 초기화
let falConfigured = false

export function initializeFalAI(): boolean {
  if (falConfigured) return true

  // 서버 사이드에서만 사용 - NEXT_PUBLIC_ 접두사 사용 금지 (보안 위험)
  const falKey = process.env.FAL_KEY

  if (!falKey) {
    console.warn('FAL_KEY is not configured. Image generation will not work.')
    return false
  }

  try {
    fal.config({ credentials: falKey })
    falConfigured = true
    console.log('Fal AI initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize Fal AI:', error)
    return false
  }
}

// Helper to resolve aspect ratio to model-specific format
function resolveAspectRatio(aspectRatio?: string): string {
  if (!aspectRatio) return 'auto'
  
  const normalized = aspectRatio.replace(/\s+/g, '').toLowerCase()
  switch (normalized) {
    case '1:1':
      return '1:1'
    case '16:9':
      return '16:9'
    case '9:16':
      return '9:16'
    case '4:3':
      return '4:3'
    case '3:4':
      return '3:4'
    case '3:2':
      return '3:2'
    case '2:3':
      return '2:3'
    case '5:4':
      return '5:4'
    case '4:5':
      return '4:5'
    case '21:9':
      return '21:9'
    default:
      return 'auto'
  }
}

function resolveOutputFormat(format?: string): 'jpeg' | 'png' {
  return format === 'png' ? 'png' : 'jpeg'
}


// 이미지 생성 함수 (통합)
export async function generateImageWithModel(
  prompt: string,
  modelId: string = DEFAULT_MODEL,
  options: {
    style?: string
    aspectRatio?: string
    width?: number
    height?: number
    imageUrls?: string[] // For multi-image models like Gemini
    numImages?: number
    outputFormat?: 'jpeg' | 'png'
  } = {}
): Promise<{
  success: boolean
  imageUrl?: string
  imageUrls?: string[]
  error?: string
  status?: number
  warning?: string
}> {
  if (!initializeFalAI()) {
    console.warn('[FAL] FAL_KEY is missing or invalid. Using placeholder image instead.')
    return createPlaceholderImageResult('FAL_KEY is not configured. Placeholder image returned.')
  }

  const hasCredentials = !!process.env.FAL_KEY?.trim()?.length

  if (!hasCredentials) {
    console.warn('[FAL] No FAL credentials detected. Falling back to placeholder image.')
    return createPlaceholderImageResult(
      'FAL credentials are not configured. Placeholder image returned.'
    )
  }

  const { ...generationOptions } = options
  const fallbackModels = [
    modelId,
    'fal-ai/nano-banana-pro',
    'fal-ai/nano-banana-pro/edit',
  ].filter((id, idx, arr) => arr.indexOf(id) === idx)

  let lastError: unknown = null
  let lastStatus: number | undefined

  for (const candidateModel of fallbackModels) {
    try {
      console.log(`[FAL] Generating image with model: ${candidateModel}`)

      const result = await generateImageByModel(candidateModel, prompt, {
        ...generationOptions,
        prompt,
      })

      return {
        success: true,
        imageUrl: Array.isArray(result) ? result[0] : result,
        imageUrls: Array.isArray(result) ? result : [result],
      }
    } catch (error) {
      lastError = error
      console.error(`[FAL] Model ${candidateModel} failed:`, error)

      const maybeStatus = (error as { status?: number }).status
      if (typeof maybeStatus === 'number') {
        lastStatus = maybeStatus
      }

      if (isAccessOrQuotaError(error)) {
        const formatted = formatFalError(error) || 'Forbidden'
        const statusLabel =
          typeof maybeStatus === 'number' ? `status ${maybeStatus}` : 'access error'
        const message = `FAL image generation blocked (${statusLabel}): ${formatted}. Placeholder image returned.`
        console.warn(`[FAL] ${message} (model: ${candidateModel})`)
        return createPlaceholderImageResult(message)
      }

      if (!shouldAttemptFallback(error)) {
        break
      }

      console.warn(`[FAL] Falling back to next model due to error: ${formatFalError(error)}`)
    }
  }

  const resolvedStatus = determineStatus(lastStatus, lastError)

  return {
    success: false,
    error: formatFalError(lastError) || 'Unknown error',
    ...(resolvedStatus ? { status: resolvedStatus } : {}),
  }
}

function determineStatus(possibleStatus: number | undefined, error: unknown): number | undefined {
  if (typeof possibleStatus === 'number') {
    return possibleStatus
  }

  const message = formatFalError(error)
  if (!message) return undefined

  if (/forbidden|permission|quota|insufficient/i.test(message)) {
    return 403
  }

  if (/unauthorized|auth/i.test(message)) {
    return 401
  }

  return undefined
}

function shouldAttemptFallback(error: unknown): boolean {
  if (!error) return false

  const maybeStatus = (error as { status?: number }).status
  if (typeof maybeStatus === 'number') {
    if ([429, 500, 502, 503, 504].includes(maybeStatus)) {
      return true
    }
    return false
  }

  const message = formatFalError(error)
  if (!message) return false

  return /(timeout|temporarily|unavailable|rate limit)/i.test(message)
}

function formatFalError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as { message?: string; body?: unknown }
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message
    }
    if (record.body && typeof record.body === 'object' && record.body !== null) {
      const bodyRecord = record.body as Record<string, unknown>
      const nestedMessage = [bodyRecord.message, bodyRecord.detail, bodyRecord.error].find(
        value => typeof value === 'string' && value.trim().length > 0
      ) as string | undefined
      if (nestedMessage) {
        return nestedMessage
      }
    }
  }
  return null
}

function isAccessOrQuotaError(error: unknown): boolean {
  if (!error) return false
  const maybeStatus = (error as { status?: number }).status
  if (typeof maybeStatus === 'number' && [401, 402, 403].includes(maybeStatus)) {
    return true
  }

  const message = formatFalError(error)
  if (!message) return false

  return /(forbidden|unauthorized|permission|credential|api key|quota|payment|upgrade)/i.test(
    message
  )
}

// 모델별 이미지 생성 구현
async function generateImageByModel(
  modelId: string,
  prompt: string,
  options: FalAIGenerationOptions
): Promise<string | string[]> {
  switch (modelId) {
    case 'fal-ai/nano-banana-pro':
      return await generateWithNanoBananaPro(prompt, options)

    case 'fal-ai/nano-banana-pro/edit':
      return await generateWithNanoBananaProEdit(prompt, options)

    case 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video':
    case 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video':
      return await generateWithKlingImageToVideo(modelId, prompt, options)

    case 'fal-ai/kling-video/v2.1/pro/image-to-video':
      return await generateWithKlingStartEndVideo(modelId, prompt, options)

    default:
      throw new Error(`Unsupported model: ${modelId}`)
  }
}

// Nano Banana Pro Text to Image 모델
async function generateWithNanoBananaPro(
  prompt: string,
  options: FalAIGenerationOptions
): Promise<string> {
  const outputFormat = resolveOutputFormat(options.outputFormat)
  const aspectRatio = resolveAspectRatio(options.aspectRatio)
  
  const submission = (await fal.subscribe('fal-ai/nano-banana-pro', {
    input: {
      prompt,
      num_images: options.numImages || 1,
      output_format: outputFormat,
      resolution: options.resolution || '1K',
      aspect_ratio: aspectRatio,
    },
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][nano-banana-pro]', update.status)
      }
    },
  })) as FalAISubmission

  return extractImageUrl(submission, 'nano-banana-pro')
}

// Nano Banana Pro Edit 모델 (고급 이미지 편집)
async function generateWithNanoBananaProEdit(
  prompt: string,
  options: FalAIGenerationOptions
): Promise<string> {
  const referenceImages = [options.imageUrl, ...(options.imageUrls || [])].filter(
    (value): value is string => Boolean(value && value.trim())
  )

  if (referenceImages.length === 0) {
    throw new Error('Nano Banana Pro edit requires at least one reference image')
  }

  const aspectRatio = resolveAspectRatio(options.aspectRatio)

  const submission = (await fal.subscribe('fal-ai/nano-banana-pro/edit', {
    input: {
      prompt,
      image_urls: referenceImages,
      num_images: options.numImages || 1,
      output_format: resolveOutputFormat(options.outputFormat),
      strength: options.strength,
      resolution: options.resolution || '1K',
      aspect_ratio: aspectRatio,
    },
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][nano-banana-pro-edit]', update.status)
        update.logs?.forEach(log => {
          if (log?.message) {
            console.log('[FAL][nano-banana-pro-edit]', log.message)
          }
        })
      }
    },
  })) as FalAISubmission

  return extractImageUrl(submission, 'nano-banana-pro-edit')
}

// Kling Image to Video 모델 (v2.5)
async function generateWithKlingImageToVideo(
  modelId: string,
  prompt: string,
  options: FalAIGenerationOptions
): Promise<string> {
  const imageUrl = options.imageUrl || options.imageUrls?.[0]
  if (!imageUrl) {
    throw new Error('Kling Image-to-Video requires an input image')
  }

  const submission = (await fal.subscribe(modelId, {
    input: {
      prompt,
      image_url: imageUrl,
      duration: options.duration || '5',
      negative_prompt: options.negativePrompt || 'blur, distort, and low quality',
      cfg_scale: options.guidanceScale || 0.5,
    },
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log(`[FAL][${modelId}]`, update.status)
      }
    },
  })) as FalAISubmission

  return extractVideoUrl(submission, modelId)
}

// Kling Start/End Frame Video 모델 (v2.1)
async function generateWithKlingStartEndVideo(
  modelId: string,
  prompt: string,
  options: FalAIGenerationOptions
): Promise<string> {
  const startImageUrl = options.imageUrl
  const endImageUrl = options.imageUrls?.[0] // imageUrls[0]을 end frame으로 사용

  if (!startImageUrl) {
    throw new Error('Kling Start/End Video requires a start image')
  }

  const input: any = {
    prompt: prompt || undefined, // v2.1 might treat empty prompt as optional
    image_url: startImageUrl,
    duration: options.duration || '5',
    aspect_ratio: options.aspectRatio || '16:9',
    negative_prompt: options.negativePrompt || 'blur, distort, and low quality',
    cfg_scale: options.guidanceScale || 0.5,
  }

  if (endImageUrl) {
    input.tail_image_url = endImageUrl
  }

  const submission = (await fal.subscribe(modelId, {
    input,
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log(`[FAL][${modelId}]`, update.status)
      }
    },
  })) as FalAISubmission

  return extractVideoUrl(submission, modelId)
}

// 비디오 URL 추출 헬퍼
function extractVideoUrl(submission: FalAISubmission, modelName: string): string {
  const elapsed = Date.now()
  
  let videoUrl: string | undefined = 
    (submission as any)?.video?.url || 
    (submission?.output as any)?.video?.url ||
    (submission?.data as any)?.video?.url

  if (!videoUrl && submission && typeof submission === 'object') {
     // Deep scan fallback
     try {
        const stack: unknown[] = [submission]
        while (stack.length) {
          const current = stack.pop()
          if (!current || typeof current !== 'object') continue
          
          const currentObj = current as any
          if (currentObj.video && typeof currentObj.video.url === 'string') {
            videoUrl = currentObj.video.url
            break
          }
          Object.values(currentObj).forEach(v => stack.push(v))
        }
     } catch (e) {
       console.warn('Video URL deep scan failed', e)
     }
  }

  if (!videoUrl) {
    console.error(`[FAL][${modelName}][empty-video]`, submission)
    throw new Error(`No video generated from ${modelName}`)
  }

  console.log(`[FAL][${modelName}][video-ready]`, { elapsedMs: elapsed, url: videoUrl })
  return videoUrl
}

// 이미지 URL 추출 (모든 모델 공통)
function extractImageUrl(submission: FalAISubmission, modelName: string): string {
  const elapsed = Date.now()

  // data 필드가 배열인지 확인
  const dataArray = Array.isArray(submission?.data)
    ? (submission.data as FalAIImageResult[])
    : undefined

  let imageUrl: string | undefined =
    submission?.images?.[0]?.url ||
    submission?.output?.[0]?.url ||
    submission?.image?.url ||
    dataArray?.[0]?.url ||
    submission?.result?.[0]?.url ||
    submission?.artifacts?.[0]?.url

  // 깊은 스캔으로 URL 찾기
  if (!imageUrl && submission && typeof submission === 'object') {
    try {
      const stack: unknown[] = [submission]
      const seen = new Set<unknown>()

      while (stack.length) {
        const current = stack.pop()
        if (!current || typeof current !== 'object' || seen.has(current)) continue

        seen.add(current)
        if (Array.isArray(current)) {
          for (const item of current) stack.push(item)
          continue
        }

        const currentObj = current as Record<string, unknown>
        if (
          !imageUrl &&
          typeof currentObj.url === 'string' &&
          /^https?:\/\//.test(currentObj.url)
        ) {
          imageUrl = currentObj.url
          break
        }

        for (const key of Object.keys(currentObj)) {
          stack.push(currentObj[key])
        }
      }
    } catch (scanError) {
      console.warn(`[FAL][${modelName}][scan-error]`, scanError)
    }
  }

  // Base64 처리
  if (!imageUrl) {
    const base64 =
      submission?.output?.[0]?.b64 ||
      submission?.output?.[0]?.base64 ||
      submission?.image?.b64 ||
      submission?.images?.[0]?.b64 ||
      submission?.images?.[0]?.base64

    if (typeof base64 === 'string' && base64.length > 50) {
      imageUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
    }
  }

  if (!imageUrl) {
    console.error(`[FAL][${modelName}][empty-image]`, {
      keys: Object.keys(submission || {}),
      elapsedMs: elapsed,
      sample: JSON.stringify(submission || {}).slice(0, 900),
    })
    throw new Error(`No image generated from ${modelName}`)
  }

  console.log(`[FAL][${modelName}][image-ready]`, { elapsedMs: elapsed, url: imageUrl })
  return imageUrl
}

// 여러 이미지 URL 추출 (멀티 이미지 모델용)
function extractImageUrls(submission: FalAISubmission, modelName: string): string[] {
  const elapsed = Date.now()

  let images: FalAIImageResult[] =
    submission?.images ||
    (submission?.output as FalAIImageResult[]) ||
    submission?.data ||
    submission?.result ||
    submission?.artifacts ||
    []

  // 깊은 스캔으로 이미지 배열 찾기
  if (!Array.isArray(images) || images.length === 0) {
    if (submission && typeof submission === 'object') {
      try {
        const stack: unknown[] = [submission]
        const seen = new Set<unknown>()

        while (stack.length) {
          const current = stack.pop()
          if (!current || typeof current !== 'object' || seen.has(current)) continue

          seen.add(current)
          const currentObj = current as Record<string, unknown>
          if (
            Array.isArray(currentObj) &&
            currentObj.length > 0 &&
            typeof currentObj[0] === 'object' &&
            currentObj[0] !== null &&
            'url' in currentObj[0]
          ) {
            images = currentObj as FalAIImageResult[]
            break
          }

          for (const key of Object.keys(currentObj)) {
            stack.push(currentObj[key])
          }
        }
      } catch (scanError) {
        console.warn(`[FAL][${modelName}][scan-error]`, scanError)
      }
    }
  }

  const urls: string[] = []

  for (const img of images) {
    let url: string | undefined

    // URL 찾기
    if (typeof img.url === 'string' && /^https?:\/\//.test(img.url)) {
      url = img.url
    }

    // Base64 처리
    if (!url) {
      const base64 = img.b64 || img.base64
      if (typeof base64 === 'string' && base64.length > 50) {
        url = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
      }
    }

    if (url) {
      urls.push(url)
    }
  }

  if (urls.length === 0) {
    console.error(`[FAL][${modelName}][empty-images]`, {
      keys: Object.keys(submission || {}),
      elapsedMs: elapsed,
      sample: JSON.stringify(submission || {}).slice(0, 900),
    })
    throw new Error(`No images generated from ${modelName}`)
  }

  console.log(`[FAL][${modelName}][images-ready]`, { elapsedMs: elapsed, count: urls.length })
  return urls
}

// 모델 정보 조회
export function getModelInfo(modelId: string): FalAIModel | undefined {
  return FAL_AI_MODELS.find(model => model.id === modelId)
}

// 카테고리별 모델 조회
export function getModelsByCategory(category: FalAIModel['category']): FalAIModel[] {
  return FAL_AI_MODELS.filter(model => model.category === category)
}

// 이미지 생성 모델만 조회
export function getImageGenerationModels(): FalAIModel[] {
  return getModelsByCategory('image-generation')
}

// 이미지-투-이미지 지원 모델 식별
export function isImageToImageModel(modelId: string): boolean {
  return modelId === 'fal-ai/nano-banana-pro/edit'
}

// 텍스트-투-이미지 전용/가능 모델 식별
export function isTextToImageModel(modelId: string): boolean {
  return (
    modelId === 'fal-ai/nano-banana-pro' ||
    modelId === 'fal-ai/nano-banana-pro/edit'
  )
}

// PromptDock에서 사용할 모델 목록 (nano-banana-pro/edit만 사용)
// 비디오 모드는 getVideoModelsForSelection(count)를 사용해야 함 (선택 개수에 따라 다른 모델 반환)
export function getModelsForMode(mode: 'generate' | 'edit' | 'video'): FalAIModel[] {
  if (mode === 'video') {
    // video 모드는 getVideoModelsForSelection(count)를 사용해야 함
    // 여기서는 기본값으로 image-to-video 모델만 반환 (하위 호환성)
    console.warn(
      '[getModelsForMode] video mode should use getVideoModelsForSelection(count) instead'
    )
    return IMAGE_TO_VIDEO_MODEL_IDS.map(id => getModelInfo(id)).filter(
      (model): model is FalAIModel => Boolean(model)
    )
  }

  // generate 모드: nano-banana-pro (text-to-image)
  // edit 모드: nano-banana-pro/edit (image-to-image)
  if (mode === 'edit') {
    return FAL_AI_MODELS.filter(m => m.id === 'fal-ai/nano-banana-pro/edit')
  }
  return FAL_AI_MODELS.filter(m => m.id === 'fal-ai/nano-banana-pro' || m.id === 'fal-ai/nano-banana-pro/edit')
}

// 비디오 선택 개수에 따른 모델 목록 반환
export function getVideoModelsForSelection(count: number): FalAIModel[] {
  const ids = count >= 2 ? START_TO_END_FRAME_MODEL_IDS : IMAGE_TO_VIDEO_MODEL_IDS
  return ids.map(id => getModelInfo(id)).filter((model): model is FalAIModel => Boolean(model))
}

export function isStartEndVideoModel(id: string): boolean {
  return START_TO_END_FRAME_MODEL_IDS.includes(id)
}

export function isImageToVideoModelId(id: string): boolean {
  return IMAGE_TO_VIDEO_MODEL_IDS.includes(id)
}

// 모델 크레딧 계산
export function calculateModelCredits(modelId: string): number {
  const model = getModelInfo(modelId)
  if (!model) return 0

  return model.credits
}

// 타입 re-export
export type {
  FalAIModel,
  FalAIInputSchema,
  FalAISubmission,
  FalAIGenerationOptions,
  FalAIGenerationResult,
  FalAISubmissionUpdate,
  FalAIImageResult,
}
export { isFalAIModel }
