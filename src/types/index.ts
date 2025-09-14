// 데이터베이스 테이블 타입 정의 (데이터베이스 스키마와 일치)

// 사용자 프로필 타입
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  credits: number // 사용 가능한 크레딧
  credits_used: number // 이번 달 사용한 크레딧
  credits_reset_date: string // 크레딧 리셋 날짜 (매월)
  subscription_tier: 'basic' | 'pro' | 'enterprise' // 구독 플랜
  created_at: string
  updated_at: string
}

// 프로젝트 타입
export interface Project {
  id: string
  user_id: string
  title: string
  description?: string
  created_at?: string
  updated_at?: string
  has_cards?: boolean
  preview_image?: string | null // 첫 번째 씬의 미리보기 이미지
}

// 스토리보드 타입
export interface Storyboard {
  id: string
  user_id: string
  project_id?: string
  title: string
  description?: string
  created_at?: string
  updated_at?: string
}

// 카드 타입 (Editor + Storyboard 통합) - 메타데이터 완전 통합
export interface Card {
  id: string
  storyboard_id: string
  user_id: string
  type: 'scene' | 'card'
  title: string
  content: string
  user_input?: string // User input prompt for generating/editing content
  image_url?: string // 단일 이미지 URL (새로운 방식)
  image_urls?: string[] // JSON array of up to 3 image URLs (기존 방식)
  selected_image_url?: number // Index of the selected image (0, 1, or 2)
  image_key?: string // R2 키 (삭제용)
  image_size?: number // 파일 크기
  image_type?: string // uploaded/generated

  order_index: number

  // Scene 흐름 필드
  next_card_id?: string // 다음 Scene을 가리키는 외래키
  prev_card_id?: string // 이전 Scene을 가리키는 외래키

  // Storyboard 메타데이터 필드 (완전 통합)
  scene_number?: number        // 씬 번호
  shot_type?: string          // 촬영 타입 (CU, MS, LS 등)
  dialogue?: string           // 대사/내레이션
  sound?: string              // 음향 효과
  image_prompt?: string       // AI 이미지 생성 프롬프트
  storyboard_status?: string  // 처리 상태 (ready, pending, error 등)
  shot_description?: string   // 촬영 설명 (content와 별도)

  // 확장성을 위한 메타데이터
  metadata?: Record<string, unknown>

  created_at?: string
  updated_at?: string
}

// 버전 타입
export interface Version {
  id: string
  storyboard_id: string
  user_id: string
  version_number: number
  title: string
  description?: string
  data: Record<string, unknown> // JSONB 타입
  created_at: string
}

// 하위 호환성을 위한 별칭 타입
export type UserProfile = User

// 클라이언트 사이드 편의성 타입
export interface StoryboardWithCards extends Storyboard {
  cards: Card[]
}

export interface ProjectWithStoryboards extends Project {
  storyboards: Storyboard[]
}

// 카드 생성/수정을 위한 입력 타입 (완전 통합)
export interface CardInput {
  id?: string
  type: Card['type'] // 'scene' | 'card'
  title: string
  content: string
  user_input?: string // User input prompt for generating/editing content
  image_urls?: string[] // JSON array of up to 3 image URLs
  selected_image_url?: number // Index of the selected image (0, 1, or 2)

  order_index?: number

  // Storyboard 메타데이터 필드 (완전 통합)
  scene_number?: number
  shot_type?: string
  dialogue?: string
  sound?: string
  image_prompt?: string
  storyboard_status?: string
  shot_description?: string

  // 확장성을 위한 메타데이터
  metadata?: Record<string, unknown>
}

// 스토리보드 생성/수정을 위한 입력 타입
export interface StoryboardInput {
  title: string
  description?: string
  project_id?: string
}

// 프로젝트 생성/수정을 위한 입력 타입
export interface ProjectInput {
  title: string
  description?: string
  user_id?: string // 프로젝트 생성 시 사용자 ID
}

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

export interface InitialCardData {
  title: string
  content: string
}

// AI 사용량 추적 타입
export interface AiUsage {
  id: string
  user_id: string
  operation_type: 'text_generation' | 'image_generation' | 'script_generation' | 'image_edit'
  provider: 'openrouter' | 'fal-ai' | 'openai' | 'replicate'
  model_name?: string
  credits_consumed: number
  input_tokens?: number
  output_tokens?: number
  image_count?: number
  success: boolean
  error_message?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// 크레딧 거래 내역 타입
export interface CreditTransaction {
  id: string
  user_id: string
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'reset'
  amount: number // 양수: 충전, 음수: 사용
  description: string
  ai_usage_id?: string // AI 사용과 연결된 경우
  created_at: string
}

// 구독 플랜 설정 타입
export interface SubscriptionPlan {
  tier: 'basic' | 'pro' | 'enterprise'
  monthly_credits: number
  price_per_month: number
  features: string[]
  credit_prices: {
    text_generation: number // 텍스트 생성 1회당 크레딧
    image_generation: number // 이미지 생성 1회당 크레딧
    script_generation: number // 스크립트 생성 1회당 크레딧
    image_edit: number // 이미지 편집 1회당 크레딧
  }
}