/**
 * Zod 기반 입력 검증 스키마
 */

import { z } from 'zod'

/**
 * 프로젝트 입력 검증 스키마
 */
export const projectInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  user_id: z.string().uuid().optional(),
})

export type ProjectInputValidated = z.infer<typeof projectInputSchema>

/**
 * 카드 타입 검증
 */
export const cardTypeSchema = z.enum(['scene', 'card'])

/**
 * 카드 입력 검증 스키마
 */
export const cardInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  type: cardTypeSchema,
  title: z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or less'),
  content: z.string().max(10000, 'Content must be 10000 characters or less'),
  user_input: z.string().max(5000, 'User input must be 5000 characters or less').optional(),
  
  // 이미지 관련
  image_url: z.string().url().optional(),
  image_urls: z.array(z.string().url()).max(3, 'Maximum 3 image URLs allowed').optional(),
  selected_image_url: z.number().int().min(0).max(2).optional(),
  image_key: z.string().max(500).optional(),
  image_size: z.number().int().positive().optional(),
  image_type: z.enum(['uploaded', 'generated']).optional(),
  
  // 순서 및 크기
  order_index: z.number().int().min(0).optional(),
  card_width: z.number().int().min(240).max(1104).optional(),
  
  // 링크 관련
  next_card_id: z.string().uuid().nullable().optional(),
  prev_card_id: z.string().uuid().nullable().optional(),
  
  // 스토리보드 메타데이터
  scene_number: z.number().int().positive().optional(),
  shot_type: z.string().max(100).optional(),
  angle: z.string().max(100).optional(),
  background: z.string().max(500).optional(),
  mood_lighting: z.string().max(100).optional(),
  dialogue: z.string().max(2000).optional(),
  sound: z.string().max(500).optional(),
  image_prompt: z.string().max(5000).optional(),
  storyboard_status: z.enum(['ready', 'pending', 'enhancing', 'prompted', 'generating', 'error']).optional(),
  shot_description: z.string().max(5000).optional(),
  
  // 비디오 메타데이터
  video_url: z.string().url().optional(),
  video_key: z.string().max(500).nullable().optional(),
  video_prompt: z.string().max(5000).nullable().optional(),
  
  // 확장 메타데이터
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CardInputValidated = z.infer<typeof cardInputSchema>

/**
 * 카드 배열 업데이트 스키마
 */
export const cardsUpdateSchema = z.object({
  cards: z.array(cardInputSchema.partial().extend({
    id: z.string().uuid(),
  })).min(1).max(100, 'Cannot update more than 100 cards at once'),
})

export type CardsUpdateValidated = z.infer<typeof cardsUpdateSchema>

/**
 * 카드 삭제 스키마
 */
export const cardDeleteSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(100, 'Cannot delete more than 100 cards at once'),
})

export type CardDeleteValidated = z.infer<typeof cardDeleteSchema>

/**
 * 프로젝트 ID 검증 스키마
 */
export const projectIdSchema = z.string().uuid('Invalid project ID format')

/**
 * 카드 ID 검증 스키마
 */
export const cardIdSchema = z.string().uuid('Invalid card ID format')

/**
 * 이미지 업로드 요청 스키마
 */
export const imageUploadSchema = z.object({
  projectId: z.string().uuid(),
  cardId: z.string().uuid().optional(),
  contentType: z.string().regex(/^image\//, 'Must be an image file').optional(),
})

/**
 * 비디오 생성 요청 스키마
 */
export const videoGenerationSchema = z.object({
  frameId: z.string().uuid(),
  projectId: z.string().uuid(),
  imageUrl: z.string().url(),
  startImageUrl: z.string().url().optional(),
  endImageUrl: z.string().url().optional(),
  endFrameId: z.string().uuid().optional(),
  prompt: z.string().max(5000).optional(),
  modelId: z.string().min(1),
})

export type VideoGenerationValidated = z.infer<typeof videoGenerationSchema>

/**
 * 스크립트 생성 요청 스키마
 */
export const scriptGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt must be 10000 characters or less'),
  projectId: z.string().uuid(),
  settings: z.object({
    visualStyle: z.string().max(200).optional(),
    targetAudience: z.string().max(200).optional(),
    tone: z.string().max(200).optional(),
  }).optional(),
})

/**
 * 이미지 생성 요청 스키마
 */
export const imageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt must be 10000 characters or less'),
  modelId: z.string().min(1).optional(),
  style: z.string().max(200).optional(),
  aspectRatio: z.string().max(50).optional(),
  width: z.number().int().min(128).max(4096).optional(),
  height: z.number().int().min(128).max(4096).optional(),
  image_url: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  enhancePrompt: z.boolean().optional(),
})

export type ImageGenerationValidated = z.infer<typeof imageGenerationSchema>

