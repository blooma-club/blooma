// Shared storyboard UI types (client-side only)
export interface StoryboardFrame {
  id: string
  imageUrl?: string
  scene: number
  shotDescription: string
  shot: string
  angle?: string
  background?: string
  moodLighting?: string
  dialogue: string
  sound: string
  imagePrompt?: string
  status: 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error'
  error?: string
  // Timeline-related fields
  duration?: number // Duration in seconds
  audioUrl?: string // Background music/sound URL
  voiceOverUrl?: string // Voice-over audio URL
  voiceOverText?: string // Voice-over script text
  startTime?: number // Start time in timeline (seconds)
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
