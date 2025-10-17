import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { CardInput } from '@/types'
import { deleteImageFromR2 } from '@/lib/r2'
import { queryD1, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

// 허용 컬럼 화이트리스트 (DB 컬럼과 1:1 매핑)
const ALLOWED_KEYS = new Set([
  'id',
  'project_id',
  'user_id',
  'type',
  'title',
  'content',
  'user_input',
  'image_url', // 단일 이미지 URL
  'image_urls', // 기존 배열 방식 (하위 호환성)
  'selected_image_url', // 기존 인덱스 방식 (하위 호환성)
  'image_key', // R2 키 (삭제용)
  'image_size', // 파일 크기
  'image_type', // uploaded/generated
  'order_index',
  'next_card_id',
  'prev_card_id',
  // 메타데이터 필드
  'scene_number',
  'shot_type',
  'angle',
  'background',
  'mood_lighting',
  'dialogue',
  'sound',
  'image_prompt',
  'storyboard_status',
  'shot_description',
  // Timeline fields
  'duration',
  'audio_url',
  'voice_over_url',
  'voice_over_text',
  'start_time',
  'video_url',
  'video_key',
  'video_prompt',
])

const JSON_COLUMNS = new Set(['image_urls'])
const INTEGER_COLUMNS = new Set([
  'selected_image_url',
  'image_size',
  'order_index',
  'scene_number',
])
const FLOAT_COLUMNS = new Set(['duration', 'start_time'])

class CardValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CardValidationError'
  }
}

type CardRow = {
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
  duration?: number | string | null
  audio_url?: string | null
  voice_over_url?: string | null
  voice_over_text?: string | null
  start_time?: number | string | null
  video_url?: string | null
  video_key?: string | null
  video_prompt?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type CardLinkInfo = {
  id: string
  image_key: string | null
  prev_card_id: string | null
  next_card_id: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: (CardInput & { project_id?: string }) | (CardInput & { project_id?: string })[] =
      await request.json()

    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: 'At least one card is required' }, { status: 400 })
      }

      const prepared = body.map(card => prepareCardInsert(card, userId))

      for (const { sql, params } of prepared) {
        await queryD1(sql, params)
      }

      const ids = prepared.map(entry => entry.id)
      const inserted = await fetchCardsByIds(ids, userId)

      return NextResponse.json({ data: inserted, success: true })
    }

    const single = prepareCardInsert(body, userId)
    await queryD1(single.sql, single.params)

    const [inserted] = await fetchCardsByIds([single.id], userId)

    return NextResponse.json({ data: inserted ?? null, success: true })
  } catch (error) {
    return handleCardsRouteError('POST', error, 'Failed to create cards')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: { cards: (CardInput & { id: string })[] } = await request.json()

    if (!body.cards || !Array.isArray(body.cards) || body.cards.length === 0) {
      return NextResponse.json({ error: 'Cards array is required' }, { status: 400 })
    }

    const statements = body.cards.map(card => prepareCardUpdate(card, userId))

    for (const statement of statements) {
      if (statement.setClauses.length === 0) {
        continue
      }
      await queryD1(statement.sql, statement.params)
    }

    const ids = body.cards.map(card => card.id)
    const updated = await fetchCardsByIds(ids, userId)

    return NextResponse.json({ data: updated, success: true })
  } catch (error) {
    return handleCardsRouteError('PUT', error, 'Failed to update cards')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: { cardIds: string[] } = await request.json()

    if (!body.cardIds || !Array.isArray(body.cardIds) || body.cardIds.length === 0) {
      return NextResponse.json({ error: 'cardIds array is required' }, { status: 400 })
    }

    const cards = await loadCardsForDeletion(body.cardIds, userId)
    if (cards.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0, deletedImages: 0 })
    }

    const idSet = new Set(cards.map(card => card.id))
    const cardMap = new Map(cards.map(card => [card.id, card]))
    const updateTimestamp = new Date().toISOString()
    const neighborUpdates = new Map<
      string,
      { next_card_id?: string | null; prev_card_id?: string | null; updated_at: string }
    >()

    const findNextSurvivor = (startingId: string | null): string | null => {
      let cursor = startingId
      const visited = new Set<string>()
      while (cursor && idSet.has(cursor)) {
        if (visited.has(cursor)) {
          cursor = null
          break
        }
        visited.add(cursor)
        const next = cardMap.get(cursor)?.next_card_id
        if (!next) return null
        cursor = next
      }
      return cursor ?? null
    }

    const findPrevSurvivor = (startingId: string | null): string | null => {
      let cursor = startingId
      const visited = new Set<string>()
      while (cursor && idSet.has(cursor)) {
        if (visited.has(cursor)) {
          cursor = null
          break
        }
        visited.add(cursor)
        const prev = cardMap.get(cursor)?.prev_card_id
        if (!prev) return null
        cursor = prev
      }
      return cursor ?? null
    }

    for (const card of cards) {
      if (card.prev_card_id && !idSet.has(card.prev_card_id)) {
        const nextSurvivor = findNextSurvivor(card.next_card_id)
        const patch = neighborUpdates.get(card.prev_card_id) ?? { updated_at: updateTimestamp }
        patch.next_card_id = nextSurvivor
        patch.updated_at = updateTimestamp
        neighborUpdates.set(card.prev_card_id, patch)
      }

      if (card.next_card_id && !idSet.has(card.next_card_id)) {
        const prevSurvivor = findPrevSurvivor(card.prev_card_id)
        const patch = neighborUpdates.get(card.next_card_id) ?? { updated_at: updateTimestamp }
        patch.prev_card_id = prevSurvivor
        patch.updated_at = updateTimestamp
        neighborUpdates.set(card.next_card_id, patch)
      }
    }

    for (const [cardId, patch] of neighborUpdates.entries()) {
      const setClauses: string[] = []
      const params: unknown[] = []
      let index = 1

      if (patch.next_card_id !== undefined) {
        setClauses.push(`next_card_id = ?${index}`)
        params.push(patch.next_card_id)
        index += 1
      }

      if (patch.prev_card_id !== undefined) {
        setClauses.push(`prev_card_id = ?${index}`)
        params.push(patch.prev_card_id)
        index += 1
      }

      setClauses.push(`updated_at = ?${index}`)
      params.push(patch.updated_at)
      index += 1

      const idPlaceholder = `?${index}`
      params.push(cardId)
      index += 1

      const userPlaceholder = `?${index}`
      params.push(userId)

      const sql = `UPDATE cards SET ${setClauses.join(', ')} WHERE id = ${idPlaceholder} AND user_id = ${userPlaceholder}`
      await queryD1(sql, params)
    }

    const imageKeys = cards.map(card => card.image_key).filter(Boolean) as string[]
    if (imageKeys.length > 0) {
      const deletePromises = imageKeys.map(key => deleteImageFromR2(key))
      await Promise.allSettled(deletePromises)
    }

    const deletePlaceholders = createNumberedPlaceholders(body.cardIds.length)
    const deleteSql = `DELETE FROM cards WHERE id IN (${deletePlaceholders.join(', ')}) AND user_id = ?${
      body.cardIds.length + 1
    }`
    await queryD1(deleteSql, [...body.cardIds, userId])

    return NextResponse.json({
      success: true,
      deletedCount: body.cardIds.length,
      deletedImages: imageKeys.length,
    })
  } catch (error) {
    return handleCardsRouteError('DELETE', error, 'Failed to delete cards')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id parameter is required' }, { status: 400 })
    }

    const sql = `SELECT *
                 FROM cards
                 WHERE project_id = ?1
                   AND user_id = ?2
                 ORDER BY order_index ASC`
    const rows = await queryD1<CardRow>(sql, [projectId, userId])
    const data = rows.map(normalizeCardRow)

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return handleCardsRouteError('GET', error, 'Failed to fetch cards')
  }
}

function prepareCardInsert(cardInput: CardInput & { project_id?: string }, userId: string) {
  if (!cardInput.project_id) {
    throw new CardValidationError('project_id is required')
  }
  if (!cardInput.title) {
    throw new CardValidationError('Title is required')
  }
  if (!cardInput.type) {
    throw new CardValidationError('type is required')
  }

  const now = new Date().toISOString()
  const id = (cardInput as { id?: string }).id ?? randomUUID()
  const card = cardInput as unknown as Record<string, unknown>

  const record: Record<string, unknown> = {
    id,
    project_id: cardInput.project_id,
    user_id: userId,
    type: cardInput.type,
    title: cardInput.title,
    content: cardInput.content ?? '',
  }

  for (const key of ALLOWED_KEYS) {
    if (key === 'id' || key === 'project_id' || key === 'user_id' || key === 'type' || key === 'title' || key === 'content') {
      continue
    }

    const value = card[key]
    if (value !== undefined) {
      record[key] = transformValueForDb(key, value)
    } else {
      record[key] = null
    }
  }

  const createdAt = card['created_at']
  const updatedAt = card['updated_at']

  record.created_at = typeof createdAt === 'string' ? createdAt : now
  record.updated_at = typeof updatedAt === 'string' ? updatedAt : now

  const columns = Object.keys(record)
  const placeholders = createNumberedPlaceholders(columns.length)
  const params = columns.map(column => record[column])

  const sql = `INSERT INTO cards (${columns.join(', ')})
               VALUES (${placeholders.join(', ')})`

  return { id, sql, params }
}

function prepareCardUpdate(cardInput: CardInput & { id: string }, userId: string) {
  if (!cardInput.id) {
    throw new CardValidationError('id is required for card updates')
  }

  const card = cardInput as unknown as Record<string, unknown>
  const setClauses: string[] = []
  const params: unknown[] = []
  let index = 1

  for (const key of ALLOWED_KEYS) {
    if (key === 'id' || key === 'project_id' || key === 'user_id') {
      continue
    }

    const value = card[key]
    if (value === undefined) {
      continue
    }

    setClauses.push(`${key} = ?${index}`)
    params.push(transformValueForDb(key, value))
    index += 1
  }

  setClauses.push(`updated_at = ?${index}`)
  params.push(new Date().toISOString())
  index += 1

  const idPlaceholder = `?${index}`
  params.push(cardInput.id)
  index += 1

  const userPlaceholder = `?${index}`
  params.push(userId)

  const sql = `UPDATE cards SET ${setClauses.join(', ')} WHERE id = ${idPlaceholder} AND user_id = ${userPlaceholder}`

  return { sql, params, setClauses }
}

function transformValueForDb(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return null
  }

  if (JSON_COLUMNS.has(key)) {
    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }

    if (typeof value === 'string') {
      try {
        JSON.parse(value)
        return value
      } catch {
        return JSON.stringify([value])
      }
    }

    return JSON.stringify(value)
  }

  if (INTEGER_COLUMNS.has(key)) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return null
    }
    return Math.trunc(parsed)
  }

  if (FLOAT_COLUMNS.has(key)) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return null
    }
    return parsed
  }

  return value
}

async function fetchCardsByIds(ids: string[], userId: string) {
  if (ids.length === 0) {
    return []
  }

  const placeholders = createNumberedPlaceholders(ids.length)
  const sql = `SELECT *
               FROM cards
               WHERE id IN (${placeholders.join(', ')})
                 AND user_id = ?${ids.length + 1}`
  const rows = await queryD1<CardRow>(sql, [...ids, userId])
  const normalized = rows.map(normalizeCardRow)
  const map = new Map<string, Record<string, unknown>>()

  for (const row of normalized) {
    if (typeof row.id === 'string') {
      map.set(row.id, row)
    }
  }

  return ids
    .map(id => map.get(id))
    .filter((row): row is Record<string, unknown> => row !== undefined)
}

async function loadCardsForDeletion(cardIds: string[], userId: string) {
  const placeholders = createNumberedPlaceholders(cardIds.length)
  const sql = `SELECT id, image_key, prev_card_id, next_card_id
               FROM cards
               WHERE id IN (${placeholders.join(', ')})
                 AND user_id = ?${cardIds.length + 1}`
  return queryD1<CardLinkInfo>(sql, [...cardIds, userId])
}

function normalizeCardRow(row: CardRow): Record<string, unknown> {
  const imageUrls = parseImageUrls(row.image_urls)

  return {
    ...row,
    image_urls: imageUrls,
    selected_image_url: parseNullableInteger(row.selected_image_url),
    image_size: parseNullableInteger(row.image_size),
    order_index: parseNullableInteger(row.order_index),
    scene_number: parseNullableInteger(row.scene_number),
    duration: parseNullableNumber(row.duration),
    start_time: parseNullableNumber(row.start_time),
  }
}

function parseImageUrls(value: unknown): string[] | null {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === 'string')
      }
    } catch {
      return [trimmed]
    }
  }

  return null
}

function parseNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.trunc(parsed)
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function createNumberedPlaceholders(length: number, startIndex = 1) {
  return Array.from({ length }, (_, index) => `?${startIndex + index}`)
}

function handleCardsRouteError(
  action: 'GET' | 'POST' | 'PUT' | 'DELETE',
  error: unknown,
  fallbackMessage = 'Internal server error',
) {
  if (error instanceof CardValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof D1ConfigurationError) {
    console.error(`[cards:${action}] D1 configuration error`, error)
    return NextResponse.json({ error: 'Cloudflare D1 is not configured' }, { status: 500 })
  }

  if (error instanceof D1QueryError) {
    console.error(`[cards:${action}] D1 query failed`, error)
    return NextResponse.json({ error: fallbackMessage }, { status: 500 })
  }

  console.error(`[cards:${action}] Unexpected error`, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
