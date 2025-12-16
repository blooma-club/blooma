// 데이터베이스 테이블 타입 정의 (데이터베이스 스키마와 일치)
// NOTE: Project, Card, Storyboard types removed - feature deprecated

// 사용자 프로필 타입
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  subscription_tier: 'basic' | 'pro' | 'enterprise' // 구독 플랜
  created_at: string
  updated_at: string
}

// 하위 호환성을 위한 별칭 타입
export type UserProfile = User

// Storage 관련 타입
export interface StorageFile {
  bucket: string
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: {
    size: number
    mimetype: string
    cacheControl: string
  }
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
  error?: string | null
  success?: boolean
}

// 오류 타입
export interface DatabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

// AI 사용량 추적 타입
export interface AiUsage {
  id: string
  user_id: string
  operation_type: 'text_generation' | 'image_generation' | 'script_generation' | 'image_edit'
  provider: 'openrouter' | 'fal-ai' | 'openai' | 'replicate'
  model_name?: string
  input_tokens?: number
  output_tokens?: number
  image_count?: number
  success: boolean
  error_message?: string
  metadata?: Record<string, unknown>
  created_at: string
}
