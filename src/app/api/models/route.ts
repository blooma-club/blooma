
import { NextRequest, NextResponse } from 'next/server'
import { listUploadedAssets, deleteUploadedAsset, insertUploadedAsset } from '@/lib/db/customAssets'
import { deleteImageFromR2 } from '@/lib/r2'
import { getSupabaseUserAndSync } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const sessionUser = await getSupabaseUserAndSync()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId') || undefined

  try {
    const assets = await listUploadedAssets('uploaded_models', sessionUser.id, projectId)
    return NextResponse.json({ success: true, data: assets })
  } catch (error) {
    console.error('Failed to list models:', error)
    return NextResponse.json({ error: 'Failed to list models' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSupabaseUserAndSync()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, imageUrl, subtitle, projectId, id } = body

    if (!name || !imageUrl) {
      return NextResponse.json({ error: 'Name and imageUrl are required' }, { status: 400 })
    }

    const newModel = await insertUploadedAsset('uploaded_models', {
      id: id || `model-${Date.now()}`,
      user_id: sessionUser.id,
      project_id: projectId,
      name,
      subtitle,
      image_url: imageUrl,
      // Optional fields that might come from the upload response or client
      // For now we assume the client provides the URL and we might not have the key/size readily available
      // unless passed. If missing, they will be null.
    })

    return NextResponse.json({ success: true, data: newModel })

  } catch (error) {
    console.error('Failed to create model:', error)
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await getSupabaseUserAndSync()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const imageKey = await deleteUploadedAsset('uploaded_models', id, sessionUser.id)

    if (imageKey) {
      await deleteImageFromR2(imageKey).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete model:', error)
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 })
  }
}

