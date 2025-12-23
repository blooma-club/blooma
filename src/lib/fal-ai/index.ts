import { fal } from '@fal-ai/client'
import type {
  FalAIModel,
  FalAISubmission,
  FalAIGenerationOptions,
  FalAIGenerationResult,
  FalAISubmissionUpdate,
  FalAIImageResult,
} from './types'

export type { FalAIModel } from './types'

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
  // Nano Banana Pro Series
  {
    id: 'fal-ai/nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Fal Nano Banana Pro text-to-image generation workflow',
    category: 'image-generation',
    maxResolution: '4K',
    credits: 50,
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
    name: 'Nano Banana Pro Edit',
    description:
      'Fal Nano Banana Pro edit workflow - advanced image editing with improved quality and precision',
    category: 'inpainting',
    maxResolution: '4K',
    credits: 50,
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

  // Nano Banana Series (Standard)
  {
    id: 'fal-ai/nano-banana',
    name: 'Nano Banana',
    description: 'Fast and efficient text-to-image generation',
    category: 'image-generation',
    maxResolution: '1K',
    credits: 15,
    inputSchema: {
      prompt: 'string',
      num_images: 'number?',
      output_format: 'string?',
      aspect_ratio: 'string?',
    },
  },
  {
    id: 'fal-ai/nano-banana/edit',
    name: 'Nano Banana Edit',
    description: 'Efficient image editing workflow',
    category: 'inpainting',
    maxResolution: '1K',
    credits: 15,
    inputSchema: {
      prompt: 'string',
      image_urls: 'list<string>',
      num_images: 'number?',
      output_format: 'string?',
      aspect_ratio: 'string?',
    },
  },

  // GPT Image 1.5 Edit
  {
    id: 'fal-ai/gpt-image-1.5/edit',
    name: 'GPT Image 1.5 Edit',
    description: 'GPT Image 1.5 edit workflow',
    category: 'inpainting',
    maxResolution: '2K',
    credits: 10,
    inputSchema: {
      prompt: 'string',
      image_url: 'string',
      mask_url: 'string?',
      num_images: 'number?',
      output_format: 'string?',
      size: 'string?',
    },
  },
]

// 기본 모델 설정 (프로덕션용)
export const DEFAULT_MODEL = 'fal-ai/gpt-image-1.5/edit'

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

function resolveOutputFormat(format?: string): 'jpeg' | 'png' | 'webp' {
  if (format === 'jpeg') return 'jpeg'
  if (format === 'webp') return 'webp'
  return 'png' // Default to PNG (same as Fal.ai)
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
    resolution?: '1K' | '2K' | '4K'
    isGenerateMode?: boolean // Generate mode에서 Edit 모델 사용 시 Custom 해상도 적용
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
    // Add appropriate fallback chain if main model fails
    modelId.includes('edit') ? 'fal-ai/nano-banana-pro/edit' : 'fal-ai/nano-banana-pro',
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

      // 상세 에러 body 로깅
      const errorBody = (error as { body?: unknown }).body
      if (errorBody) {
        console.error(`[FAL] Error body:`, JSON.stringify(errorBody, null, 2))
      }
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
  // GPT Image 1.5 Edit (Basic tier)
  if (modelId === 'fal-ai/gpt-image-1.5/edit') {
    return await generateWithGptImageEdit(prompt, options, modelId)
  }

  // Nano Banana Pro Edit (Pro tier)
  if (modelId === 'fal-ai/nano-banana-pro/edit' ||
    modelId === 'fal-ai/nano-banana/edit') {
    return await generateWithNanoBananaProEdit(prompt, options, modelId)
  }

  // Nano Banana Pro text-to-image (fallback)
  if (modelId === 'fal-ai/nano-banana-pro' ||
    modelId === 'fal-ai/nano-banana') {
    return await generateWithNanoBananaPro(prompt, options, modelId)
  }

  throw new Error(`Unsupported model: ${modelId}`)
}

// Nano Banana Pro Text to Image 모델 (Shared logic)
async function generateWithNanoBananaPro(
  prompt: string,
  options: FalAIGenerationOptions,
  modelId: string = 'fal-ai/nano-banana-pro'
): Promise<string | string[]> {
  const outputFormat = resolveOutputFormat(options.outputFormat)
  const aspectRatio = resolveAspectRatio(options.aspectRatio)
  const numImages = options.numImages || 1

  // Nano Banana Pro는 resolution 지원, Standard는 미지원
  const isPro = modelId.includes('-pro')
  const inputPayload: Record<string, unknown> = {
    prompt,
    num_images: numImages,
    output_format: outputFormat,
    aspect_ratio: aspectRatio,
  }
  if (isPro) {
    inputPayload.resolution = options.resolution || '1K'
  }

  const submission = (await fal.subscribe(modelId, {
    input: inputPayload,
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log(`[FAL][${modelId}]`, update.status)
      }
    },
  })) as FalAISubmission

  // 여러 이미지 요청 시 배열로 반환
  if (numImages > 1) {
    return extractImageUrls(submission, modelId)
  }
  return extractImageUrl(submission, modelId)
}

// Nano Banana Pro Edit 모델 (고급 이미지 편집) (Shared logic)
async function generateWithNanoBananaProEdit(
  prompt: string,
  options: FalAIGenerationOptions,
  modelId: string = 'fal-ai/nano-banana-pro/edit'
): Promise<string | string[]> {
  const referenceImages = [options.imageUrl, ...(options.imageUrls || [])].filter(
    (value): value is string => Boolean(value && value.trim())
  )

  if (referenceImages.length === 0) {
    throw new Error(`${modelId} requires at least one reference image`)
  }

  const numImages = options.numImages || 1

  const aspectRatio = resolveAspectRatio(options.aspectRatio)

  // Nano Banana Pro Edit는 resolution 지원, Standard Edit는 미지원
  const isPro = modelId.includes('-pro')
  const inputPayload: Record<string, unknown> = {
    prompt,
    image_urls: referenceImages,
    num_images: numImages,
    output_format: resolveOutputFormat(options.outputFormat),
    aspect_ratio: aspectRatio,
  }
  if (options.strength !== undefined) {
    inputPayload.strength = options.strength
  }
  if (isPro) {
    inputPayload.resolution = options.resolution || '1K'
  }

  const submission = (await fal.subscribe(modelId, {
    input: inputPayload,
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log(`[FAL][${modelId}]`, update.status)
        update.logs?.forEach(log => {
          if (log?.message) {
            console.log(`[FAL][${modelId}]`, log.message)
          }
        })
      }
    },
  })) as FalAISubmission

  // 여러 이미지 요청 시 배열로 반환
  if (numImages > 1) {
    return extractImageUrls(submission, modelId)
  }
  return extractImageUrl(submission, modelId)
}

// GPT Image 1.5 Edit
async function generateWithGptImageEdit(
  prompt: string,
  options: FalAIGenerationOptions,
  modelId: string = 'fal-ai/gpt-image-1.5/edit'
): Promise<string | string[]> {
  const referenceImages = [options.imageUrl, ...(options.imageUrls || [])].filter(
    (value): value is string => Boolean(value && value.trim())
  )

  if (referenceImages.length === 0) {
    throw new Error(`${modelId} requires at least one reference image`)
  }

  const numImages = options.numImages || 1
  const inputPayload: Record<string, unknown> = {
    prompt,
    image_urls: referenceImages,
    num_images: numImages,
    output_format: resolveOutputFormat(options.outputFormat),
    quality: 'medium', // Fixed to medium quality
    input_fidelity: 'high', // High fidelity to reference images
    background: 'auto', // Auto background handling
    image_size: '1024x1536', // Fixed portrait size (3:4 ratio)
  }

  const submission = (await fal.subscribe(modelId, {
    input: inputPayload,
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log(`[FAL][${modelId}]`, update.status)
      }
    },
  })) as FalAISubmission

  if (numImages > 1) {
    return extractImageUrls(submission, modelId)
  }
  return extractImageUrl(submission, modelId)
}

// URL이 유효한지 확인 (https:// 또는 data: URI)
function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  return /^https?:\/\//.test(url) || url.startsWith('data:')
}

// 이미지 URL 추출 (모든 모델 공통)
function extractImageUrl(submission: FalAISubmission, modelName: string): string {
  const elapsed = Date.now()

  // data 필드가 배열인지 확인
  const dataArray = Array.isArray(submission?.data)
    ? (submission.data as FalAIImageResult[])
    : undefined

  // 후보 URL들 수집
  const candidates = [
    submission?.images?.[0]?.url,
    submission?.output?.[0]?.url,
    submission?.image?.url,
    dataArray?.[0]?.url,
    submission?.result?.[0]?.url,
    submission?.artifacts?.[0]?.url,
  ]

  // 유효한 URL 찾기 (https:// 또는 data: URI)
  let imageUrl: string | undefined = candidates.find(isValidImageUrl)

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
        if (!imageUrl && isValidImageUrl(currentObj.url)) {
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

  // Base64 처리 (b64 또는 base64 필드)
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

  console.log(`[FAL][${modelName}][image-ready]`, { elapsedMs: elapsed, urlType: imageUrl.startsWith('data:') ? 'base64' : 'url' })
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

    // URL 찾기 (https:// 또는 data: URI)
    if (typeof img.url === 'string') {
      if (/^https?:\/\//.test(img.url)) {
        url = img.url
      } else if (img.url.startsWith('data:')) {
        // Some models return Base64 data URIs in the url field
        url = img.url
      }
    }

    // Base64 처리 (b64 또는 base64 필드)
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
