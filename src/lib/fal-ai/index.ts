import { fal } from '@fal-ai/client'
import type { ImageSize } from '@fal-ai/client/endpoints'
import type { FalAIModel, FalAIInputSchema, FalAISubmission, FalAIGenerationOptions, FalAIGenerationResult, FalAISubmissionUpdate, FalAIImageResult } from './types'
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
    id: 'fal-ai/imagen4',
    name: 'Imagen 4',
    description: 'Google latest image generation model, highest quality and accuracy',
    category: 'image-generation',
    maxResolution: '1024x1024',
    credits: 3,
    inputSchema: {
      prompt: 'string',
      negative_prompt: 'string?',
      width: 'number?',
      height: 'number?',
      num_inference_steps: 'number?'
    }
  },
  {
    id: 'fal-ai/imagen4-ultra',
    name: 'Imagen 4 Ultra',
    description: 'Google Imagen 4 ultra high quality version, maximum detail and accuracy',
    category: 'image-generation',
    maxResolution: '1024x1024',
    credits: 4,
    inputSchema: {
      prompt: 'string',
      negative_prompt: 'string?',
      width: 'number?',
      height: 'number?',
      num_inference_steps: 'number?'
    }
  },
  {
    id: 'fal-ai/flux-pro/v1.1-ultra',
    name: 'Flux 1.1 Pro',
    description: 'Flux 1.1 Pro high quality generation',
    category: 'image-generation',
    maxResolution: '1024x1024',
    credits: 4,
    inputSchema: {
      prompt: 'string',
      aspect_ratio: 'string?',
      guidance_scale: 'number?',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/gemini-25-flash-image/edit',
    name: 'Gemini 2.5 Flash Image Edit',
    description: 'Google Gemini 2.5 Flash Image for multi-image editing and generation',
    category: 'inpainting',
    maxResolution: '1024x1024',
    credits: 3,
    inputSchema: {
      prompt: 'string',
      image_urls: 'list<string>',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/bytedance/seedream/v4/edit',
    name: 'Seedream v4 Edit',
    description: 'ByteDance Seedream 4.0 Edit - unified image generation and editing model',
    category: 'inpainting',
    maxResolution: '2048x2048',
    credits: 2,
    inputSchema: {
      prompt: 'string',
      image_urls: 'list<string>',
      image_size: 'string?',
      num_images: 'number?',
      max_images: 'number?',
      seed: 'number?',
      enable_safety_checker: 'boolean?'
    }
  },
  {
    id: 'fal-ai/gemini-25-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Google Gemini 2.5 Flash Image for generation',
    category: 'image-generation',
    maxResolution: '1024x1024',
    credits: 3,
    inputSchema: {
      prompt: 'string',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/bytedance/seedream/v4/text-to-image',
    name: 'Seedream 4.0',
    description: 'ByteDance Seedream 4.0 - unified architecture for image generation and editing',
    category: 'image-generation',
    maxResolution: '4096x4096',
    credits: 3,
    inputSchema: {
      prompt: 'string',
      image_size: 'string | object?',
      num_images: 'number?',
      max_images: 'number?',
      seed: 'number?',
      sync_mode: 'boolean?',
      enable_safety_checker: 'boolean?'
    }
  },
  // Veo 3.1 Image to Video
  {
    id: 'fal-ai/veo3.1/image-to-video',
    name: 'Veo 3.1 Image to Video',
    description: 'Google Veo 3.1 image-to-video generation model.',
    category: 'video-generation',
    maxResolution: '1920x1080',
    credits: 30,
    inputSchema: {
      image_url: 'string',
      prompt: 'string',
      aspect_ratio: 'string?',
      duration: 'string?',
      generate_audio: 'boolean?',
      resolution: 'string?',
    },
  },
  // Veo 3.1 First Frame to End Frame
  {
    id: 'fal-ai/veo3.1/first-last-frame-to-video',
    name: 'Veo 3.1 First-Last Frame to Video',
    description: 'Google Veo 3.1 first and last frame guided video generation.',
    category: 'video-generation',
    maxResolution: '1920x1080',
    credits: 40,
    inputSchema: {
      first_frame_url: 'string',
      last_frame_url: 'string',
      prompt: 'string',
      duration: 'string?',
      aspect_ratio: 'string?',
      resolution: 'string?',
      generate_audio: 'boolean?',
    }
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
    }
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
    }
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
    }
  }
]

// 기본 모델 설정 (프로덕션용)
export const DEFAULT_MODEL = 'fal-ai/gemini-25-flash-image'

export const IMAGE_TO_VIDEO_MODEL_IDS = [
  'fal-ai/veo3.1/image-to-video',
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'fal-ai/kling-video/v2.5-turbo/standard/image-to-video',
]

export const START_TO_END_FRAME_MODEL_IDS = [
  'fal-ai/veo3.1/first-last-frame-to-video',
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

// 모델별 프롬프트 생성
export function generateModelSpecificPrompt(
  basePrompt: string, 
  modelId: string, 
  style?: string,
  aspectRatio?: string
): string {
  const model = FAL_AI_MODELS.find(m => m.id === modelId)
  if (!model) {
    console.warn(`Unknown model: ${modelId}, using default`)
    return basePrompt
  }

  let enhancedPrompt = basePrompt

  // 모델별 프롬프트 최적화
  switch (modelId) {
    case 'fal-ai/imagen4':
      enhancedPrompt = `${basePrompt}, ultra detailed, 8K resolution, professional photography, HDR lighting`
      break
    case 'fal-ai/imagen4-ultra':
      enhancedPrompt = `${basePrompt}, ultra detailed, 8K resolution, professional photography, HDR lighting, maximum quality`
      break
    case 'fal-ai/flux-pro/v1.1-ultra':
      enhancedPrompt = `${basePrompt}, ultra detailed, photorealistic rendering, strong prompt adherence`
      break
    case 'fal-ai/gemini-25-flash-image/edit':
      enhancedPrompt = `${basePrompt}, maintain composition and subject layout from reference images`
      break
    case 'fal-ai/gemini-25-flash-image':
      enhancedPrompt = `${basePrompt}, high quality, detailed, professional photography, Gemini 2.5 Flash optimized`
      break
    case 'fal-ai/bytedance/seedream/v4/text-to-image':
      enhancedPrompt = `${basePrompt}, high quality, detailed, professional photography, Seedream 4.0 optimized, unified generation and editing`
      break
    case 'fal-ai/bytedance/seedream/v4/edit':
      enhancedPrompt = `${basePrompt}, maintain composition and subject layout from reference images, Seedream 4.0 edit optimized`
      break
  }

  // 스타일 추가
  if (style) {
    enhancedPrompt += `, ${style} style`
  }

  // 비율 추가
  if (aspectRatio) {
    enhancedPrompt += `, ${aspectRatio} aspect ratio`
  }

  return enhancedPrompt
}

function mapAspectRatioToImageSize(aspectRatio?: string): [number, number] {
  if (!aspectRatio) return [1024, 1024] // default square

  const normalized = aspectRatio.replace(/\s+/g, '').toLowerCase()
  switch (normalized) {
    case '1:1':
      return [1024, 1024]
    case '3:4':
      return [1024, 1365]
    case '4:3':
      return [1365, 1024]
    case '16:9':
      return [1536, 864]
    case '9:16':
      return [864, 1536]
    default:
      return [1024, 1024]
  }
}

function resolveOutputFormat(format?: string): 'jpeg' | 'png' {
  return format === 'png' ? 'png' : 'jpeg'
}

type SeedreamImageSize =
  | ImageSize
  | 'square_hd'
  | 'square'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'landscape_16_9'
  | 'auto'
  | 'auto_2K'
  | 'auto_4K'

const clampSeedreamDimension = (value: number) => Math.min(Math.max(value, 1024), 4096)

function resolveSeedreamImageSize(options: FalAIGenerationOptions): SeedreamImageSize {
  if (options.aspectRatio) {
    switch (options.aspectRatio) {
      case '1:1':
        return 'square_hd'
      case '16:9':
        return 'landscape_16_9'
      case '9:16':
        return 'portrait_16_9'
      case '4:3':
        return 'landscape_4_3'
      case '3:4':
        return 'portrait_4_3'
      default:
        return 'square_hd'
    }
  }

  if (options.width && options.height) {
    return {
      width: clampSeedreamDimension(options.width),
      height: clampSeedreamDimension(options.height),
    }
  }

  return 'square_hd'
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
    enhancePrompt?: boolean
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
    return createPlaceholderImageResult('FAL credentials are not configured. Placeholder image returned.')
  }

  const { enhancePrompt = true, ...generationOptions } = options
  const fallbackModels = [
    modelId,
    'fal-ai/gemini-25-flash-image',
    'fal-ai/flux-pro/v1.1-ultra',
    'fal-ai/bytedance/seedream/v4/text-to-image',
  ].filter((id, idx, arr) => arr.indexOf(id) === idx)

  let lastError: unknown = null
  let lastStatus: number | undefined

  for (const candidateModel of fallbackModels) {
    const promptForModel = enhancePrompt
      ? generateModelSpecificPrompt(
          prompt,
          candidateModel,
          generationOptions.style,
          generationOptions.aspectRatio
        )
      : prompt

    try {
      console.log(`[FAL] Generating image with model: ${candidateModel}`)
      if (enhancePrompt) {
        console.log(`[FAL] Enhanced prompt: ${promptForModel}`)
      } else {
        console.log('[FAL] Prompt enhancement disabled; using raw prompt.')
      }

      const result = await generateImageByModel(candidateModel, promptForModel, {
        ...generationOptions,
        prompt: promptForModel,
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
        const statusLabel = typeof maybeStatus === 'number' ? `status ${maybeStatus}` : 'access error'
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
      const nestedMessage = [
        bodyRecord.message,
        bodyRecord.detail,
        bodyRecord.error,
      ].find(value => typeof value === 'string' && value.trim().length > 0) as string | undefined
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

  return /(forbidden|unauthorized|permission|credential|api key|quota|payment|upgrade)/i.test(message)
}

// 모델별 이미지 생성 구현
async function generateImageByModel(
  modelId: string,
  prompt: string,
  options: FalAIGenerationOptions
): Promise<string | string[]> {

  switch (modelId) {
    case 'fal-ai/imagen4':
      return await generateWithImagen4(prompt, options)
    
    case 'fal-ai/imagen4-ultra':
      return await generateWithImagen4Ultra(prompt, options)
    
    case 'fal-ai/flux-pro/v1.1-ultra':
      return await generateWithFluxProV11Ultra(prompt, options)

    case 'fal-ai/gemini-25-flash-image/edit':
      return await generateWithGemini25FlashImageEdit(prompt, options)

    case 'fal-ai/gemini-25-flash-image/text-to-image':
      return await generateWithGemini25FlashImageTextToImage(prompt, options)

    case 'fal-ai/bytedance/seedream/v4/text-to-image':
      return await generateWithSeedreamV4(prompt, options)
    
    case 'fal-ai/bytedance/seedream/v4/edit':
      return await generateWithSeedreamV4Edit(prompt, options)
    
    default:
      throw new Error(`Unsupported model: ${modelId}`)
  }
}

// Imagen 4 모델
async function generateWithImagen4(prompt: string, options: FalAIGenerationOptions): Promise<string> {
  const aspectRatio = (options.aspectRatio || '1:1').replace(/\s+/g, '')
  const submission = (await fal.subscribe('fal-ai/imagen4/preview', {
    input: {
      prompt,
      // @ts-expect-error - Fal client types may not include all model-specific fields
      aspect_ratio: aspectRatio,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted'
    }
  })) as unknown as FalAISubmission

  return extractImageUrl(submission, 'imagen4')
}

// Imagen 4 Ultra 모델
async function generateWithImagen4Ultra(prompt: string, options: FalAIGenerationOptions): Promise<string> {
  const submission = (await fal.subscribe('fal-ai/imagen4/preview/ultra', {
    input: {
      prompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted',
    }
  })) as unknown as FalAISubmission

  return extractImageUrl(submission, 'imagen4-ultra')
}

// Flux 1.1 Pro 모델
async function generateWithFluxProV11Ultra(prompt: string, options: FalAIGenerationOptions): Promise<string> {
  const outputFormat = resolveOutputFormat(options.outputFormat)
  const submission = (await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
    input: {
      prompt,
      aspect_ratio: (options.aspectRatio || '1:1') as string,
      // @ts-expect-error - Fal client types may not include all model-specific fields
      guidance_scale: options.guidanceScale || 3.5,
      num_images: options.numImages || 1,
      output_format: outputFormat,
      safety_tolerance: (options.safetyTolerance || '2') as '1' | '2' | '3' | '4' | '5' | '6'
    },
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][flux-pro-v1.1-ultra]', update.status)
      }
    }
  })) as unknown as FalAISubmission

  return extractImageUrl(submission, 'flux-pro-v1.1-ultra')
}

// Gemini 2.5 Flash Image Edit 모델 (멀티 이미지 편집)
async function generateWithGemini25FlashImageEdit(prompt: string, options: FalAIGenerationOptions): Promise<string[]> {
  const outputFormat = resolveOutputFormat(options.outputFormat)
  const submission = await fal.subscribe('fal-ai/gemini-25-flash-image/edit', {
    input: {
      prompt,
      image_urls: options.imageUrls || [],
      num_images: options.numImages || 1,
      output_format: outputFormat
    },
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][gemini-25-flash-image-edit]', update.status)
      }
    }
  }) as FalAISubmission

  return extractImageUrls(submission, 'gemini-25-flash-image-edit')
}

// Gemini 2.5 Flash Image Text to Image 모델 (텍스트에서 이미지 생성)
async function generateWithGemini25FlashImageTextToImage(prompt: string, options: FalAIGenerationOptions): Promise<string> {
  const outputFormat = resolveOutputFormat(options.outputFormat)
  const submission = await fal.subscribe('fal-ai/gemini-25-flash-image', {
    input: {
      prompt,
      num_images: options.numImages || 1,
      output_format: outputFormat
    },
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][gemini-25-flash-image-text-to-image]', update.status)
      }
    }
  }) as FalAISubmission

  return extractImageUrl(submission, 'gemini-25-flash-image-text-to-image')
}


// Seedream 4.0 Text to Image 모델
async function generateWithSeedreamV4(prompt: string, options: FalAIGenerationOptions): Promise<string> {
  // 비율을 Seedream 4.0 형식으로 변환
  const imageSize = resolveSeedreamImageSize(options)

  const submission = (await fal.subscribe('fal-ai/bytedance/seedream/v4/text-to-image', {
    input: {
      prompt,
      image_size: imageSize,
      num_images: options.numImages || 1,
      max_images: options.maxImages || 1,
      seed: options.seed,
      sync_mode: options.syncMode || false,
      enable_safety_checker: options.enableSafetyChecker !== false
    },
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][seedream-v4]', update.status)
      }
    }
  })) as unknown as FalAISubmission

  return extractImageUrl(submission, 'seedream-v4')
}

// Seedream 4.0 Edit 모델
async function generateWithSeedreamV4Edit(prompt: string, options: FalAIGenerationOptions): Promise<string> {
  // 비율을 Seedream 4.0 형식으로 변환
  const imageSize = resolveSeedreamImageSize(options)

  const submission = (await fal.subscribe('fal-ai/bytedance/seedream/v4/edit', {
    input: {
      prompt,
      image_urls: options.imageUrls || [],
      image_size: imageSize,
      num_images: options.numImages || 1,
      max_images: options.maxImages || 1,
      seed: options.seed,
      enable_safety_checker: options.enableSafetyChecker !== false
    },
    logs: true,
    onQueueUpdate(update: FalAISubmissionUpdate) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][seedream-v4-edit]', update.status)
      }
    }
  })) as unknown as FalAISubmission

  return extractImageUrl(submission, 'seedream-v4-edit')
}

// 이미지 URL 추출 (모든 모델 공통)
function extractImageUrl(submission: FalAISubmission, modelName: string): string {
  const elapsed = Date.now()
  
  // data 필드가 배열인지 확인
  const dataArray = Array.isArray(submission?.data) ? submission.data as FalAIImageResult[] : undefined
  
  let imageUrl: string | undefined = submission?.images?.[0]?.url
    || submission?.output?.[0]?.url
    || submission?.image?.url
    || dataArray?.[0]?.url
    || submission?.result?.[0]?.url
    || submission?.artifacts?.[0]?.url

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
        if (!imageUrl && typeof currentObj.url === 'string' && /^https?:\/\//.test(currentObj.url)) {
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
    const base64 = submission?.output?.[0]?.b64 
      || submission?.output?.[0]?.base64 
      || submission?.image?.b64
      || submission?.images?.[0]?.b64 
      || submission?.images?.[0]?.base64
    
    if (typeof base64 === 'string' && base64.length > 50) {
      imageUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
    }
  }

  if (!imageUrl) {
    console.error(`[FAL][${modelName}][empty-image]`, {
      keys: Object.keys(submission || {}),
      elapsedMs: elapsed,
      sample: JSON.stringify(submission || {}).slice(0, 900)
    })
    throw new Error(`No image generated from ${modelName}`)
  }

  console.log(`[FAL][${modelName}][image-ready]`, { elapsedMs: elapsed, url: imageUrl })
  return imageUrl
}

// 여러 이미지 URL 추출 (멀티 이미지 모델용)
function extractImageUrls(submission: FalAISubmission, modelName: string): string[] {
  const elapsed = Date.now()
  
  let images: FalAIImageResult[] = submission?.images || (submission?.output as FalAIImageResult[]) || submission?.data || submission?.result || submission?.artifacts || []
  
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
          if (Array.isArray(currentObj) && currentObj.length > 0 && typeof currentObj[0] === 'object' && currentObj[0] !== null && 'url' in currentObj[0]) {
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
      sample: JSON.stringify(submission || {}).slice(0, 900)
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
  switch (modelId) {
    case 'fal-ai/gemini-25-flash-image/edit':
      return true
    case 'fal-ai/bytedance/seedream/v4/edit':
      return true
    default:
      return false
  }
}

// 텍스트-투-이미지 전용/가능 모델 식별
export function isTextToImageModel(modelId: string): boolean {
  switch (modelId) {
    case 'fal-ai/imagen4':
    case 'fal-ai/imagen4-ultra':
    case 'fal-ai/flux-pro/v1.1-ultra':
    case 'fal-ai/gemini-25-flash-image':
    case 'fal-ai/bytedance/seedream/v4/text-to-image':
      return true
    default:
      return false
  }
}

// PromptDock에서 사용할 모델 목록 (generate는 t2i만, edit는 i2i만)
// 비디오 모드는 getVideoModelsForSelection(count)를 사용해야 함 (선택 개수에 따라 다른 모델 반환)
export function getModelsForMode(mode: 'generate' | 'edit' | 'video'): FalAIModel[] {
  if (mode === 'video') {
    // video 모드는 getVideoModelsForSelection(count)를 사용해야 함
    // 여기서는 기본값으로 image-to-video 모델만 반환 (하위 호환성)
    console.warn('[getModelsForMode] video mode should use getVideoModelsForSelection(count) instead')
    return IMAGE_TO_VIDEO_MODEL_IDS.map(id => getModelInfo(id)).filter(
      (model): model is FalAIModel => Boolean(model)
    )
  }

  if (mode === 'edit') {
    return FAL_AI_MODELS.filter(m => isImageToImageModel(m.id))
  }
  // generate 모드: 텍스트-투-이미지 모델만 노출
  return FAL_AI_MODELS.filter(m => isTextToImageModel(m.id))
}

// 비디오 선택 개수에 따른 모델 목록 반환
export function getVideoModelsForSelection(count: number): FalAIModel[] {
  const ids = count >= 2 ? START_TO_END_FRAME_MODEL_IDS : IMAGE_TO_VIDEO_MODEL_IDS
  return ids
    .map(id => getModelInfo(id))
    .filter((model): model is FalAIModel => Boolean(model))
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
export type { FalAIModel, FalAIInputSchema, FalAISubmission, FalAIGenerationOptions, FalAIGenerationResult, FalAISubmissionUpdate, FalAIImageResult }
export { isFalAIModel }
