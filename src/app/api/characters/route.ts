import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { deleteImageFromR2 } from '@/lib/r2'
import { queryD1, queryD1Single, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'
import { ensureCharactersTable } from '@/lib/db/characters'

export const runtime = 'nodejs'

type CharacterRow = {
  id: string
  user_id: string
  project_id: string | null
  name: string
  description: string | null
  edit_prompt: string | null
  image_url: string | null
  image_key: string | null
  image_size: number | string | null
  created_at: string | null
  updated_at: string | null
}

type NormalizedCharacterRow = {
  id: string
  user_id: string
  project_id: string | null
  name: string
  description: string | null
  edit_prompt: string | null
  image_url: string | null
  image_key: string | null
  image_size: number | null
  created_at: string | null
  updated_at: string | null
}

const UPDATEABLE_COLUMNS = [
  'name',
  'description',
  'edit_prompt',
  'image_url',
  'image_key',
  'image_size',
  'project_id',
] as const

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await ensureCharactersTable()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    const params: unknown[] = [userId]
    let sql = `SELECT id, user_id, project_id, name, description, edit_prompt,
                      image_url, image_key, image_size,
                      created_at, updated_at
               FROM characters
               WHERE user_id = ?1`

    if (projectId) {
      params.push(projectId)
      sql += ` AND project_id = ?${params.length}`
    }

    sql += ' ORDER BY datetime(created_at) DESC'

    const rows = await queryD1<CharacterRow>(sql, params)
    const characters = rows.map(row => normalizeCharacterRow(row)).filter((row): row is NormalizedCharacterRow => row !== null)

    return NextResponse.json({ characters })
  } catch (error) {
    return handleCharactersRouteError('GET', error, 'Failed to load characters')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await ensureCharactersTable()

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    const params: unknown[] = [
      id,
      userId,
      body.project_id ?? null,
      name,
      body.description ?? null,
      body.edit_prompt ?? null,
      body.image_url ?? null,
      body.image_key ?? null,
      parseNullableNumber(body.image_size),
      now,
      now,
    ]

    await queryD1(
      `INSERT INTO characters (
         id, user_id, project_id, name, description, edit_prompt,
         image_url, image_key, image_size,
         created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      params,
    )

    const inserted = await fetchCharacterById(id, userId)

    return NextResponse.json({ character: normalizeCharacterRow(inserted) })
  } catch (error) {
    return handleCharactersRouteError('POST', error, 'Failed to create character')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await ensureCharactersTable()

    const body = await request.json()
    const characterId = typeof body.id === 'string' ? body.id : null

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    const setClauses: string[] = []
    const params: unknown[] = []

    const addClause = (column: string, value: unknown) => {
      params.push(value)
      setClauses.push(`${column} = ?${params.length}`)
    }

    for (const column of UPDATEABLE_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(body, column)) {
        const value = column === 'image_size'
          ? parseNullableNumber(body[column])
          : body[column] ?? null
        addClause(column, value)
      }
    }

    const now = new Date().toISOString()
    addClause('updated_at', now)

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 })
    }

    params.push(characterId)
    const idPlaceholder = `?${params.length}`
    params.push(userId)
    const userPlaceholder = `?${params.length}`

    const sql = `UPDATE characters SET ${setClauses.join(', ')} WHERE id = ${idPlaceholder} AND user_id = ${userPlaceholder}`
    await queryD1(sql, params)

    const updated = await fetchCharacterById(characterId, userId)

    return NextResponse.json({ character: normalizeCharacterRow(updated) })
  } catch (error) {
    return handleCharactersRouteError('PUT', error, 'Failed to update character')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await ensureCharactersTable()

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('id')

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    const existing = await fetchCharacterById(characterId, userId)

    if (!existing) {
      return NextResponse.json({ success: true, deleted: false })
    }

    await queryD1(
      `DELETE FROM characters WHERE id = ?1 AND user_id = ?2`,
      [characterId, userId],
    )

    if (existing.image_key) {
      deleteImageFromR2(existing.image_key).catch(error => {
        console.warn('[Characters API] Failed to delete R2 asset', existing.image_key, error)
      })
    }

    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    return handleCharactersRouteError('DELETE', error, 'Failed to delete character')
  }
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeCharacterRow(row: CharacterRow | null): NormalizedCharacterRow | null {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    name: row.name,
  description: row.description,
  edit_prompt: row.edit_prompt,
  image_url: row.image_url,
  image_key: row.image_key,
  image_size: parseNullableNumber(row.image_size),
  created_at: row.created_at,
  updated_at: row.updated_at,
 }
}

async function fetchCharacterById(id: string, userId: string): Promise<CharacterRow | null> {
  return queryD1Single<CharacterRow>(
    `SELECT id, user_id, project_id, name, description, edit_prompt,
            image_url, image_key, image_size,
            created_at, updated_at
     FROM characters
     WHERE id = ?1 AND user_id = ?2
     LIMIT 1`,
    [id, userId],
  )
}

function handleCharactersRouteError(method: string, error: unknown, message: string) {
  if (error instanceof D1ConfigurationError) {
    console.error(`[Characters API] ${method} configuration error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (error instanceof D1QueryError) {
    console.error(`[Characters API] ${method} query error:`, error.details ?? error)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  console.error(`[Characters API] ${method} unexpected error:`, error)
  return NextResponse.json({ error: message }, { status: 500 })
}
