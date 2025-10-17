import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { createStoryboard, trimFrames } from '@/lib/storyboardEngine'
import { extractTitle, stripTitle } from '@/lib/scriptParser'
import {
  queryD1,
  queryD1Single,
  D1ConfigurationError,
  D1QueryError,
} from '@/lib/db/d1'

type ScriptModelRow = {
  id: string
  project_id: string
  user_id?: string | null
  script_content: string
  script_title?: string | null
}

type ProjectOwnerRow = {
  user_id: string
}

type InsertedCardLog = {
  id: string
  project_id: string
  user_id: string
  title: string
}

type PersistedCardInput = {
  id: string
  projectId: string
  userId: string
  type: 'scene'
  title: string
  content: string
  userInput: string
  sceneNumber: number
  shotType: string
  shotDescription: string
  dialogue: string
  sound: string
  imagePrompt: string
  storyboardStatus: string
  orderIndex: number
}

const DEFAULT_IMAGE_URLS = '[]'
const REQUIRED_CARD_COLUMNS = [
  'id',
  'project_id',
  'user_id',
  'type',
  'title',
  'content',
  'order_index',
  'created_at',
  'updated_at',
] as const

let cachedCardsTableColumns: Set<string> | null = null
const missingColumnWarnings = new Set<string>()

async function getCardsTableColumns(): Promise<Set<string>> {
  if (cachedCardsTableColumns) {
    return cachedCardsTableColumns
  }

  try {
    const rows = await queryD1<{ name?: string }>(
      `PRAGMA table_info(cards)`
    )
    const columns = new Set<string>()
    for (const row of rows) {
      if (typeof row.name === 'string' && row.name.trim().length > 0) {
        columns.add(row.name)
      }
    }
    cachedCardsTableColumns = columns
    return columns
  } catch (error) {
    console.error('[CARDS] Failed to inspect cards table schema in D1:', error)
    throw error
  }
}

function logMissingColumns(columns: string[]) {
  const fresh = columns.filter(column => !missingColumnWarnings.has(column))
  if (fresh.length === 0) return

  fresh.forEach(column => missingColumnWarnings.add(column))
  console.warn(
    '[CARDS] Skipping columns missing from Cloudflare D1 cards table:',
    fresh,
    'Run the latest migrations (see database_migration_*.sql) to add them.',
  )
}

type ScriptContent = {
  script_content: string
  script_title?: string
}

async function fetchScriptModel(
  modelId: string,
  projectId: string,
  userId: string,
): Promise<ScriptContent> {
  const row = await queryD1Single<ScriptModelRow>(
    `SELECT id, project_id, user_id, script_content, script_title
     FROM script_models
     WHERE id = ?1
       AND project_id = ?2
       AND (user_id IS NULL OR user_id = ?3)
     LIMIT 1`,
    [modelId, projectId, userId],
  )

  if (!row) {
    throw new ResponseError('Model not found or access denied', 404)
  }

  return {
    script_content: row.script_content,
    script_title: row.script_title ?? undefined,
  }
}

async function ensureProjectOwnership(projectId: string, userId: string) {
  const row = await queryD1Single<ProjectOwnerRow>(
    `SELECT user_id
     FROM projects
     WHERE id = ?1
     LIMIT 1`,
    [projectId],
  )

  if (!row || row.user_id !== userId) {
    throw new ResponseError('Project not found or access denied', 403)
  }
}

async function insertCards(cards: PersistedCardInput[]) {
  if (cards.length === 0) {
    return []
  }

  const now = new Date().toISOString()
  const inserted: InsertedCardLog[] = []
  const availableColumns = await getCardsTableColumns()
  const missingRequired = REQUIRED_CARD_COLUMNS.filter(column => !availableColumns.has(column))

  if (missingRequired.length > 0) {
    throw new ResponseError(
      `Cloudflare D1 cards table is missing required columns: ${missingRequired.join(', ')}. Run the migrations in database_migration_*.sql.`,
      500,
    )
  }

  for (const card of cards) {
    const columnEntries: [string, unknown][] = [
      ['id', card.id],
      ['project_id', card.projectId],
      ['user_id', card.userId],
      ['type', card.type],
      ['title', card.title],
      ['content', card.content],
      ['user_input', card.userInput],
      ['image_url', null],
      ['image_urls', DEFAULT_IMAGE_URLS],
      ['selected_image_url', 0],
      ['image_key', null],
      ['image_size', null],
      ['image_type', null],
      ['order_index', card.orderIndex],
      ['scene_number', card.sceneNumber],
      ['shot_type', card.shotType],
      ['shot_description', card.shotDescription],
      ['dialogue', card.dialogue],
      ['sound', card.sound],
      ['image_prompt', card.imagePrompt],
      ['storyboard_status', card.storyboardStatus],
      ['created_at', now],
      ['updated_at', now],
    ]

    const includedEntries = columnEntries.filter(([column]) =>
      availableColumns.has(column),
    )
    const skippedColumns = columnEntries
      .filter(([column]) => !availableColumns.has(column))
      .map(([column]) => column)

    if (skippedColumns.length > 0) {
      logMissingColumns(skippedColumns)
    }

    const columns = includedEntries.map(([column]) => column)
    const params = includedEntries.map(([, value]) => value)
    const placeholders = includedEntries.map((_, idx) => `?${idx + 1}`)

    const sql = `
      INSERT INTO cards (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `

    await queryD1(sql, params)

    inserted.push({
      id: card.id,
      project_id: card.projectId,
      user_id: card.userId,
      title: card.title,
    })
  }

  return inserted
}

class ResponseError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ResponseError'
    this.status = status
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const body = await req.json()
    const projectId: string | undefined = body.projectId
    const modelId: string | undefined = body.modelId
    const script = typeof body.script === 'string' ? body.script : ''
    const style = body.visualStyle
    const ratio = body.ratio
    const mode = body.mode === 'async' ? 'async' : 'sync'
    const aiModel = body.aiModel
    const characters = Array.isArray(body.characters) ? body.characters : []

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      )
    }

    let scriptContent: string
    let scriptTitle: string | undefined

    if (modelId) {
      const scriptModel = await fetchScriptModel(modelId, projectId, userId)
      scriptContent = scriptModel.script_content
      scriptTitle = scriptModel.script_title
    } else if (script.trim()) {
      scriptContent = script
      scriptTitle = undefined
    } else {
      return NextResponse.json(
        { error: 'Missing script or modelId' },
        { status: 400 },
      )
    }

    const aspect = ratio || '16:9'
    const chosenStyle = style || 'Photorealistic'

    const topTitle = scriptTitle || extractTitle(scriptContent)
    const scriptWithoutTitle = topTitle ? stripTitle(scriptContent) : scriptContent

    await ensureProjectOwnership(projectId, userId)

    const sb = await createStoryboard({
      projectId,
      rawScript: scriptWithoutTitle,
      aspectRatio: aspect,
      style: chosenStyle,
      processMode: mode,
      topTitle,
      aiModel,
      characters,
    })

    console.log('[STORYBOARD BUILD] Skipping storyboard table - creating cards directly')

    const ownerId = userId

    console.log('[STORYBOARD BUILD] Using authenticated user as owner:', ownerId)

    try {
      const frames = trimFrames(sb.frames)
      if (frames && Array.isArray(frames) && frames.length > 0) {
        console.log('[CARDS] Creating initial cards for frames:', frames.length)
        console.log('[CARDS] Using projectId:', projectId, 'userId:', ownerId)

        const cardsToInsert: PersistedCardInput[] = frames.map((frame, idx) => {
          const card: PersistedCardInput = {
            id: randomUUID(),
            projectId,
            userId: ownerId,
            type: 'scene',
            title: `Scene ${frame.scene}`,
            content: frame.shotDescription || '',
            userInput: frame.imagePrompt || '',
            sceneNumber: frame.scene ?? idx + 1,
            shotType: frame.shot || '',
            shotDescription: frame.shotDescription || '',
            dialogue: frame.dialogue || '',
            sound: frame.sound || '',
            imagePrompt: frame.imagePrompt || '',
            storyboardStatus: 'pending',
            orderIndex: idx,
          }

          console.log(`[CARDS] Creating card ${idx + 1}:`, {
            scene: card.sceneNumber,
            shot_type: card.shotType,
            user_input: card.userInput?.slice(0, 50) || '',
            image_prompt: card.imagePrompt?.slice(0, 50) || '',
          })

          return card
        })

        const insertedCards = await insertCards(cardsToInsert)

        console.log('[CARDS] Successfully created', insertedCards.length, 'cards')
        if (insertedCards[0]) {
          console.log('[CARDS] Sample inserted card:', insertedCards[0])
        }
      }
    } catch (cardsPersistErr) {
      console.error('[CARDS] Failed to persist initial cards to D1:', cardsPersistErr)
      console.warn('Failed to persist initial cards to database', cardsPersistErr)
      throw cardsPersistErr // Re-throw the error so the API returns failure
    }

  // For sync mode, return full frames. For async mode return initial shell frames (no waiting for generation)
  return NextResponse.json({ projectId: projectId, storyboardId: sb.id, mode, framesCount: sb.frames.length, title: sb.title || '', frames: trimFrames(sb.frames) })
  } catch (err: unknown) {
    if (err instanceof ResponseError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    if (err instanceof D1ConfigurationError) {
      console.error('[STORYBOARD BUILD] Cloudflare D1 not configured', err)
      return NextResponse.json(
        { error: 'Cloudflare D1 is not configured' },
        { status: 500 },
      )
    }

    if (err instanceof D1QueryError) {
      console.error('[STORYBOARD BUILD] Cloudflare D1 query failed', err)
      return NextResponse.json(
        { error: 'Failed to persist storyboard cards' },
        { status: 500 },
      )
    }

    console.error('build storyboard error', err)
    return NextResponse.json({ error: 'Build failed' }, { status: 500 })
  }
}
