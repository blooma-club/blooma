// 데이터베이스 테이블 타입 정의 (데이터베이스 스키마와 일치)

// 사용자 프로필 타입
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// 프로젝트 타입
export interface Project {
  id: string
  user_id: string
  title: string
  description?: string
  is_public: boolean
  created_at?: string
  updated_at?: string
  has_cards?: boolean
}

// 스토리보드 타입
export interface Storyboard {
  id: string
  user_id: string
  project_id?: string
  title: string
  description?: string
  is_public: boolean
  created_at?: string
  updated_at?: string
}

// 카드 타입
export interface Card {
  id: string
  storyboard_id: string
  user_id: string
  type: 'hook' | 'problem' | 'solution' | 'evidence' | 'benefit' | 'cta'
  title: string
  content: string
  user_input?: string // User input prompt for generating/editing content
  image_urls?: string[] // JSON array of up to 3 image URLs
  selected_image_url?: number // Index of the selected image (0, 1, or 2)
  position_x: number
  position_y: number
  width: number
  height: number
  order_index: number
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
  data: any // JSONB 타입
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

export interface CardWithPosition extends Card {
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

// 카드 생성/수정을 위한 입력 타입
export interface CardInput {
  type: Card['type']
  title: string
  content: string
  user_input?: string // User input prompt for generating/editing content
  image_urls?: string[] // JSON array of up to 3 image URLs
  selected_image_url?: number // Index of the selected image (0, 1, or 2)
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  order_index?: number
}

// 스토리보드 생성/수정을 위한 입력 타입
export interface StoryboardInput {
  title: string
  description?: string
  project_id?: string
  is_public?: boolean
}

// 프로젝트 생성/수정을 위한 입력 타입
export interface ProjectInput {
  title: string
  description?: string
  is_public?: boolean
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

// Canvas types (기존 호환성 유지)
export interface CanvasPosition {
  x: number
  y: number
}

export interface CanvasSize {
  width: number
  height: number
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

// ReactFlow Custom Node Data 타입 (공식 가이드 패턴)
export interface CustomCardNodeData extends Record<string, unknown> {
  title?: string
  content?: string
  userInput?: string // User input prompt for generating/editing content
  imageUrls?: string[] // Array of image URLs
  selectedImageUrl?: number // Index of selected image
  imageUrl?: string // Single primary image URL for backward compatibility
} 