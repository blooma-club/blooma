import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadImageToR2, uploadCharacterImageToR2, deleteImageFromR2 } from '@/lib/r2'
import { queryD1, queryD1Single, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const storyboardIdValue = sanitizeOptionalString(formData.get('storyboardId'))
    const projectIdValue = sanitizeOptionalString(formData.get('projectId'))
    const projectId = projectIdValue || storyboardIdValue
    const frameId = sanitizeOptionalString(formData.get('frameId'))
    const characterId = sanitizeOptionalString(formData.get('characterId'))
    const characterName = sanitizeOptionalString(formData.get('characterName'))
    const editPrompt = sanitizeOptionalString(formData.get('editPrompt'))
    const isUpdate = parseBoolean(formData.get('isUpdate'))
    const uploadType = sanitizeOptionalString(formData.get('type'))?.toLowerCase()
    const isCharacterUpload = uploadType === 'character' || !!characterId

    const targetId = isCharacterUpload ? characterId : frameId

    if (!file || !projectId || !targetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert file to data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // If this is an "empty" / unsaved storyboard (local working area),
    // do NOT persist the uploaded image to R2. Return the data URL so the
    // frontend can use the image without creating a permanent object.
    if (!projectId || projectId === 'default' || projectId === 'empty') {
      return NextResponse.json({
        success: true,
        publicUrl: dataUrl,
        signedUrl: null,
        key: '',
        size: file.size,
        type: isCharacterUpload ? 'character' : 'uploaded'
      })
    }

    if (isCharacterUpload && characterId) {
      let previousImageKey: string | null = null
      if (isUpdate) {
        try {
          const existingCharacter = await queryD1Single<{ image_key?: string | null }>(
            `SELECT image_key FROM characters WHERE id = ?1 AND user_id = ?2 LIMIT 1`,
            [characterId, userId]
          )

          if (existingCharacter) {
            previousImageKey = existingCharacter.image_key ?? null
          }
        } catch (error) {
          console.warn('[Upload] Unexpected error reading character image metadata:', error)
        }
      }

      const characterResult = await uploadCharacterImageToR2(characterId, dataUrl, projectId)
      const characterUrl = characterResult.publicUrl || characterResult.signedUrl || null
      const resolvedCharacterSize =
        typeof characterResult.size === 'number' ? characterResult.size : file.size || null

      let characterRecord: Record<string, unknown> | null = null
      try {
        if (isUpdate) {
          const updateSql = `
            UPDATE characters 
            SET image_url = ?, image_key = ?, image_size = ?, image_content_type = ?, 
                name = COALESCE(?, name), edit_prompt = COALESCE(?, edit_prompt), 
                project_id = COALESCE(?, project_id), updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
          `
          
          await queryD1(updateSql, [
            characterUrl,
            characterResult.key,
            resolvedCharacterSize,
            file.type || null,
            characterName ?? null,
            editPrompt ?? null,
            projectId ?? null,
            characterId,
            userId
          ])

          // Fetch updated character
          const updatedCharacter = await queryD1Single<Record<string, unknown>>(
            `SELECT * FROM characters WHERE id = ?1 AND user_id = ?2`,
            [characterId, userId]
          )
          characterRecord = updatedCharacter
        } else if (characterName) {
          const now = new Date().toISOString()
          const insertSql = `
            INSERT INTO characters (
              id, user_id, project_id, name, description, edit_prompt,
              image_url, image_key, image_size, image_content_type, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          
          await queryD1(insertSql, [
            characterId,
            userId,
            projectId ?? null,
            characterName,
            null,
            editPrompt ?? null,
            characterUrl,
            characterResult.key,
            resolvedCharacterSize,
            file.type || null,
            now,
            now
          ])

          // Fetch inserted character
          const insertedCharacter = await queryD1Single<Record<string, unknown>>(
            `SELECT * FROM characters WHERE id = ?1 AND user_id = ?2`,
            [characterId, userId]
          )
          characterRecord = insertedCharacter
        }
      } catch (error) {
        console.warn('[Upload] Character metadata persistence error:', error)
      }

      if (isUpdate && previousImageKey && previousImageKey !== characterResult.key) {
        deleteImageFromR2(previousImageKey).catch(error => {
          console.warn('[Upload] Failed to delete previous character image from R2:', error)
        })
      }

      return NextResponse.json({
        success: true,
        publicUrl: characterUrl,
        signedUrl: characterResult.signedUrl || null,
        key: characterResult.key,
        size: resolvedCharacterSize,
        contentType: file.type || null,
        type: 'character',
        character: characterRecord,
      })
    }

    // 기존 이미지가 있다면 삭제
    try {
      const existingCard = await queryD1Single<{ image_key?: string | null }>(
        `SELECT image_key FROM cards WHERE id = ?1 AND user_id = ?2`,
        [frameId, userId]
      )
      
      if (existingCard?.image_key) {
        await deleteImageFromR2(existingCard.image_key)
      }
    } catch (error) {
      // 기존 이미지 삭제 실패는 무시하고 계속 진행
      console.warn('Failed to delete existing image:', error)
    }

    const result = await uploadImageToR2(projectId, frameId!, dataUrl)

    console.log('[Upload] R2 result:', {
      publicUrl: result.publicUrl,
      signedUrl: result.signedUrl,
      key: result.key,
      bucket: process.env.R2_BUCKET_NAME,
      baseUrl: process.env.R2_PUBLIC_BASE_URL
    })

    return NextResponse.json({
      success: true,
      publicUrl: result.publicUrl || result.signedUrl,
      signedUrl: result.signedUrl || null,
      key: result.key,
      size: file.size,
      type: 'uploaded'
    })

  } catch (error) {
    if (error instanceof D1ConfigurationError) {
      console.error('[upload-image] D1 not configured', error)
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (error instanceof D1QueryError) {
      console.error('[upload-image] D1 query failed', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    console.error('Upload error:', error)
    return NextResponse.json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function sanitizeOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return Boolean(value)
}