import type { Card } from '@/types'

export type CardRow = {
  id: string
  project_id: string
  user_id: string
  type: string | null
  title: string | null
  content: string | null
  user_input?: string | null
  image_url?: string | null
  image_urls?: string | null
  selected_image_url?: number | string | null
  image_key?: string | null
  image_size?: number | string | null
  image_type?: string | null
  order_index?: number | string | null
  next_card_id?: string | null
  prev_card_id?: string | null
  scene_number?: number | string | null
  shot_type?: string | null
  angle?: string | null
  background?: string | null
  mood_lighting?: string | null
  dialogue?: string | null
  sound?: string | null
  image_prompt?: string | null
  storyboard_status?: string | null
  shot_description?: string | null
  video_url?: string | null
  video_key?: string | null
  video_prompt?: string | null
  card_width?: number | string | null
  created_at?: string | null
  updated_at?: string | null
}

export function normalizeCardRow(row: CardRow): Card {
  const imageUrls = parseImageUrls(row.image_urls)
  const selectedImageIndex = parseNullableInteger(row.selected_image_url)
  const imageSize = parseNullableInteger(row.image_size)
  const orderIndex = parseNullableInteger(row.order_index)
  const sceneNumber = parseNullableInteger(row.scene_number)
  const cardWidth = parseNullableInteger(row.card_width)

  return {
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    type: (row.type as Card['type']) ?? 'scene',
    title: row.title ?? 'Untitled Scene',
    content: row.content ?? '',
    user_input: row.user_input ?? undefined,
    image_url: row.image_url ?? undefined,
    image_urls: imageUrls ?? undefined,
    selected_image_url: selectedImageIndex ?? undefined,
    image_key: row.image_key ?? undefined,
    image_size: imageSize ?? undefined,
    image_type: row.image_type ?? undefined,
    order_index: orderIndex ?? 0,
    next_card_id: row.next_card_id ?? undefined,
    prev_card_id: row.prev_card_id ?? undefined,
    scene_number: sceneNumber ?? undefined,
    shot_type: row.shot_type ?? undefined,
    angle: row.angle ?? undefined,
    background: row.background ?? undefined,
    dialogue: row.dialogue ?? undefined,
    sound: row.sound ?? undefined,
    image_prompt: row.image_prompt ?? undefined,
    storyboard_status: row.storyboard_status ?? undefined,
    shot_description: row.shot_description ?? undefined,
    video_url: row.video_url ?? undefined,
    video_key: row.video_key ?? undefined,
    video_prompt: row.video_prompt ?? undefined,
    card_width: cardWidth ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }
}

export function parseImageUrls(value: unknown): string[] | undefined {
  if (!value) {
    return undefined
  }

  if (Array.isArray(value)) {
    const list = value.filter(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    )
    return list.length ? list : undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return undefined
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        const list = parsed.filter(
          (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
        )
        return list.length ? list : undefined
      }
    } catch {
      return [trimmed]
    }
  }

  return undefined
}

export function parseNullableInteger(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return Math.trunc(parsed)
}

export function parseNullableNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return parsed
}
