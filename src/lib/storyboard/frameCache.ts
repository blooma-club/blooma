import type { Card } from '../../types'
import type { StoryboardFrame } from '../../types/storyboard'
import { cardToFrame } from '../utils'

type FrameCacheValue = {
  signature: string
  frame: StoryboardFrame
}

export type FrameCache = Map<string, FrameCacheValue>

const serializeList = (values?: unknown): string => {
  if (!Array.isArray(values)) {
    return ''
  }
  return values
    .map(value => {
      if (typeof value === 'string') {
        return value
      }
      if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b)
        )
        return entries.map(([, v]) => String(v ?? '')).join(':')
      }
      return String(value ?? '')
    })
    .join(',')
}

const normalizeCharacterMetadata = (card: Card) => {
  const metadata = card.metadata?.characterMetadata
  if (!Array.isArray(metadata)) {
    return ''
  }
  return metadata
    .map(item => {
      if (!item || typeof item !== 'object') {
        return ''
      }
      const { characterId, modelId, characterHandle, characterName } = item as Record<
        string,
        unknown
      >
      return [
        characterId ?? '',
        modelId ?? '',
        characterHandle ?? '',
        characterName ?? '',
      ]
        .map(value => String(value ?? ''))
        .join(':')
    })
    .sort()
    .join('|')
}

export const createFrameSignature = (
  card: Card,
  normalizedWidth: number,
  index: number
): string => {
  const combinedImageUrls = [
    card.image_url ?? '',
    Array.isArray(card.image_urls) ? card.image_urls.join(',') : '',
  ]
    .filter(Boolean)
    .join('|')

  const numericSelectedImageIndex =
    typeof card.selected_image_url === 'number' ? card.selected_image_url : -1

  return [
    card.id,
    normalizedWidth,
    index,
    card.scene_number ?? '',
    card.shot_description ?? '',
    card.shot_type ?? '',
    card.dialogue ?? '',
    card.sound ?? '',
    card.image_prompt ?? '',
    card.storyboard_status ?? '',
    card.background ?? '',
    combinedImageUrls,
    numericSelectedImageIndex,
    card.video_url ?? card.videoUrl ?? '',
    card.video_key ?? card.videoKey ?? '',
    card.video_prompt ?? card.videoPrompt ?? '',
    card.updated_at ?? '',
    serializeList(card.image_urls),
    normalizeCharacterMetadata(card),
  ].join('|')
}

export const getOrCreateFrameFromCard = (
  card: Card,
  index: number,
  normalizedWidth: number,
  cache: FrameCache
): StoryboardFrame => {
  const signature = createFrameSignature(card, normalizedWidth, index)
  const cached = cache.get(card.id)
  if (cached?.signature === signature) {
    return cached.frame
  }
  const frame = {
    ...cardToFrame(card, index),
    cardWidth: normalizedWidth,
  }
  cache.set(card.id, { signature, frame })
  return frame
}

export const pruneFrameCache = (cache: FrameCache, activeIds: Iterable<string>) => {
  const activeSet = new Set(activeIds)
  for (const key of cache.keys()) {
    if (!activeSet.has(key)) {
      cache.delete(key)
    }
  }
}

