// Shared storyboard UI types (client-side only)

export interface BackgroundMetadata {
  id: string
  description: string
  keywords: string[]
  isInherited: boolean
  inheritedFrom?: string
}

export interface StoryboardFrame {
  id: string
  imageUrl?: string
  imageHistory?: string[]
  scene: number
  shotDescription: string
  shot: string
  angle?: string
  background?: string
  backgroundId?: string | null // Reference to selected background
  backgroundMetadata?: BackgroundMetadata // Inheritance metadata
  moodLighting?: string
  dialogue: string
  sound: string
  imagePrompt?: string
  status: 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error'
  error?: string
  cardWidth?: number | null
  videoUrl?: string
  videoKey?: string
  videoPrompt?: string
  // Character metadata for dragged characters
  characterMetadata?: Array<{
    characterId: string
    characterName: string
    characterHandle?: string
    characterImageUrl?: string
    modelId: string
    modelLabel: string
  }>
}

export interface Character {
  id: string
  name: string
  imageUrl?: string
  originalImageUrl?: string
  editPrompt?: string
}

export interface BuildStoryboardOptions {
  projectId: string // Required since we're building directly for a project
  script?: string // 기존 방식
  modelId?: string // 새로운 방식: 모델 ID 사용
  visualStyle: string
  ratio: string
  mode?: 'sync' | 'async'
  // AI Model settings
  aiModel?: string
  // Character references for image generation
  characters?: Character[]
  // Scene metadata with dragged characters
  sceneMetadata?: Array<{
    sceneId: string
    metadata: Array<{
      characterId: string
      characterName: string
      characterHandle?: string
      characterImageUrl?: string
      modelId: string
      modelLabel: string
    }>
  }>
  // Background consistency
  backgrounds?: Array<{
    id: string
    description: string
    keywords: string[]
    sceneIndices: number[]
  }>
}

export interface StoryboardBuildResponse {
  projectId: string
  storyboardId: string
  frames: StoryboardFrame[]
  framesCount: number
  mode: 'sync' | 'async'
  title?: string
  error?: string
}

export type StoryboardAspectRatio = '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16'
