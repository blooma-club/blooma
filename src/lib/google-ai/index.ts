import { GoogleGenAI } from '@google/genai'
import type {
    GeminiModel,
    GeminiGenerationOptions,
    GeminiGenerationResult,
    GeminiImagePart,
} from './types'

export type { GeminiModel } from './types'

const FALLBACK_PLACEHOLDER_IMAGE =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAAAAgABSK+kbQAAAABJRU5ErkJggg=='

function createPlaceholderImageResult(reason: string): GeminiGenerationResult {
    const warning = reason && reason.trim().length > 0 ? reason : 'Image generation placeholder used.'
    return {
        success: true,
        imageUrl: FALLBACK_PLACEHOLDER_IMAGE,
        imageUrls: [FALLBACK_PLACEHOLDER_IMAGE],
        warning,
    }
}

// 지원하는 Gemini 모델들
export const GEMINI_MODELS: GeminiModel[] = [
    // Nano Banana Pro (Gemini 3 Pro Image Preview)
    {
        id: 'gemini-3-pro-image-preview',
        name: 'Nano Banana Pro',
        description: 'Professional asset production with advanced reasoning, 4K support',
        category: 'image-editing',
        maxResolution: '4K',
        credits: 50,
    },
    // Nano Banana (Gemini 2.5 Flash Image)
    {
        id: 'gemini-2.5-flash-image',
        name: 'Nano Banana',
        description: 'Fast and efficient image generation optimized for high-volume tasks',
        category: 'image-generation',
        maxResolution: '1K',
        credits: 15,
    },
]

// 기본 모델 설정
export const DEFAULT_MODEL = 'gemini-2.5-flash-image'
const PROMPT_ENHANCE_MODEL = process.env.GEMINI_PROMPT_MODEL || 'gemini-3-flash-preview'
const PROMPT_SYSTEM_INSTRUCTION = `You are a creative director for a fashion brand studio.

Your role is to craft a single, vivid prompt that will guide an AI image generator
to produce a beautiful, photorealistic fashion editorial image.

You will receive:
- A model portrait (use this to understand the person's features and presence)
- Outfit reference(s) (capture the clothing details: colors, materials, silhouette, any logos or patterns)
- A location/background reference (analyze its lighting, atmosphere, and environment)
- An optional user prompt with additional creative direction

Study these references carefully, then write one cohesive prompt.

CRITICAL: LIGHTING COHERENCE

When a background/location reference is provided, you must analyze its lighting characteristics:
- Light direction (where is the sun or light source coming from?)
- Light quality (harsh midday sun, soft overcast, golden hour, studio lighting?)
- Shadow direction and intensity
- Color temperature (warm, cool, neutral?)

Then describe the model as if they are ACTUALLY IN that environment with MATCHING lighting.
The model should have the same light direction, shadow patterns, and color temperature as the background.
This is essential — without it, the result will look like a Photoshop cutout.

OUTPUT FORMAT

Start your prompt with this structure:
[Image style/genre] of [person description] + [action or pose]

Then continue describing the scene naturally — outfit details, environment, and especially
how the lighting falls on both the model AND the environment consistently.

EXAMPLE:
"A fashion lookbook photography of a young woman with sleek black hair standing in a modernist concrete courtyard. Strong directional sunlight from the upper right casts sharp geometric shadows across the walls and falls across her left shoulder, creating the same angular shadow patterns on her olive green sweater..."

GUIDING PRINCIPLES

- Preserve the model's identity and the outfit's exact details
- The model must feel like they BELONG in the environment, not placed on top
- Match lighting direction, shadow quality, and color temperature between model and background
- If the user gives specific direction, weave it into your vision

TONE & STYLE

Write like you're describing a vision to a collaborator.
Clear, evocative, professional. No bullet points, no JSON, no labels.
Just a flowing, descriptive prompt ready to generate a stunning, cohesive image.`

// Gemini 클라이언트 인스턴스
let geminiClient: GoogleGenAI | null = null

export function initializeGeminiAI(): boolean {
    if (geminiClient) return true

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        console.warn('GEMINI_API_KEY is not configured. Image generation will not work.')
        return false
    }

    try {
        geminiClient = new GoogleGenAI({ apiKey })
        console.log('Gemini AI initialized successfully')
        return true
    } catch (error) {
        console.error('Failed to initialize Gemini AI:', error)
        return false
    }
}

// Helper to resolve aspect ratio
function resolveAspectRatio(aspectRatio?: string): string {
    if (!aspectRatio) return '1:1'

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
        default:
            return '1:1'
    }
}

// Helper to resolve image size for Pro model
function resolveImageSize(resolution?: string): string | undefined {
    if (!resolution) return undefined
    if (['1K', '2K', '4K'].includes(resolution)) {
        return resolution
    }
    return undefined
}

// Base64 데이터를 Data URI로 변환
function toDataUri(base64: string, mimeType: string): string {
    if (base64.startsWith('data:')) {
        return base64
    }
    return `data:${mimeType};base64,${base64}`
}

// 이미지를 Base64로 변환 (URL에서 fetch)
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        // 이미 base64인 경우
        if (url.startsWith('data:')) {
            const match = url.match(/^data:([^;]+);base64,(.+)$/)
            if (match) {
                return { mimeType: match[1], data: match[2] }
            }
        }

        const response = await fetch(url)
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status}`)
            return null
        }

        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/png'

        return { data: base64, mimeType: contentType }
    } catch (error) {
        console.error('Error fetching image:', error)
        return null
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
        imageUrls?: string[] // For multi-image models
        numImages?: number
        outputFormat?: 'jpeg' | 'png'
        resolution?: '1K' | '2K' | '4K'
        isGenerateMode?: boolean
    } = {}
): Promise<{
    success: boolean
    imageUrl?: string
    imageUrls?: string[]
    error?: string
    status?: number
    warning?: string
}> {
    if (!initializeGeminiAI() || !geminiClient) {
        console.warn('[GEMINI] GEMINI_API_KEY is missing or invalid. Using placeholder image instead.')
        return createPlaceholderImageResult('GEMINI_API_KEY is not configured. Placeholder image returned.')
    }

    const hasCredentials = !!process.env.GEMINI_API_KEY?.trim()?.length

    if (!hasCredentials) {
        console.warn('[GEMINI] No Gemini credentials detected. Falling back to placeholder image.')
        return createPlaceholderImageResult(
            'Gemini credentials are not configured. Placeholder image returned.'
        )
    }

    try {
        console.log(`[GEMINI] Generating image with model: ${modelId}`)

        // 참조 이미지 준비 (이미지 편집용)
        const referenceImages = options.imageUrls?.filter(url => url && url.trim()) || []

        // 콘텐츠 구성
        const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []

        // 텍스트 프롬프트 추가
        contents.push({ text: prompt })

        // 참조 이미지 추가 (편집 모드)
        for (const imageUrl of referenceImages) {
            const imageData = await fetchImageAsBase64(imageUrl)
            if (imageData) {
                contents.push({
                    inlineData: {
                        mimeType: imageData.mimeType,
                        data: imageData.data,
                    },
                })
            }
        }

        // 설정 구성
        const aspectRatio = resolveAspectRatio(options.aspectRatio)
        const imageSize = modelId === 'gemini-3-pro-image-preview'
            ? resolveImageSize(options.resolution)
            : undefined

        const config: Record<string, unknown> = {
            responseModalities: ['IMAGE'],
        }

        // 이미지 설정 추가
        const imageConfig: Record<string, unknown> = {
            aspectRatio,
        }
        if (imageSize) {
            imageConfig.imageSize = imageSize
        }
        config.imageConfig = imageConfig

        // API 호출
        const response = await geminiClient.models.generateContent({
            model: modelId,
            contents,
            config,
        })

        // 결과 추출
        const imageUrls: string[] = []

        const candidates = response.candidates || []
        for (const candidate of candidates) {
            const parts = candidate.content?.parts || []
            for (const part of parts as GeminiImagePart[]) {
                if (part.inlineData?.data) {
                    const dataUri = toDataUri(part.inlineData.data, part.inlineData.mimeType || 'image/png')
                    imageUrls.push(dataUri)
                }
            }
        }

        if (imageUrls.length === 0) {
            console.error('[GEMINI] No images generated from response')
            return {
                success: false,
                error: 'No images generated from Gemini API',
                status: 500,
            }
        }

        console.log(`[GEMINI] Generated ${imageUrls.length} image(s)`)

        return {
            success: true,
            imageUrl: imageUrls[0],
            imageUrls,
        }
    } catch (error) {
        console.error('[GEMINI] Image generation failed:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // 특정 에러 코드 처리
        if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
            return {
                success: false,
                error: 'API quota exceeded or billing issue',
                status: 402,
            }
        }

        if (errorMessage.includes('unauthorized') || errorMessage.includes('API key')) {
            return {
                success: false,
                error: 'Invalid API key',
                status: 401,
            }
        }

        return {
            success: false,
            error: errorMessage,
            status: 500,
        }
    }
}

export async function generatePromptFromImages(options: {
    modelImageUrl?: string
    outfitImageUrls?: string[]
    locationImageUrl?: string
    userPrompt?: string
}): Promise<string | null> {
    if (!initializeGeminiAI() || !geminiClient) {
        return null
    }

    const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []
    const userHint = options.userPrompt?.trim() || ''
    contents.push({ text: `User prompt: ${userHint || 'none'}` })

    const addImage = async (label: string, url?: string) => {
        if (!url) return
        const imageData = await fetchImageAsBase64(url)
        if (!imageData) return
        contents.push({ text: label })
        contents.push({
            inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.data,
            },
        })
    }

    await addImage('Model reference image:', options.modelImageUrl)
    for (const url of options.outfitImageUrls || []) {
        await addImage('Outfit reference image:', url)
    }
    await addImage('Background reference image:', options.locationImageUrl)

    if (contents.length === 1 && !userHint) {
        return null
    }

    try {
        const response = await geminiClient.models.generateContent({
            model: PROMPT_ENHANCE_MODEL,
            contents,
            config: {
                responseModalities: ['TEXT'],
                systemInstruction: PROMPT_SYSTEM_INSTRUCTION,
            },
        })
        const text = response.text?.trim()
        return text || null
    } catch (error) {
        console.warn('[GEMINI] Prompt generation failed:', error)
        return null
    }
}

// 모델 정보 조회
export function getModelInfo(modelId: string): GeminiModel | undefined {
    return GEMINI_MODELS.find(model => model.id === modelId)
}
