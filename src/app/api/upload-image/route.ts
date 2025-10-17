import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToR2, uploadCharacterImageToR2, deleteImageFromR2 } from '../../../lib/r2'
import { getSupabaseClient, isSupabaseConfigured } from '../../../lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 })
    }

    const supabase = getSupabaseClient()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const storyboardIdValue = sanitizeOptionalString(formData.get('storyboardId'))
    const projectIdValue = sanitizeOptionalString(formData.get('projectId'))
    const projectId = projectIdValue || storyboardIdValue
    const frameId = sanitizeOptionalString(formData.get('frameId'))
    const characterId = sanitizeOptionalString(formData.get('characterId'))
    const userId = sanitizeOptionalString(formData.get('userId'))
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
          const { data: existingRows, error: existingError } = await supabase
            .from('characters')
            .select('image_key')
            .eq('id', characterId)
            .limit(1)

          if (!existingError && existingRows && existingRows.length > 0) {
            previousImageKey = existingRows[0]?.image_key ?? null
          } else if (existingError) {
            console.warn('[Upload] Failed to fetch existing character image key:', existingError)
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
          const updatePayload: Record<string, unknown> = {
            image_url: characterUrl,
            image_key: characterResult.key,
            image_size: resolvedCharacterSize,
            image_content_type: file.type || null,
            updated_at: new Date().toISOString(),
          }

          if (characterName !== undefined) updatePayload.name = characterName ?? null
          if (editPrompt !== undefined) updatePayload.edit_prompt = editPrompt ?? null
          if (projectId !== undefined) updatePayload.project_id = projectId ?? null

          const { data, error } = await supabase
            .from('characters')
            .update(updatePayload)
            .eq('id', characterId)
            .select()
            .single()

          if (error) {
            console.warn('[Upload] Failed to update character metadata in Supabase:', error)
          } else {
            characterRecord = data
          }
        } else if (userId && characterName) {
          const now = new Date().toISOString()
          const insertPayload = {
            id: characterId,
            user_id: userId,
            project_id: projectId ?? null,
            name: characterName,
            description: null,
            edit_prompt: editPrompt ?? null,
            image_url: characterUrl,
            image_key: characterResult.key,
            image_size: resolvedCharacterSize,
            image_content_type: file.type || null,
            created_at: now,
            updated_at: now,
          }

          const { data, error } = await supabase
            .from('characters')
            .insert(insertPayload)
            .select()
            .single()

          if (error) {
            console.warn('[Upload] Failed to insert character metadata in Supabase:', error)
          } else {
            characterRecord = data
          }
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
      const { data: existingCard } = await supabase
        .from('cards')
        .select('image_key')
        .eq('id', frameId)
        .single()
      
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
