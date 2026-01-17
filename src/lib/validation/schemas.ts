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
  image_urls: z.array(z.string().url()).max(20, 'Maximum 20 image URLs allowed').optional(),
  selected_image_url: z.number().int().min(0).max(19).optional(),
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
  imageKeys: z
    .record(z.string().uuid(), z.string().max(500))
    .optional(),
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
 * - image_url: 표준 URL만 허용
 * - imageUrls: 다양한 URL 형식 허용 (http, https, blob, data, 상대경로 등)
 */
const imageUrlSchema = z.string().min(1, 'URL cannot be empty')

export const imageGenerationSchema = z.object({
  prompt: z.string().max(10000, 'Prompt must be 10000 characters or less').optional().default(''),
  modelId: z.string().min(1).optional(),
  style: z.string().max(200).optional(),
  aspectRatio: z.string().max(50).optional(),
  width: z.number().int().min(128).max(4096).optional(),
  height: z.number().int().min(128).max(4096).optional(),
  image_url: z.string().url().optional(),
  imageUrls: z.array(imageUrlSchema).max(10).optional(),
  // Role-separated references (preferred)
  modelImageUrl: imageUrlSchema.optional(),
  outfitImageUrls: z.array(imageUrlSchema).max(10).optional(),
  locationImageUrl: imageUrlSchema.optional(),
  inpaint: z.boolean().optional().default(false),
  numImages: z.number().int().min(1).max(4).optional(),
  resolution: z.enum(['1K', '2K', '4K']).optional(),
  viewType: z.enum(['front', 'behind', 'side', 'quarter']).optional().default('front'), // deprecated, kept for backward compatibility
  cameraPrompt: z.string().max(1000, 'Camera prompt must be 1000 characters or less').optional(),
  shotSize: z.enum(['extreme-close-up', 'close-up', 'medium-shot', 'full-body']).optional(),
}).superRefine((data, ctx) => {
  if (data.inpaint && !data.locationImageUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['locationImageUrl'],
      message: 'locationImageUrl is required when inpaint is enabled',
    })
  }

  const usesRoleSeparated =
    typeof data.modelImageUrl === 'string' ||
    (Array.isArray(data.outfitImageUrls) && data.outfitImageUrls.length > 0) ||
    typeof data.locationImageUrl === 'string'

  if (usesRoleSeparated) {
    if (!data.modelImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modelImageUrl'],
        message: 'modelImageUrl is required',
      })
    }
    if (!data.outfitImageUrls?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outfitImageUrls'],
        message: 'At least one outfit reference image is required',
      })
    }
    return
  }

  if (data.imageUrls?.length) {
    if (data.imageUrls.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['imageUrls'],
        message: 'At least 2 reference images are required (model + outfit)',
      })
    }
    return
  }

  if (data.image_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['image_url'],
      message: 'image_url is not supported; provide modelImageUrl + outfitImageUrls (and optional locationImageUrl)',
    })
    return
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['outfitImageUrls'],
    message: 'Reference images are required',
  })
})

export type ImageGenerationValidated = z.infer<typeof imageGenerationSchema>

export const imagePromptSchema = z.object({
  userPrompt: z.string().max(10000, 'Prompt must be 10000 characters or less').optional().default(''),
  modelImageUrl: imageUrlSchema.optional(),
  outfitImageUrls: z.array(imageUrlSchema).max(10).optional(),
  locationImageUrl: imageUrlSchema.optional(),
}).superRefine((data, ctx) => {
  if (!data.modelImageUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['modelImageUrl'],
      message: 'modelImageUrl is required',
    })
  }
  if (!data.outfitImageUrls?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outfitImageUrls'],
      message: 'At least one outfit reference image is required',
    })
  }
})

export type ImagePromptValidated = z.infer<typeof imagePromptSchema>

/**
 * 이미지 편집 요청 스키마
 */
export const imageEditSchema = z
  .object({
    prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt must be 10000 characters or less'),
    image_urls: z
      .array(z.string().url())
      .min(1, 'At least one reference image is required')
      .max(6, 'A maximum of 6 reference images is allowed'),
    projectId: z.string().uuid().optional(),
    storyboardId: z.string().uuid().optional(),
    frameId: z.string().uuid(),
    numImages: z.number().int().min(1).max(4).optional(),
    output_format: z.enum(['jpeg', 'png', 'webp']).optional(),
  })
  .refine(data => Boolean(data.projectId) || Boolean(data.storyboardId), {
    message: 'projectId or storyboardId is required',
    path: ['projectId'],
  })

export type ImageEditValidated = z.infer<typeof imageEditSchema>
