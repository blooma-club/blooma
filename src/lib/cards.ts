import type { Card } from '@/types'

export type CreateCardOptions = {
  userId: string
  projectId: string
  currentCards: Card[]
  insertIndex?: number
}

export const computeNextSceneIndex = (currentCards: Card[]): number => {
  let next = currentCards.length + 1
  const existing = new Set(currentCards.map(c => c.title))
  while (existing.has(`Scene ${next}`)) next += 1
  return next
}

const clampInsertIndex = (opts: CreateCardOptions) => {
  const { currentCards, insertIndex } = opts
  if (insertIndex === undefined || Number.isNaN(insertIndex)) {
    return currentCards.length
  }
  return Math.min(Math.max(insertIndex, 0), currentCards.length)
}

export const buildCardPayload = (opts: CreateCardOptions) => {
  const insertIndex = clampInsertIndex(opts)
  const nextSceneIndex = computeNextSceneIndex(opts.currentCards)
  const previousCard = opts.currentCards[insertIndex - 1]
  const followingCard = opts.currentCards[insertIndex]

  return {
    title: `Scene ${nextSceneIndex}`,
    content: '',
    type: 'scene' as const,
    user_id: opts.userId,
    project_id: opts.projectId,
    order_index: insertIndex,
    scene_number: insertIndex + 1,
    shot_description: '',
    shot_type: '',
    dialogue: '',
    sound: '',
    image_prompt: '',
    storyboard_status: 'ready',
    prev_card_id: previousCard?.id || null,
    next_card_id: followingCard?.id || null,
  }
}

export const linkPreviousCard = async (previousCardId: string, newCardId: string, accessToken?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch('/api/cards', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ cards: [{ id: previousCardId, next_card_id: newCardId }] })
  })
  if (!res.ok) {
    // 연결 실패는 치명적이지 않으므로 경고만 남김
    try {
      console.warn('prev->next link update failed:', await res.text())
    } catch {}
  }
}

export const createAndLinkCard = async (
  opts: CreateCardOptions,
  context: string = 'STORYBOARD',
  accessToken?: string
) => {
  const insertIndex = clampInsertIndex(opts)
  const payload = buildCardPayload(opts)

  // 생성
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch('/api/cards', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  const json = await response.json().catch(() => ({}))
  // 통일된 로깅
   
  console.log(`📡 [${context} ADD CARD] API response:`, {
    status: response.status,
    statusText: response.statusText,
    data: json,
    hasData: !!json?.data
  })

  if (!response.ok) {
    const msg = json?.error || json?.details || json?.message || `HTTP ${response.status}: ${response.statusText}`
    throw new Error(`카드 생성 실패: ${msg}`)
  }

  const inserted: Card | undefined = json?.data
  if (!inserted?.id) throw new Error('API 응답에 카드 ID가 없습니다')

  // 연결
  if (insertIndex === opts.currentCards.length) {
    const lastCard = opts.currentCards[opts.currentCards.length - 1]
    if (lastCard?.id) {
      await linkPreviousCard(lastCard.id, inserted.id, accessToken)
    }
  }

  return inserted
}
