import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadImageToR2, uploadCharacterImageToR2, deleteImageFromR2 } from '@/lib/r2'
import { queryD1, queryD1Single, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'
import { insertUploadedAsset } from '@/lib/db/customAssets'

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
    const uploadType = sanitizeOptionalString(formData.get('type'))?.toLowerCase()
    
    // Determine upload context
    const isModelUpload = uploadType === 'model'
    const isBackgroundUpload = uploadType === 'background'
    
    const targetId = (isModelUpload || isBackgroundUpload) ? (formData.get('assetId') as string) : frameId

    if (!file || (!projectId && !isModelUpload && !isBackgroundUpload) || !targetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert file to data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Special handling for 'model' and 'background' types
    if (isModelUpload || isBackgroundUpload) {
      try {
        // Use R2 upload helper for custom assets (models/backgrounds)
        // uploadCharacterImageToR2 creates a unique path structure by ID
        const assetResult = await uploadCharacterImageToR2(targetId!, dataUrl, projectId || 'shared')
        
        const assetUrl = assetResult.publicUrl || assetResult.signedUrl
        if (!assetUrl) throw new Error('Failed to get uploaded asset URL')
        
        const tableName = isModelUpload ? 'uploaded_models' : 'uploaded_backgrounds'
        const assetName = sanitizeOptionalString(formData.get('name')) || file.name.split('.')[0]
        const assetSubtitle = sanitizeOptionalString(formData.get('subtitle'))

        const savedAsset = await insertUploadedAsset(tableName, {
          id: targetId!,
          user_id: userId,
          project_id: projectId,
          name: assetName,
          subtitle: assetSubtitle,
          image_url: assetUrl,
          image_key: assetResult.key,
          image_size: typeof assetResult.size === 'number' ? assetResult.size : file.size,
          image_content_type: file.type
        })

        return NextResponse.json({
          success: true,
          data: savedAsset
        })
      } catch (error) {
        console.error(`Failed to upload ${uploadType}:`, error)
        return NextResponse.json({ 
          error: `Failed to upload ${uploadType}`, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 })
      }
    }

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
        type: 'uploaded'
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
