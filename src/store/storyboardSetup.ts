import { create } from 'zustand'

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5'
export type VisualStyle = 'cinematic' | 'product' | 'minimal' | 'playful' | 'sketch' | 'realistic'

interface StoryboardSetupState {
  aspect: AspectRatio
  style: VisualStyle
  colorTone: 'neutral' | 'warm' | 'cool'
  mood: 'professional' | 'energetic' | 'friendly' | 'dramatic'
  setAspect: (a: AspectRatio) => void
  setStyle: (s: VisualStyle) => void
  setColorTone: (c: StoryboardSetupState['colorTone']) => void
  setMood: (m: StoryboardSetupState['mood']) => void
  reset: () => void
}

export const useStoryboardSetup = create<StoryboardSetupState>((set) => ({
  aspect: '16:9',
  style: 'cinematic',
  colorTone: 'neutral',
  mood: 'professional',
  setAspect: (aspect) => set({ aspect }),
  setStyle: (style) => set({ style }),
  setColorTone: (colorTone) => set({ colorTone }),
  setMood: (mood) => set({ mood }),
  reset: () => set({ aspect: '16:9', style: 'cinematic', colorTone: 'neutral', mood: 'professional' })
}))
