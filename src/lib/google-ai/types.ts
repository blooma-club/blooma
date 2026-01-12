/**
 * Google AI (Gemini) 관련 타입 정의
 */

/**
 * Gemini 모델 인터페이스
 */
export interface GeminiModel {
    id: string
    name: string
    description: string
    category: 'image-generation' | 'image-editing'
    maxResolution: '1K' | '2K' | '4K'
    credits: number
}

/**
 * Gemini 이미지 생성 옵션
 */
export interface GeminiGenerationOptions {
    prompt: string
    aspectRatio?: string
    imageSize?: '1K' | '2K' | '4K'
    numImages?: number
    imageUrls?: string[] // For image editing (reference images)
    responseModalities?: ('Text' | 'Image')[]
}

/**
 * Gemini 이미지 결과
 */
export interface GeminiImagePart {
    inlineData?: {
        mimeType: string
        data: string // Base64 encoded
    }
    text?: string
}

/**
 * Gemini 응답 구조
 */
export interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: GeminiImagePart[]
        }
    }>
}

/**
 * Gemini 생성 결과 타입
 */
export interface GeminiGenerationResult {
    success: boolean
    imageUrl?: string
    imageUrls?: string[]
    error?: string
    warning?: string
}
