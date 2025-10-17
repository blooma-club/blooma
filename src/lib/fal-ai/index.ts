/* eslint-disable @typescript-eslint/no-explicit-any -- Fal client responses are highly dynamic and currently lack stable typings */

import { fal } from '@fal-ai/client'

const FALLBACK_PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAAAAgAB9HFkPgAAAABJRU5ErkJggg=='

function createPlaceholderImageResult(reason: string) {
  const warning = reason && reason.trim().length > 0 ? reason : 'Image generation placeholder used.'
  return {
    success: true as const,
    imageUrl: FALLBACK_PLACEHOLDER_IMAGE,
    imageUrls: [FALLBACK_PLACEHOLDER_IMAGE],
    warning,
  }
}

// Fal AI 모델 정의
export interface FalAIModel {
  id: string
  name: string
  description: string
  category: 'image-generation' | 'image-enhancement' | 'upscaling' | 'inpainting'
  maxResolution: string
  stylePresets: string[]
  quality: 'fast' | 'balanced' | 'high'
  cost: number
  inputSchema: Record<string, any>
}

// 지원하는 Fal AI 모델들 
export const FAL_AI_MODELS: FalAIModel[] = [
  {
    id: 'fal-ai/imagen4',
    name: 'Imagen 4',
    description: 'Google latest image generation model, highest quality and accuracy',
    category: 'image-generation',
    maxResolution: '1024x1024',
    stylePresets: ['photorealistic', 'detailed', 'artistic', 'cinematic'],
    quality: 'high',
    cost: 3,
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
    stylePresets: ['photorealistic', 'ultra-detailed', 'artistic', 'cinematic'],
    quality: 'high',
    cost: 4,
    inputSchema: {
      prompt: 'string',
      negative_prompt: 'string?',
      width: 'number?',
      height: 'number?',
      num_inference_steps: 'number?'
    }
  },
  {
    id: 'fal-ai/flux-pro/kontext',
    name: 'Flux.1 Kontext [pro] (Image-to-Image)',
    description: 'Kontext [pro] image-to-image with strong prompt adherence and reference fidelity',
    category: 'image-generation',
    maxResolution: '1024x1024',
    stylePresets: ['photorealistic', 'cinematic', 'artistic', 'commercial'],
    quality: 'high',
    cost: 3,
    inputSchema: {
      prompt: 'string',
      aspect_ratio: 'string?',
      guidance_scale: 'number?',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/flux-pro/v1.1-ultra',
    name: 'Flux 1.1 Pro',
    description: 'Flux 1.1 Pro high quality text-to-image generation',
    category: 'image-generation',
    maxResolution: '1024x1024',
    stylePresets: ['photorealistic', 'ultra-detailed', 'artistic', 'cinematic'],
    quality: 'high',
    cost: 4,
    inputSchema: {
      prompt: 'string',
      aspect_ratio: 'string?',
      guidance_scale: 'number?',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/flux-pro-ultra',
    name: 'Flux Pro Ultra',
    description: 'Flux Pro ultra high quality version, maximum performance and detail',
    category: 'image-generation',
    maxResolution: '1024x1024',
    stylePresets: ['photorealistic', 'ultra-detailed', 'artistic', 'cinematic'],
    quality: 'high',
    cost: 4,
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
    description: 'Google Gemini 2.5 Flash Image for multi-image editing and generation (Image to Image)',
    category: 'inpainting',
    maxResolution: '1024x1024',
    stylePresets: ['photorealistic', 'artistic', 'cinematic', 'detailed'],
    quality: 'high',
    cost: 3,
    inputSchema: {
      prompt: 'string',
      image_urls: 'list<string>',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/gemini-25-flash-image/text-to-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Google Gemini 2.5 Flash Image for text-to-image generation',
    category: 'image-generation',
    maxResolution: '1024x1024',
    stylePresets: ['photorealistic', 'artistic', 'cinematic', 'detailed'],
    quality: 'high',
    cost: 3,
    inputSchema: {
      prompt: 'string',
      num_images: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/bytedance/seedream/v4/text-to-image',
    name: 'Seedream 4.0 Text to Image',
    description: 'ByteDance Seedream 4.0 - unified architecture for image generation and editing',
    category: 'image-generation',
    maxResolution: '4096x4096',
    stylePresets: ['photorealistic', 'artistic', 'cinematic', 'detailed', 'commercial'],
    quality: 'high',
    cost: 3,
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
  {
    id: 'fal-ai/flux/dev',
    name: 'Flux Dev',
    description: 'Flux Dev text-to-image model with broad availability and balanced quality',
    category: 'image-generation',
    maxResolution: '1536x1536',
    stylePresets: ['photorealistic', 'cinematic', 'artistic'],
    quality: 'balanced',
    cost: 2,
    inputSchema: {
      prompt: 'string',
      image_size: 'string?',
      guidance_scale: 'number?',
      num_inference_steps: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/flux/general',
    name: 'Flux General',
    description: 'Flux General-purpose generator with support for LoRAs and control signals',
    category: 'image-generation',
    maxResolution: '1536x1536',
    stylePresets: ['photorealistic', 'stylized', 'cinematic', 'commercial'],
    quality: 'balanced',
    cost: 2,
    inputSchema: {
      prompt: 'string',
      image_size: 'string?',
      guidance_scale: 'number?',
      num_inference_steps: 'number?',
      output_format: 'string?'
    }
  },
  {
    id: 'fal-ai/stable-diffusion-v35-large',
    name: 'Stable Diffusion 3.5 Large',
    description: 'Stable Diffusion 3.5 Large text-to-image generation',
    category: 'image-generation',
    maxResolution: '1536x1536',
    stylePresets: ['photorealistic', 'illustrative', 'concept art'],
    quality: 'balanced',
    cost: 2,
    inputSchema: {
      prompt: 'string',
      image_size: 'string?',
      guidance_scale: 'number?',
      num_inference_steps: 'number?',
      output_format: 'string?'
    }
  }
]

// 기본 모델 설정 (프로덕션용)
export const DEFAULT_MODEL = 'fal-ai/flux-pro/kontext'

// Fal AI 클라이언트 초기화
let falConfigured = false

export function initializeFalAI(): boolean {
  if (falConfigured) return true

  const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY

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
    case 'fal-ai/flux-pro/kontext':
      enhancedPrompt = `${basePrompt}, maximum quality, frontier image generation, highly detailed, professional photography, flawless typography`
      break
    case 'fal-ai/flux-pro/v1.1-ultra':
      enhancedPrompt = `${basePrompt}, ultra detailed, photorealistic rendering, strong prompt adherence`
      break
    case 'fal-ai/flux-pro-ultra':
      enhancedPrompt = `${basePrompt}, ultra maximum quality, frontier image generation, highly detailed, professional photography, ultra resolution`
      break
    case 'fal-ai/gemini-25-flash-image/edit':
      enhancedPrompt = `${basePrompt}, maintain composition and subject layout from reference images`
      break
    case 'fal-ai/gemini-25-flash-image/text-to-image':
      enhancedPrompt = `${basePrompt}, high quality, detailed, professional photography, Gemini 2.5 Flash optimized`
      break
    case 'fal-ai/bytedance/seedream/v4/text-to-image':
      enhancedPrompt = `${basePrompt}, high quality, detailed, professional photography, Seedream 4.0 optimized, unified generation and editing`
      break
    case 'fal-ai/flux/dev':
      enhancedPrompt = `${basePrompt}, vibrant lighting, cinematic detail, flux dev optimized`
      break
    case 'fal-ai/flux/general':
      enhancedPrompt = `${basePrompt}, highly detailed, stylized cinematic render, flux general tuned`
      break
    case 'fal-ai/stable-diffusion-v35-large':
      enhancedPrompt = `${basePrompt}, sd3.5 large quality, photorealistic detailing, professional lighting`
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

function resolveSteps(quality?: 'fast' | 'balanced' | 'high'): number {
  switch (quality) {
    case 'high':
      return 40
    case 'fast':
      return 18
    default:
      return 28
  }
}

function resolveGuidance(quality?: 'fast' | 'balanced' | 'high'): number {
  switch (quality) {
    case 'high':
      return 7
    case 'fast':
      return 3
    default:
      return 5
  }
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
    quality?: 'fast' | 'balanced' | 'high'
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

  const hasCredentials =
    !!process.env.FAL_KEY?.trim()?.length || !!process.env.NEXT_PUBLIC_FAL_KEY?.trim()?.length

  if (!hasCredentials) {
    console.warn('[FAL] No FAL credentials detected. Falling back to placeholder image.')
    return createPlaceholderImageResult('FAL credentials are not configured. Placeholder image returned.')
  }

  const fallbackModels = [
    modelId,
    'fal-ai/flux-pro/kontext',
    'fal-ai/flux/dev',
    'fal-ai/flux/general',
    'fal-ai/stable-diffusion-v35-large',
    'fal-ai/flux-pro/v1.1-ultra',
    'fal-ai/bytedance/seedream/v4/text-to-image',
  ].filter((id, idx, arr) => arr.indexOf(id) === idx)

  let lastError: unknown = null
  let lastStatus: number | undefined

  for (const candidateModel of fallbackModels) {
    const enhancedPrompt = generateModelSpecificPrompt(
      prompt,
      candidateModel,
      options.style,
      options.aspectRatio
    )

    try {
      console.log(`[FAL] Generating image with model: ${candidateModel}`)
      console.log(`[FAL] Enhanced prompt: ${enhancedPrompt}`)

      const result = await generateImageByModel(candidateModel, enhancedPrompt, options)

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
  options: any
): Promise<string | string[]> {

  switch (modelId) {
    case 'fal-ai/imagen4':
      return await generateWithImagen4(prompt, options)
    
    case 'fal-ai/imagen4-ultra':
      return await generateWithImagen4Ultra(prompt, options)
    
    case 'fal-ai/flux-pro/kontext':
      return await generateWithFluxProKontextPro(prompt, options)
    
    case 'fal-ai/flux-pro/v1.1-ultra':
      return await generateWithFluxProV11Ultra(prompt, options)

    case 'fal-ai/flux-pro-ultra':
      return await generateWithFluxProUltra(prompt, options)
    
    case 'fal-ai/gemini-25-flash-image/edit':
      return await generateWithGemini25FlashImageEdit(prompt, options)

    case 'fal-ai/gemini-25-flash-image/text-to-image':
      return await generateWithGemini25FlashImageTextToImage(prompt, options)

    case 'fal-ai/flux/dev':
      return await generateWithFluxDev(prompt, options)

    case 'fal-ai/flux/general':
      return await generateWithFluxGeneral(prompt, options)

    case 'fal-ai/stable-diffusion-v35-large':
      return await generateWithStableDiffusion35Large(prompt, options)

    case 'fal-ai/bytedance/seedream/v4/text-to-image':
      return await generateWithSeedreamV4(prompt, options)
    
    default:
      throw new Error(`Unsupported model: ${modelId}`)
  }
}

// Imagen 4 모델
async function generateWithImagen4(prompt: string, options: any): Promise<string> {
  const aspectRatio = (options.aspectRatio || '1:1').replace(/\s+/g, '')
  const submission: any = await fal.subscribe('fal-ai/imagen4/preview', {
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted'
    }
  })

  return extractImageUrl(submission, 'imagen4')
}

// Imagen 4 Ultra 모델
async function generateWithImagen4Ultra(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/imagen4/preview/ultra', {
    input: {
      prompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted',
    }
  })

  return extractImageUrl(submission, 'imagen4-ultra')
}

// Flux Pro Ultra 모델
async function generateWithFluxProUltra(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/flux-pro-ultra', {
    input: {
      prompt,
      aspect_ratio: options.aspectRatio || '1:1',
      guidance_scale: options.guidanceScale || 3.5,
      num_images: options.numImages || 1,
      output_format: options.outputFormat || 'jpeg',
      safety_tolerance: options.safetyTolerance || '2'
    } as any,
    logs: true,
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][flux-pro-ultra]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'flux-pro-ultra')
}

// Flux 1.1 Pro 모델
async function generateWithFluxProV11Ultra(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
    input: {
      prompt,
      aspect_ratio: options.aspectRatio || '1:1',
      guidance_scale: options.guidanceScale || 3.5,
      num_images: options.numImages || 1,
      output_format: options.outputFormat || 'jpeg',
      safety_tolerance: options.safetyTolerance || '2'
    } as any,
    logs: true,
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][flux-pro-v1.1-ultra]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'flux-pro-v1.1-ultra')
}

// Flux.1 Kontext [pro] 모델 (이미지-투-이미지)
async function generateWithFluxProKontextPro(prompt: string, options: any): Promise<string> {
  const inputPayload: any = {
    prompt,
    aspect_ratio: options.aspectRatio || '1:1',
    guidance_scale: options.guidanceScale || 3.5,
    num_images: options.numImages || 1,
    output_format: options.outputFormat || 'jpeg',
    safety_tolerance: options.safetyTolerance || '2'
  }

  // Add image input if available (for image-to-image generation)
  if (options.imageUrls && options.imageUrls.length > 0) {
    inputPayload.image_url = options.imageUrls[0]
    inputPayload.strength = 0.75 // Controls how much the input image influences the result
  }

  const submission: any = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: inputPayload,
    logs: true,
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][flux-pro-kontext-pro]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'flux-pro-kontext-pro')
}

// Gemini 2.5 Flash Image Edit 모델 (멀티 이미지 편집)
async function generateWithGemini25FlashImageEdit(prompt: string, options: any): Promise<string[]> {
  const submission: any = await fal.subscribe('fal-ai/gemini-25-flash-image/edit', {
    input: {
      prompt,
      image_urls: options.imageUrls || [],
      num_images: options.numImages || 1,
      output_format: options.outputFormat || 'jpeg'
    },
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][gemini-25-flash-image-edit]', update.status)
      }
    }
  })

  return extractImageUrls(submission, 'gemini-25-flash-image-edit')
}

// Gemini 2.5 Flash Image Text to Image 모델 (텍스트에서 이미지 생성)
async function generateWithGemini25FlashImageTextToImage(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/gemini-25-flash-image/text-to-image', {
    input: {
      prompt,
      num_images: options.numImages || 1,
      output_format: options.outputFormat || 'jpeg'
    },
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][gemini-25-flash-image-text-to-image]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'gemini-25-flash-image-text-to-image')
}


// Flux Dev 모델
async function generateWithFluxDev(prompt: string, options: any): Promise<string> {
  const imageSize = mapAspectRatioToImageSize(options.aspectRatio)
  const inputPayload: any = {
    prompt,
    guidance_scale: resolveGuidance(options.quality),
    num_inference_steps: resolveSteps(options.quality),
    num_images: options.numImages || 1,
    output_format: options.outputFormat || 'jpeg',
    sync_mode: true,
  }

  if (imageSize) {
    inputPayload.image_size = imageSize
  }

  const submission: any = await fal.subscribe('fal-ai/flux/dev', {
    input: inputPayload,
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][flux-dev]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'flux-dev')
}

// Flux General 모델
async function generateWithFluxGeneral(prompt: string, options: any): Promise<string> {
  const imageSize = mapAspectRatioToImageSize(options.aspectRatio)
  const inputPayload: any = {
    prompt,
    guidance_scale: resolveGuidance(options.quality),
    num_inference_steps: resolveSteps(options.quality),
    num_images: options.numImages || 1,
    output_format: options.outputFormat || 'jpeg',
    sync_mode: true,
  }

  if (imageSize) {
    inputPayload.image_size = imageSize
  }

  const submission: any = await fal.subscribe('fal-ai/flux/general', {
    input: inputPayload,
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][flux-general]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'flux-general')
}

// Stable Diffusion 3.5 Large 모델
async function generateWithStableDiffusion35Large(prompt: string, options: any): Promise<string> {
  const imageSize = mapAspectRatioToImageSize(options.aspectRatio)
  const inputPayload: any = {
    prompt,
    guidance_scale: resolveGuidance(options.quality),
    num_inference_steps: resolveSteps(options.quality),
    num_images: options.numImages || 1,
    output_format: options.outputFormat || 'jpeg',
    enable_safety_checker: true,
    sync_mode: true,
  }

  if (imageSize) {
    inputPayload.image_size = imageSize
  }

  const submission: any = await fal.subscribe('fal-ai/stable-diffusion-v35-large', {
    input: inputPayload,
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][stable-diffusion-v35-large]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'stable-diffusion-v35-large')
}


// Seedream 4.0 Text to Image 모델
async function generateWithSeedreamV4(prompt: string, options: any): Promise<string> {
  // 비율을 Seedream 4.0 형식으로 변환
  let imageSize: string | { width: number; height: number } = 'square_hd'
  
  if (options.aspectRatio) {
    switch (options.aspectRatio) {
      case '1:1':
        imageSize = 'square_hd'
        break
      case '16:9':
        imageSize = 'landscape_16_9'
        break
      case '9:16':
        imageSize = 'portrait_16_9'
        break
      case '4:3':
        imageSize = 'landscape_4_3'
        break
      case '3:4':
        imageSize = 'portrait_4_3'
        break
      default:
        imageSize = 'square_hd'
    }
  } else if (options.width && options.height) {
    imageSize = {
      width: Math.min(Math.max(options.width, 1024), 4096),
      height: Math.min(Math.max(options.height, 1024), 4096)
    }
  }

  const submission: any = await fal.subscribe('fal-ai/bytedance/seedream/v4/text-to-image', {
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
    onQueueUpdate(update: any) {
      if (update?.status === 'IN_PROGRESS') {
        console.log('[FAL][seedream-v4]', update.status)
      }
    }
  })

  return extractImageUrl(submission, 'seedream-v4')
}

// 이미지 URL 추출 (모든 모델 공통)
function extractImageUrl(submission: any, modelName: string): string {
  const elapsed = Date.now()
  
  let imageUrl: string | undefined = submission?.images?.[0]?.url
    || submission?.output?.[0]?.url
    || submission?.image?.url
    || submission?.data?.[0]?.url
    || submission?.result?.[0]?.url
    || submission?.artifacts?.[0]?.url

  // 깊은 스캔으로 URL 찾기
  if (!imageUrl && submission && typeof submission === 'object') {
    try {
      const stack: any[] = [submission]
      const seen = new Set<any>()
      
      while (stack.length) {
        const current = stack.pop()
        if (!current || typeof current !== 'object' || seen.has(current)) continue
        
        seen.add(current)
        if (Array.isArray(current)) {
          for (const item of current) stack.push(item)
          continue
        }
        
        if (!imageUrl && typeof current.url === 'string' && /^https?:\/\//.test(current.url)) {
          imageUrl = current.url
          break
        }
        
        for (const key of Object.keys(current)) {
          stack.push(current[key])
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
function extractImageUrls(submission: any, modelName: string): string[] {
  const elapsed = Date.now()
  
  let images: any[] = submission?.images || submission?.output || submission?.data || submission?.result || submission?.artifacts || []
  
  // 깊은 스캔으로 이미지 배열 찾기
  if (!Array.isArray(images) || images.length === 0) {
    if (submission && typeof submission === 'object') {
      try {
        const stack: any[] = [submission]
        const seen = new Set<any>()
        
        while (stack.length) {
          const current = stack.pop()
          if (!current || typeof current !== 'object' || seen.has(current)) continue
          
          seen.add(current)
          if (Array.isArray(current) && current.length > 0 && typeof current[0] === 'object' && current[0].url) {
            images = current
            break
          }
          
          for (const key of Object.keys(current)) {
            stack.push(current[key])
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

// 모델 비용 계산
export function calculateModelCost(modelId: string, quality: 'fast' | 'balanced' | 'high' = 'balanced'): number {
  const model = getModelInfo(modelId)
  if (!model) return 0
  
  let costMultiplier = 1
  switch (quality) {
    case 'fast':
      costMultiplier = 0.8
      break
    case 'high':
      costMultiplier = 1.5
      break
  }
  
  return model.cost * costMultiplier
}
