import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { cardInputSchema, cardsUpdateSchema, cardDeleteSchema, projectIdSchema } from '@/lib/validation/schemas'
import { deleteImageFromR2 } from '@/lib/r2'
import { queryD1, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

const handleError = createErrorHandler('api/cards')

// 허용 컬럼 화이트리스트 (DB 컬럼과 1:1 매핑)
const ALLOWED_KEYS = new Set([
  'id',
  'project_id',
  'user_id',
  'type',
  'title',
  'content',
  'user_input',
  'image_url',
  'image_urls',
  'selected_image_url',
  'image_key',
  'image_size',
  'image_type',
  'order_index',
  'card_width',
  'next_card_id',
  'prev_card_id',
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
  'card_width',
])

class CardValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CardValidationError'
  }
}

// CardValidationError를 ApiError로 변환하는 헬퍼
function convertCardValidationError(error: CardValidationError): ApiError {
  return ApiError.badRequest(error.message)
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
  video_url?: string | null
  video_key?: string | null
  video_prompt?: string | null
  card_width?: number | string | null
  created_at?: string | null
  updated_at?: string | null
}

type CardLinkInfo = {
  id: string
  image_key: string | null
  prev_card_id: string | null
  next_card_id: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      throw ApiError.badRequest('project_id parameter is required')
    }

    const validatedProjectId = projectIdSchema.parse(projectId)

    const sql = `SELECT *
                 FROM cards
                 WHERE project_id = ?1
                   AND user_id = ?2
                 ORDER BY order_index ASC`
    const rows = await queryD1<CardRow>(sql, [validatedProjectId, userId])
    const data = rows.map(normalizeCardRow)

    return createApiResponse(data)
  } catch (error) {
    if (error instanceof CardValidationError) {
      return handleError(convertCardValidationError(error))
    }
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()

    // 단일 카드 또는 배열 처리
    if (Array.isArray(body)) {
      if (body.length === 0) {
        throw ApiError.badRequest('At least one card is required')
      }

      const validatedCards = body.map(card => cardInputSchema.parse(card))
      const prepared = validatedCards.map(card => prepareCardInsert(card, userId))

      for (const { sql, params } of prepared) {
        await queryD1(sql, params)
      }

      const ids = prepared.map(entry => entry.id)
      const inserted = await fetchCardsByIds(ids, userId)

      return createApiResponse(inserted)
    }

    const validatedCard = cardInputSchema.parse(body)
    const single = prepareCardInsert(validatedCard, userId)
    await queryD1(single.sql, single.params)

    const [inserted] = await fetchCardsByIds([single.id], userId)

    return createApiResponse(inserted ?? null)
  } catch (error) {
    if (error instanceof CardValidationError) {
      return handleError(convertCardValidationError(error))
    }
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    const validated = cardsUpdateSchema.parse(body)

    const statements = validated.cards.map(card => prepareCardUpdate(card, userId))

    for (const statement of statements) {
      if (statement.setClauses.length === 0) {
        continue
      }
      await queryD1(statement.sql, statement.params)
    }

    const ids = validated.cards.map(card => card.id)
    const updated = await fetchCardsByIds(ids, userId)

    return createApiResponse(updated)
  } catch (error) {
    if (error instanceof CardValidationError) {
      return handleError(convertCardValidationError(error))
    }
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    const validated = cardDeleteSchema.parse(body)

    const cards = await loadCardsForDeletion(validated.cardIds, userId)
    if (cards.length === 0) {
      return createApiResponse({ deletedCount: 0, deletedImages: 0 })
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

    const deletePlaceholders = createNumberedPlaceholders(validated.cardIds.length)
    const deleteSql = `DELETE FROM cards WHERE id IN (${deletePlaceholders.join(', ')}) AND user_id = ?${
      validated.cardIds.length + 1
    }`
    await queryD1(deleteSql, [...validated.cardIds, userId])

    return createApiResponse({
      deletedCount: validated.cardIds.length,
      deletedImages: imageKeys.length,
    })
  } catch (error) {
    if (error instanceof CardValidationError) {
      return handleError(convertCardValidationError(error))
    }
    return handleError(error)
  }
}

function prepareCardInsert(cardInput: ReturnType<typeof cardInputSchema.parse>, userId: string) {
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
  const id = cardInput.id ?? randomUUID()
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

function prepareCardUpdate(cardInput: ReturnType<typeof cardsUpdateSchema.parse>['cards'][0], userId: string) {
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
    card_width: parseNullableInteger(row.card_width),
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

