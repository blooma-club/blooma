
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listUploadedAssets, deleteUploadedAsset, insertUploadedAsset } from '@/lib/db/customAssets'
import { deleteImageFromR2 } from '@/lib/r2'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId') || undefined

  try {
    const assets = await listUploadedAssets('uploaded_locations', userId, projectId)
    return NextResponse.json({ success: true, data: assets })
  } catch (error) {
    console.error('Failed to list locations:', error)
    return NextResponse.json({ error: 'Failed to list locations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, imageUrl, subtitle, projectId, id } = body

    if (!name || !imageUrl) {
      return NextResponse.json({ error: 'Name and imageUrl are required' }, { status: 400 })
    }

    const newLocation = await insertUploadedAsset('uploaded_locations', {
      id: id || `location-${Date.now()}`,
      user_id: userId,
      project_id: projectId,
      name,
      subtitle,
      image_url: imageUrl,
    })

    return NextResponse.json({ success: true, data: newLocation })

  } catch (error) {
    console.error('Failed to create location:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const imageKey = await deleteUploadedAsset('uploaded_locations', id, userId)

    if (imageKey) {
      await deleteImageFromR2(imageKey).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete location:', error)
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }
}
