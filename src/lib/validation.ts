/**
 * Zod Validation Schemas
 * Consolidated from validation/schemas.ts
 */

import { z } from 'zod'

// Project
export const projectInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(1000).optional(),
  user_id: z.string().uuid().optional(),
})
export type ProjectInputValidated = z.infer<typeof projectInputSchema>

// Card
export const cardTypeSchema = z.enum(['scene', 'card'])

export const cardInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  type: cardTypeSchema,
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().max(10000),
  user_input: z.string().max(5000).optional(),
  image_url: z.string().url().optional(),
  image_urls: z.array(z.string().url()).max(20).optional(),
  selected_image_url: z.number().int().min(0).max(19).optional(),
  image_key: z.string().max(500).optional(),
  image_size: z.number().int().positive().optional(),
  image_type: z.enum(['uploaded', 'generated']).optional(),
  order_index: z.number().int().min(0).optional(),
  card_width: z.number().int().min(240).max(1104).optional(),
  next_card_id: z.string().uuid().nullable().optional(),
  prev_card_id: z.string().uuid().nullable().optional(),
  scene_number: z.number().int().positive().optional(),
  shot_type: z.string().max(100).optional(),
  angle: z.string().max(100).optional(),
  background: z.string().max(500).optional(),
  mood_lighting: z.string().max(100).optional(),
  dialogue: z.string().max(2000).optional(),
  sound: z.string().max(500).optional(),
  image_prompt: z.string().max(5000).optional(),
  storyboard_status: z
    .enum(['ready', 'pending', 'enhancing', 'prompted', 'generating', 'error'])
    .optional(),
  shot_description: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type CardInputValidated = z.infer<typeof cardInputSchema>

export const cardsUpdateSchema = z.object({
  cards: z
    .array(
      cardInputSchema.partial().extend({
        id: z.string().uuid(),
      })
    )
    .min(1)
    .max(100),
})
export type CardsUpdateValidated = z.infer<typeof cardsUpdateSchema>

export const cardDeleteSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(100),
  imageKeys: z.record(z.string().uuid(), z.string().max(500)).optional(),
})
export type CardDeleteValidated = z.infer<typeof cardDeleteSchema>

export const projectIdSchema = z.string().uuid()
export const cardIdSchema = z.string().uuid()

export const imageUploadSchema = z.object({
  projectId: z.string().uuid(),
  cardId: z.string().uuid().optional(),
  contentType: z
    .string()
    .regex(/^image\//)
    .optional(),
})

export const scriptGenerationSchema = z.object({
  prompt: z.string().min(1).max(10000),
  projectId: z.string().uuid(),
  settings: z
    .object({
      visualStyle: z.string().max(200).optional(),
      targetAudience: z.string().max(200).optional(),
      tone: z.string().max(200).optional(),
    })
    .optional(),
})

const imageUrlSchema = z.string().min(1)

export const imageGenerationSchema = z
  .object({
    prompt: z.string().max(10000).optional().default(''),
    modelId: z.string().min(1).optional(),
    style: z.string().max(200).optional(),
    aspectRatio: z.string().max(50).optional(),
    width: z.number().int().min(128).max(4096).optional(),
    height: z.number().int().min(128).max(4096).optional(),
    image_url: z.string().url().optional(),
    imageUrls: z.array(imageUrlSchema).max(10).optional(),
    modelImageUrl: imageUrlSchema.optional(),
    outfitImageUrls: z.array(imageUrlSchema).max(10).optional(),
    locationImageUrl: imageUrlSchema.optional(),
    inpaint: z.boolean().optional().default(false),
    numImages: z.number().int().min(1).max(4).optional(),
    resolution: z.enum(['1K', '2K', '4K']).optional(),
    viewType: z.enum(['front', 'behind', 'side', 'quarter']).optional().default('front'),
    cameraPrompt: z.string().max(1000).optional(),
    shotSize: z.enum(['extreme-close-up', 'close-up', 'medium-shot', 'full-body']).optional(),
    isModelAutoMode: z.boolean().optional().default(false),
    backgroundMode: z.enum(['studio', 'context', 'upload']).optional().default('studio'),
  })
  .superRefine((data, ctx) => {
    if (data.inpaint && !data.locationImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationImageUrl'],
        message: 'locationImageUrl is required when inpaint is enabled',
      })
    }
    // Skip modelImageUrl validation if auto mode is enabled
    const usesRoleSeparated =
      typeof data.modelImageUrl === 'string' ||
      (Array.isArray(data.outfitImageUrls) && data.outfitImageUrls.length > 0) ||
      typeof data.locationImageUrl === 'string'
    if (usesRoleSeparated) {
      if (!data.isModelAutoMode && !data.modelImageUrl)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['modelImageUrl'],
          message: 'modelImageUrl is required when not using auto mode',
        })
      if (!data.outfitImageUrls?.length)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['outfitImageUrls'],
          message: 'At least one outfit reference image is required',
        })
      return
    }
    if (data.imageUrls?.length) {
      if (data.imageUrls.length < 2)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['imageUrls'],
          message: 'At least 2 reference images are required',
        })
      return
    }
    if (data.image_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['image_url'],
        message: 'image_url not supported',
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

export const imagePromptSchema = z
  .object({
    userPrompt: z.string().max(10000).optional().default(''),
    modelImageUrl: imageUrlSchema.optional(),
    outfitImageUrls: z.array(imageUrlSchema).max(10).optional(),
    locationImageUrl: imageUrlSchema.optional(),
    isModelAutoMode: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.isModelAutoMode && !data.modelImageUrl)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modelImageUrl'],
        message: 'modelImageUrl is required',
      })
    if (!data.outfitImageUrls?.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outfitImageUrls'],
        message: 'At least one outfit reference image is required',
      })
  })
export type ImagePromptValidated = z.infer<typeof imagePromptSchema>

export const imageEditSchema = z
  .object({
    prompt: z.string().min(1).max(10000),
    image_urls: z.array(z.string().url()).min(1).max(6),
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
