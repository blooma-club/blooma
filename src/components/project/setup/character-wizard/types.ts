export type Character = {
  id: string
  name: string
  originalImageSize?: number
  image_url?: string
  image_key?: string
  image_size?: number
  edit_prompt?: string
  updated_at?: string
  productAttachments?: Array<{
    name: string
    size: number
    type: string
  }>
}
