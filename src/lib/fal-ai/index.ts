import { fal } from '@fal-ai/client'

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
    id: 'fal-ai/flux-pro/kontext/text-to-image',
    name: 'Flux.1 Kontext [pro]',
    description: 'Kontext [pro] text-to-image with strong prompt adherence and photorealism',
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
  }
]

// 기본 모델 설정 (프로덕션용)
export const DEFAULT_MODEL = 'fal-ai/flux-pro/kontext/text-to-image'

// Fal AI 클라이언트 초기화
export function initializeFalAI(): void {
  const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY
  
  if (!falKey) {
    console.warn('FAL_KEY is not configured. Image generation will not work.')
    return
  }

  try {
    fal.config({ credentials: falKey })
    console.log('Fal AI initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Fal AI:', error)
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
    case 'fal-ai/flux-pro/kontext/text-to-image':
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
): Promise<{ success: boolean; imageUrl?: string; imageUrls?: string[]; error?: string }> {
  try {
    // Fal AI 초기화 확인
    if (!process.env.FAL_KEY && !process.env.NEXT_PUBLIC_FAL_KEY) {
      throw new Error('FAL_KEY is not configured')
    }

    // 모델별 프롬프트 생성
    const enhancedPrompt = generateModelSpecificPrompt(
      prompt, 
      modelId, 
      options.style, 
      options.aspectRatio
    )

    console.log(`[FAL] Generating image with model: ${modelId}`)
    console.log(`[FAL] Enhanced prompt: ${enhancedPrompt}`)

    // 모델별 이미지 생성
    const result = await generateImageByModel(modelId, enhancedPrompt, options)
    
    return {
      success: true,
      imageUrl: Array.isArray(result) ? result[0] : result,
      imageUrls: Array.isArray(result) ? result : [result]
    }
  } catch (error) {
    console.error('[FAL] Image generation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 모델별 이미지 생성 구현
async function generateImageByModel(
  modelId: string, 
  prompt: string, 
  options: any
): Promise<string | string[]> {
  const startTime = Date.now()

  switch (modelId) {
    case 'fal-ai/imagen4':
      return await generateWithImagen4(prompt, options)
    
    case 'fal-ai/imagen4-ultra':
      return await generateWithImagen4Ultra(prompt, options)
    
    case 'fal-ai/flux-pro/kontext/text-to-image':
      return await generateWithFluxProKontextPro(prompt, options)
    
    case 'fal-ai/flux-pro/v1.1-ultra':
      return await generateWithFluxProV11Ultra(prompt, options)

    case 'fal-ai/flux-pro-ultra':
      return await generateWithFluxProUltra(prompt, options)
    
    case 'fal-ai/gemini-25-flash-image/edit':
      return await generateWithGemini25FlashImageEdit(prompt, options)
    
         case 'fal-ai/gemini-25-flash-image/text-to-image':
       return await generateWithGemini25FlashImageTextToImage(prompt, options)
     
    
    case 'fal-ai/bytedance/seedream/v4/text-to-image':
      return await generateWithSeedreamV4(prompt, options)
    
    default:
      throw new Error(`Unsupported model: ${modelId}`)
  }
}

// Imagen 4 모델
async function generateWithImagen4(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/imagen4', {
    input: {
      prompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted',
      width: options.width || 1024,
      height: options.height || 1024,
      num_inference_steps: options.quality === 'high' ? 50 : 30
    }
  })

  return extractImageUrl(submission, 'imagen4')
}

// Imagen 4 Ultra 모델
async function generateWithImagen4Ultra(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/imagen4-ultra', {
    input: {
      prompt,
      negative_prompt: options.negativePrompt || 'blurry, low quality, distorted',
      width: options.width || 1024,
      height: options.height || 1024,
      num_inference_steps: options.quality === 'high' ? 70 : 50
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

// Flux.1 Kontext [pro] 모델 (텍스트-투-이미지)
async function generateWithFluxProKontextPro(prompt: string, options: any): Promise<string> {
  const submission: any = await fal.subscribe('fal-ai/flux-pro/kontext/text-to-image', {
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
