import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { cardInputSchema, cardsUpdateSchema, cardDeleteSchema, projectIdSchema } from '@/lib/validation/schemas'
import { deleteImageFromR2 } from '@/lib/r2'
import { queryD1 } from '@/lib/db/d1'
import { normalizeCardRow, type CardRow } from '@/lib/db/cardRow'
import type { Card } from '@/types'

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

type CardUpdateInput = ReturnType<typeof cardsUpdateSchema.parse>['cards'][0]

type PreparedCreateCard = {
  card: ReturnType<typeof cardInputSchema.parse>
  autoOrder: boolean
}

const MAX_CASE_UPDATE_PARAMS = 220

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      throw ApiError.badRequest('project_id parameter is required')
    }

    const validatedProjectId = projectIdSchema.parse(projectId)

    const sceneNumberParam = searchParams.get('scene_number')
    const conditions = ['project_id = ?1', 'user_id = ?2']
    const params: unknown[] = [validatedProjectId, userId]

    if (sceneNumberParam !== null) {
      const parsedSceneNumber = Number(sceneNumberParam)
      if (!Number.isFinite(parsedSceneNumber)) {
        throw ApiError.badRequest('scene_number must be a valid number')
      }
      conditions.push(`scene_number = ?${params.length + 1}`)
      params.push(Math.trunc(parsedSceneNumber))
    }

    const sql = `SELECT *
                 FROM cards
                 WHERE ${conditions.join('\n                   AND ')}
                 ORDER BY order_index ASC`
    const rows = await queryD1<CardRow>(sql, params)
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

    if (Array.isArray(body)) {
      if (body.length === 0) {
        throw ApiError.badRequest('At least one card is required')
      }

      const validatedCards = body.map(card => cardInputSchema.parse(card))
      const orderedCards = await assignOrderIndexes(validatedCards, userId)
      const prepared = orderedCards.map(card => prepareCardInsert(card, userId, false))

      for (const entry of prepared) {
        await queryD1(entry.sql, entry.params)
      }

      const inserted = prepared.map(entry => normalizeCardRow(entry.record as CardRow))

      return createApiResponse(inserted)
    }

    const validatedCard = cardInputSchema.parse(body)
    const { card: orderedCard, autoOrder } = await assignSingleCardOrder(validatedCard, userId)
    const prepared = prepareCardInsert(orderedCard, userId, autoOrder)
    const rows = await queryD1<CardRow>(prepared.sql, prepared.params)

    let insertedCard: Card | null = null
    if (prepared.autoOrder) {
      const [row] = rows
      if (!row) {
        throw new Error('Inserted card could not be retrieved')
      }
      insertedCard = normalizeCardRow(row)
    } else {
      insertedCard = normalizeCardRow(prepared.record as CardRow)
    }

    return createApiResponse(insertedCard)
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

    const batches = chunkCardUpdates(validated.cards, MAX_CASE_UPDATE_PARAMS)
    for (const batch of batches) {
      const statement = prepareCardsBulkUpdate(batch, userId)
      if (statement) {
        await queryD1(statement.sql, statement.params)
      }
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

    if (validated.cardIds.length === 0) {
      return createApiResponse({ deletedCount: 0, deletedImages: 0 })
    }

    const providedImageKeys = validated.imageKeys ?? {}
    const providedKeyValues = Object.values(providedImageKeys).filter((key): key is string => Boolean(key))
    const missingCardIds = validated.cardIds.filter(
      id => !Object.prototype.hasOwnProperty.call(providedImageKeys, id)
    )

    let fallbackImageKeys: string[] = []
    if (missingCardIds.length > 0) {
      const selectPlaceholders = createNumberedPlaceholders(missingCardIds.length)
      const selectSql = `SELECT image_key
                       FROM cards
                       WHERE id IN (${selectPlaceholders.join(', ')})
                         AND user_id = ?${missingCardIds.length + 1}`
      const rows = await queryD1<{ image_key?: string | null }>(selectSql, [...missingCardIds, userId])
      fallbackImageKeys = rows.map(row => row.image_key).filter((key): key is string => Boolean(key))
    }

    const imageKeys = Array.from(new Set([...providedKeyValues, ...fallbackImageKeys]))

    if (imageKeys.length > 0) {
      await Promise.allSettled(imageKeys.map(key => deleteImageFromR2(key)))
    }

    const deletePlaceholders = createNumberedPlaceholders(validated.cardIds.length)
    const deleteSql = `DELETE FROM cards
                       WHERE id IN (${deletePlaceholders.join(', ')})
                         AND user_id = ?${validated.cardIds.length + 1}`
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

type PreparedInsertStatement = {
  id: string
  sql: string
  params: unknown[]
  record: Record<string, unknown>
  autoOrder: boolean
}

function prepareCardInsert(
  cardInput: ReturnType<typeof cardInputSchema.parse>,
  userId: string,
  autoOrder: boolean
): PreparedInsertStatement {
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
  const card = { ...(cardInput as unknown as Record<string, unknown>) }

  if (autoOrder) {
    delete card.order_index
    delete card.scene_number
  }

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

  if (!autoOrder) {
    const sql = `INSERT INTO cards (${columns.join(', ')})
                 VALUES (${placeholders.join(', ')})`
    return {
      id,
      sql,
      params,
      record,
      autoOrder: false,
    }
  }

  const projectPlaceholderIndex = columns.indexOf('project_id')
  const userPlaceholderIndex = columns.indexOf('user_id')
  if (projectPlaceholderIndex === -1 || userPlaceholderIndex === -1) {
    throw new CardValidationError('project_id and user_id are required for auto-order inserts')
  }

  const computedColumns = ['order_index', 'scene_number']
  const selectValues = [
    ...placeholders,
    'COALESCE(MAX(order_index), -1) + 1',
    'COALESCE(MAX(order_index), -1) + 2',
  ]

  const sql = `INSERT INTO cards (${[...columns, ...computedColumns].join(', ')})
               SELECT ${selectValues.join(', ')}
               FROM cards
               WHERE project_id = ?${projectPlaceholderIndex + 1}
                 AND user_id = ?${userPlaceholderIndex + 1}
               RETURNING *`

  return {
    id,
    sql,
    params,
    record,
    autoOrder: true,
  }
}

function prepareCardsBulkUpdate(cardInputs: CardUpdateInput[], userId: string) {
  if (cardInputs.length === 0) {
    return null
  }

  const params: unknown[] = []
  let index = 1
  const columnCases = new Map<string, string[]>()
  const cardIdIndex = new Map<string, number>()

  const ensureCardIdPlaceholder = (cardId: string) => {
    let idIndex = cardIdIndex.get(cardId)
    if (idIndex === undefined) {
      idIndex = index++
      cardIdIndex.set(cardId, idIndex)
      params.push(cardId)
    }
    return idIndex
  }

  for (const cardInput of cardInputs) {
    if (!cardInput.id) {
      throw new CardValidationError('id is required for card updates')
    }

    const card = cardInput as unknown as Record<string, unknown>

    for (const key of ALLOWED_KEYS) {
      if (key === 'id' || key === 'project_id' || key === 'user_id') {
        continue
      }

      if (!Object.prototype.hasOwnProperty.call(card, key)) {
        continue
      }

      const value = card[key]
      if (value === undefined) {
        continue
      }

      const transformed = transformValueForDb(key, value)
      const idPlaceholder = ensureCardIdPlaceholder(cardInput.id)
      const valuePlaceholder = index++
      params.push(transformed)

      const entries = columnCases.get(key) ?? []
      entries.push(`WHEN ?${idPlaceholder} THEN ?${valuePlaceholder}`)
      columnCases.set(key, entries)
    }
  }

  if (columnCases.size === 0) {
    return null
  }

  const setClauses: string[] = []
  for (const [column, entries] of columnCases) {
    if (entries.length === 0) {
      continue
    }
    setClauses.push(`${column} = CASE id ${entries.join(' ')} ELSE ${column} END`)
  }

  const updatedAtPlaceholder = index++
  params.push(new Date().toISOString())
  setClauses.push(`updated_at = ?${updatedAtPlaceholder}`)

  const idPlaceholders = Array.from(cardIdIndex.values()).map(id => `?${id}`)

  const userPlaceholder = index++
  params.push(userId)

  const sql = `UPDATE cards
               SET ${setClauses.join(', ')}
               WHERE id IN (${idPlaceholders.join(', ')})
                 AND user_id = ?${userPlaceholder}`

  return { sql, params }
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
  const map = new Map<string, Card>()

  for (const row of normalized) {
    if (typeof row.id === 'string') {
      map.set(row.id, row)
    }
  }

  return ids
    .map(id => map.get(id))
    .filter((row): row is Card => row !== undefined)
}

function createNumberedPlaceholders(length: number, startIndex = 1) {
  return Array.from({ length }, (_, index) => `?${startIndex + index}`)
}

function countCardUpdateFields(cardInput: CardUpdateInput) {
  const card = cardInput as unknown as Record<string, unknown>
  let count = 0

  for (const key of ALLOWED_KEYS) {
    if (key === 'id' || key === 'project_id' || key === 'user_id') {
      continue
    }

    if (!Object.prototype.hasOwnProperty.call(card, key)) {
      continue
    }

    const value = card[key]
    if (value === undefined) {
      continue
    }

    count += 1
  }

  return count
}

async function assignOrderIndexes(
  cards: ReturnType<typeof cardInputSchema.parse>[],
  userId: string
): Promise<ReturnType<typeof cardInputSchema.parse>[]> {
  const projectCounter = new Map<string, number>()

  for (const card of cards) {
    const projectId = card.project_id
    if (!projectId) {
      throw new CardValidationError('project_id is required')
    }

    if (!projectCounter.has(projectId)) {
      const nextOrder = await fetchNextOrderIndex(projectId, userId)
      projectCounter.set(projectId, nextOrder)
    }
  }

  return cards.map(card => {
    const projectId = card.project_id
    if (!projectId) {
      throw new CardValidationError('project_id is required')
    }

    const nextOrder = projectCounter.get(projectId)
    if (nextOrder === undefined) {
      throw new CardValidationError('Unable to determine order index for project')
    }

    projectCounter.set(projectId, nextOrder + 1)

    return {
      ...card,
      order_index: nextOrder,
      scene_number: nextOrder + 1,
    }
  })
}

async function shiftOrderIndexesForInsert(projectId: string, userId: string, startIndex: number) {
  const now = new Date().toISOString()
  const sql = `UPDATE cards
                 SET order_index = order_index + 1,
                     scene_number = COALESCE(scene_number, order_index + 1) + 1,
                     updated_at = ?1
               WHERE order_index >= ?2
                 AND project_id = ?3
                 AND user_id = ?4`
  await queryD1(sql, [now, startIndex, projectId, userId])
}

async function assignSingleCardOrder(
  cardInput: ReturnType<typeof cardInputSchema.parse>,
  userId: string
): Promise<PreparedCreateCard> {
  const projectId = cardInput.project_id
  if (!projectId) {
    throw new CardValidationError('project_id is required')
  }

  const requestedOrder =
    typeof cardInput.order_index === 'number' && Number.isFinite(cardInput.order_index)
      ? Math.max(0, Math.trunc(cardInput.order_index))
      : undefined

  if (requestedOrder === undefined) {
    return { card: cardInput, autoOrder: true }
  }

  const nextOrder = await fetchNextOrderIndex(projectId, userId)
  if (requestedOrder >= nextOrder) {
    return {
      card: {
        ...cardInput,
        order_index: nextOrder,
        scene_number: nextOrder + 1,
      },
      autoOrder: false,
    }
  }

  await shiftOrderIndexesForInsert(projectId, userId, requestedOrder)
  return {
    card: {
      ...cardInput,
      order_index: requestedOrder,
      scene_number: requestedOrder + 1,
    },
    autoOrder: false,
  }
}

async function fetchNextOrderIndex(projectId: string, userId: string): Promise<number> {
  const rows = await queryD1<{ max_order?: number | string | null }>(
    `SELECT COALESCE(MAX(order_index), -1) AS max_order
       FROM cards
      WHERE project_id = ?1
        AND user_id = ?2`,
    [projectId, userId]
  )

  const raw = rows[0]?.max_order
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  const safe = Number.isFinite(parsed) ? Math.trunc(parsed) : -1
  return safe + 1
}

function chunkCardUpdates(cards: CardUpdateInput[], maxParams: number) {
  const entries = cards
    .map(card => ({ card, fieldCount: countCardUpdateFields(card) }))
    .filter(entry => entry.fieldCount > 0)

  const chunks: CardUpdateInput[][] = []
  let currentChunk: CardUpdateInput[] = []
  let placeholderCount = 2 // updated_at + user_id

  for (const entry of entries) {
    const contribution = entry.fieldCount + 1 // +1 for the card id placeholder
    if (currentChunk.length > 0 && placeholderCount + contribution > maxParams) {
      chunks.push(currentChunk)
      currentChunk = []
      placeholderCount = 2
    }

    currentChunk.push(entry.card)
    placeholderCount += contribution
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}
