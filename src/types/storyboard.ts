// Shared storyboard UI types (client-side only)
export interface StoryboardFrame {
  id: string
  imageUrl?: string
  scene: number
  shotDescription: string
  shot: string
  dialogue: string
  sound: string
  imagePrompt?: string
  status: 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error'
  error?: string
}

export interface BuildStoryboardOptions {
  projectId?: string | string[]
  script: string
  visualStyle: string
  ratio: string
  mode?: 'sync' | 'async'
  // AI Model settings
  aiModel?: string
}

export interface StoryboardBuildResponse {
  storyboardId: string
  frames: StoryboardFrame[]
  framesCount: number
  mode: 'sync' | 'async'
  title?: string
  error?: string
}
