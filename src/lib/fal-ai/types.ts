/**
 * Fal AI 관련 타입 정의 및 타입 가드
 */

/**
 * Fal AI 모델 인터페이스
 */
export interface FalAIModel {
  id: string
  name: string
  description: string
  category: 'image-generation' | 'image-enhancement' | 'upscaling' | 'inpainting'
  maxResolution: string
  credits: number
  inputSchema: FalAIInputSchema
}

/**
 * 입력 스키마 타입 정의
 */
export type FalAIInputSchema = Record<string,
  | 'string'
  | 'number'
  | 'boolean'
  | 'string?'
  | 'number?'
  | 'boolean?'
  | 'list<string>'
  | 'list<string>?'
  | 'object?'
  | 'string | object?'
>

/**
 * Fal AI 모델 타입 가드
 */
export function isFalAIModel(obj: unknown): obj is FalAIModel {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const model = obj as Record<string, unknown>

  return (
    typeof model.id === 'string' &&
    typeof model.name === 'string' &&
    typeof model.description === 'string' &&
    typeof model.category === 'string' &&
    ['image-generation', 'image-enhancement', 'upscaling', 'inpainting'].includes(model.category) &&
    typeof model.maxResolution === 'string' &&
    typeof model.credits === 'number' &&
    typeof model.inputSchema === 'object' &&
    model.inputSchema !== null
  )
}

/**
 * Fal AI 응답 타입 정의
 */
export interface FalAISubmissionUpdate {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  progress?: number
  error?: string
  logs?: Array<{
    message?: string
    level?: string
  }>
}

export interface FalAIImageResult {
  url: string
  width?: number
  height?: number
  content_type?: string
  b64?: string
  base64?: string
}

export interface FalAISubmission {
  images?: FalAIImageResult[]
  output?: Array<{
    url?: string
    b64?: string
    base64?: string
    width?: number
    height?: number
    content_type?: string
  }>
  image?: FalAIImageResult
  data?: FalAIImageResult[] | unknown
  result?: FalAIImageResult[]
  artifacts?: FalAIImageResult[]
  // Fal client may return data in different formats
  [key: string]: unknown
}

/**
 * Fal AI 옵션 타입 정의
 */
export interface FalAIGenerationOptions {
  prompt: string
  aspectRatio?: string
  style?: string
  guidanceScale?: number
  numImages?: number
  outputFormat?: 'jpeg' | 'png'
  negativePrompt?: string
  imageUrls?: string[]
  imageUrl?: string
  width?: number
  height?: number
  numInferenceSteps?: number
  safetyTolerance?: string | '1' | '2' | '3' | '4' | '5' | '6'
  strength?: number
  resolution?: '1K' | '2K' | '4K'

  // Model-specific options
  maxImages?: number
  seed?: number
  syncMode?: boolean
  enableSafetyChecker?: boolean
  // Generate mode flag - Edit 모델 사용 시에도 Custom 해상도 계산 적용
  isGenerateMode?: boolean
}

/**
 * Fal AI 생성 결과 타입
 */
export interface FalAIGenerationResult {
  success: boolean
  imageUrl?: string
  imageUrls?: string[]
  warning?: string
}

/**
 * Fal AI 에러 타입 가드
 */
export interface FalAIError extends Error {
  status?: number
  code?: string
  details?: unknown
}

export function isFalAIError(error: unknown): error is FalAIError {
  return error instanceof Error && 'status' in error
}
