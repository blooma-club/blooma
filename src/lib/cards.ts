import type { Card } from '@/types'

export type CreateCardOptions = {
  userId: string
  projectId: string
  currentCards: Card[]
  insertIndex?: number
  cardWidth?: number
}

export const computeNextSceneIndex = (currentCards: Card[]): number => {
  let next = currentCards.length + 1
  const existing = new Set(currentCards.map(c => c.title))
  while (existing.has(`Scene ${next}`)) next += 1
  return next
}

export const buildCardPayload = (opts: CreateCardOptions) => {
  const nextSceneIndex = computeNextSceneIndex(opts.currentCards)

  const hasInsertIndex = typeof opts.insertIndex === 'number' && Number.isFinite(opts.insertIndex)
  const normalizedInsertIndex = hasInsertIndex
    ? Math.max(0, Math.trunc(opts.insertIndex!))
    : undefined

  return {
    title: `Scene ${nextSceneIndex}`,
    content: '',
    type: 'scene' as const,
    user_id: opts.userId,
    project_id: opts.projectId,
    shot_description: '',
    shot_type: '',
    dialogue: '',
    sound: '',
    image_prompt: '',
    storyboard_status: 'ready',
    card_width: typeof opts.cardWidth === 'number' ? Math.round(opts.cardWidth) : null,
    ...(typeof normalizedInsertIndex === 'number' ? { order_index: normalizedInsertIndex } : {}),
  }
}

export const createCard = async (
  opts: CreateCardOptions,
  context: string = 'STORYBOARD',
  accessToken?: string
) => {
  const payload = buildCardPayload(opts)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch('/api/cards', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg = json?.error || json?.details || json?.message || `HTTP ${response.status}: ${response.statusText}`
    throw new Error(`카드 생성 실패: ${msg}`)
  }

  const inserted: Card | undefined = json?.data
  if (!inserted?.id) throw new Error('API 응답에 카드 ID가 없습니다')

  return inserted
}
