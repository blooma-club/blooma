import type { StoryboardAspectRatio } from '@/types/storyboard'

// Storyboard aspect ratio mappings
export const RATIO_TO_CSS: Record<StoryboardAspectRatio, string> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '1:1': '1 / 1',
  '2:3': '2 / 3',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
}

// Default values
export const DEFAULT_RATIO: StoryboardAspectRatio = '16:9'
export const DEFAULT_CARD_WIDTH = 400

// Card width constraints
export const CARD_WIDTH_MIN = 240
export const CARD_WIDTH_MAX = 1104
export const CARD_WIDTH_LOCK_THRESHOLD = 540

// Grid layout constants
export const GRID_CONTAINER_MAX_WIDTH = 1200
export const GRID_GAP_PX = 16

// Storage keys
export const CARD_WIDTH_STORAGE_PREFIX = 'blooma_storyboard_card_width:'

// Utility functions
export const clampCardWidth = (value: number) =>
  Math.max(CARD_WIDTH_MIN, Math.min(CARD_WIDTH_MAX, Math.round(value)))
