import { Buffer } from 'node:buffer'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadCharacterImageToR2, deleteImageFromR2 } from '@/lib/r2'
import { queryD1, queryD1Single, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'
import { ensureCharactersTable } from '@/lib/db/characters'

export const runtime = 'nodejs'

type CharacterRow = {
  id: string
  user_id: string
  project_id?: string | null
  name: string | null
  description?: string | null
  edit_prompt?: string | null
  image_url?: string | null
  image_key?: string | null
  image_size?: number | string | null
  created_at?: string | null
  updated_at?: string | null
}

type InsertCharacterParams = {
  id: string
  userId: string
  projectId?: string
  name: string
  editPrompt?: string
  imageUrl: string | null
  imageKey: string | null
  imageSize: number | null
}

type UpdateCharacterParams = {
  id: string
  userId: string
  imageUrl?: string | null
  imageKey?: string | null
  imageSize?: number | null
  editPrompt?: string
  name?: string
  projectId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId: authenticatedUserId } = await auth()

    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await ensureCharactersTable()

    const contentType = request.headers.get('content-type') || ''

    let characterId: string | undefined
    let projectId: string | undefined
    let characterName: string | undefined
    let editPrompt: string | undefined
    let providedUserId: string | undefined
    let imageSource: string | undefined
    let isUpdate = false
    let fileMimeType: string | null = null
    let fileSize: number | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const fileEntry = formData.get('file')
      const characterIdValue = formData.get('characterId')

      if (!(fileEntry instanceof File)) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 })
      }

      if (typeof characterIdValue !== 'string' || characterIdValue.trim().length === 0) {
        return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
      }

      const projectIdValue = formData.get('projectId')
      const characterNameValue = formData.get('characterName')
      const editPromptValue = formData.get('editPrompt')
      const userIdValue = formData.get('userId')
      const isUpdateValue = formData.get('isUpdate')

      characterId = characterIdValue.trim()
      projectId = sanitizeOptionalString(projectIdValue)
      characterName = sanitizeOptionalString(characterNameValue)
      editPrompt = sanitizeOptionalString(editPromptValue)
      providedUserId = sanitizeOptionalString(userIdValue)
      isUpdate = parseBoolean(isUpdateValue)

      const arrayBuffer = await fileEntry.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      const mimeType = fileEntry.type || 'application/octet-stream'

      imageSource = `data:${mimeType};base64,${base64}`
      fileMimeType = mimeType
      fileSize = fileEntry.size
    } else {
      const body = await request.json()

      characterId = typeof body.characterId === 'string' ? body.characterId.trim() : undefined
      imageSource = typeof body.imageUrl === 'string' ? body.imageUrl : undefined
      projectId = sanitizeOptionalString(body.projectId)
      characterName = sanitizeOptionalString(body.characterName)
      editPrompt = sanitizeOptionalString(body.editPrompt)
      providedUserId = sanitizeOptionalString(body.userId)
      isUpdate = parseBoolean(body.isUpdate)
    }

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    if (!imageSource) {
      return NextResponse.json({ error: 'Image source is required' }, { status: 400 })
    }

    if (providedUserId && providedUserId !== authenticatedUserId) {
      console.warn(
        '[CharacterUpload] Provided userId does not match authenticated user',
        { providedUserId, authenticatedUserId }
      )
    }

    const userId = authenticatedUserId
    const normalizedProjectId = projectId ?? undefined

    let existingCharacter: CharacterRow | null = null
    if (isUpdate) {
      existingCharacter = await fetchCharacterById(characterId, userId)
    }

    const uploadResult = await uploadCharacterImageToR2(characterId, imageSource, normalizedProjectId)
    const resolvedImageUrl = uploadResult.publicUrl || uploadResult.signedUrl || null
    const resolvedImageSize =
      typeof uploadResult.size === 'number'
        ? uploadResult.size
        : fileSize !== null
          ? fileSize
          : null
    const resolvedContentType = uploadResult.contentType || fileMimeType || null

    let characterRecord: CharacterRow | null = null

    if (!isUpdate && characterName) {
      characterRecord = await insertCharacterRecord({
        id: characterId,
        userId,
        projectId: normalizedProjectId,
        name: characterName,
        editPrompt,
        imageUrl: resolvedImageUrl,
        imageKey: uploadResult.key,
        imageSize: resolvedImageSize,
      })
    } else if (isUpdate) {
      characterRecord = await updateCharacterRecord({
        id: characterId,
        userId,
        imageUrl: resolvedImageUrl ?? existingCharacter?.image_url ?? null,
        imageKey: uploadResult.key,
        imageSize: resolvedImageSize,
        editPrompt,
        name: characterName,
        projectId: normalizedProjectId,
      })
    }

    if (
      isUpdate &&
      existingCharacter?.image_key &&
      uploadResult.key &&
      existingCharacter.image_key !== uploadResult.key
    ) {
      deleteImageFromR2(existingCharacter.image_key).catch(error => {
        console.warn('[CharacterUpload] Failed to delete previous image from R2', {
          key: existingCharacter?.image_key,
          error,
        })
      })
    }

    return NextResponse.json({
      success: true,
      publicUrl: resolvedImageUrl,
      signedUrl: uploadResult.signedUrl ?? null,
      key: uploadResult.key,
      size: resolvedImageSize,
      contentType: resolvedContentType,
      type: 'character',
      character: normalizeCharacterRow(characterRecord),
    })
  } catch (error) {
    if (error instanceof D1ConfigurationError) {
      console.error('[CharacterUpload] Cloudflare D1 is not configured', error)
      return NextResponse.json(
        { error: 'Cloudflare D1 is not configured', success: false },
        { status: 500 },
      )
    }

    if (error instanceof D1QueryError) {
      console.error('[CharacterUpload] Failed to persist character data', error)
      return NextResponse.json(
        { error: 'Failed to persist character metadata', success: false },
        { status: 500 },
      )
    }

    console.error('[CharacterUpload] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false,
      },
      { status: 500 },
    )
  }
}

function sanitizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (lowered === 'true') return true
    if (lowered === 'false') return false
  }
  return Boolean(value)
}

async function fetchCharacterById(id: string, userId: string): Promise<CharacterRow | null> {
  return queryD1Single<CharacterRow>(
    `SELECT
        id,
        user_id,
        project_id,
        name,
        description,
        edit_prompt,
        image_url,
        image_key,
        image_size,
        created_at,
        updated_at
     FROM characters
     WHERE id = ?1
       AND user_id = ?2`,
    [id, userId],
  )
}

async function insertCharacterRecord(params: InsertCharacterParams): Promise<CharacterRow | null> {
  const now = new Date().toISOString()

  await queryD1(
    `INSERT INTO characters (
        id,
        user_id,
        project_id,
        name,
        edit_prompt,
        image_url,
        image_key,
        image_size,
        created_at,
        updated_at
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    [
      params.id,
      params.userId,
      params.projectId ?? null,
      params.name,
      params.editPrompt ?? null,
      params.imageUrl ?? null,
      params.imageKey ?? null,
      params.imageSize ?? null,
      now,
      now,
    ],
  )

  return fetchCharacterById(params.id, params.userId)
}

async function updateCharacterRecord(params: UpdateCharacterParams): Promise<CharacterRow | null> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let index = 1

  const setField = (column: string, value: unknown) => {
    setClauses.push(`${column} = ?${index}`)
    values.push(value)
    index += 1
  }

  if (params.imageUrl !== undefined) setField('image_url', params.imageUrl ?? null)
  if (params.imageKey !== undefined) setField('image_key', params.imageKey ?? null)
  if (params.imageSize !== undefined) setField('image_size', params.imageSize ?? null)
  if (params.editPrompt !== undefined) setField('edit_prompt', params.editPrompt ?? null)
  if (params.name !== undefined) setField('name', params.name ?? null)
  if (params.projectId !== undefined) setField('project_id', params.projectId ?? null)

  if (setClauses.length === 0) {
    return fetchCharacterById(params.id, params.userId)
  }

  setField('updated_at', new Date().toISOString())

  const idPlaceholder = `?${index}`
  values.push(params.id)
  index += 1

  const userPlaceholder = `?${index}`
  values.push(params.userId)

  const sql = `UPDATE characters SET ${setClauses.join(', ')} WHERE id = ${idPlaceholder} AND user_id = ${userPlaceholder}`
  await queryD1(sql, values)

  return fetchCharacterById(params.id, params.userId)
}

function normalizeCharacterRow(row: CharacterRow | null): CharacterRow | null {
  if (!row) return null

  return {
    ...row,
    image_size: coerceNumber(row.image_size),
  }
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
