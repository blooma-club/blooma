export type Character = {
  id: string
  name: string
  originalImageSize?: number
  original_image_size?: number
  image_url?: string
  original_image_url?: string
  image_key?: string
  original_image_key?: string
  image_size?: number
  edit_prompt?: string
  updated_at?: string
  productAttachments?: Array<{
    name: string
    size: number
    type: string
  }>
  /**
   * Temporary camelCase aliases kept for drafts saved before we normalized fields.
   * These keep TypeScript happy when we map localStorage data back into the snake_case
   * structure used elsewhere in the wizard.
   */
  imageUrl?: string
  originalImageUrl?: string
  imageKey?: string
  originalImageKey?: string
  imageSize?: number
  editPrompt?: string
}
