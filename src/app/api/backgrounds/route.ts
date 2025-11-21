import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listUploadedAssets, deleteUploadedAsset } from '@/lib/db/customAssets'
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
    const assets = await listUploadedAssets('uploaded_backgrounds', userId, projectId)
    return NextResponse.json({ success: true, data: assets })
  } catch (error) {
    console.error('Failed to list backgrounds:', error)
    return NextResponse.json({ error: 'Failed to list backgrounds' }, { status: 500 })
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

    const imageKey = await deleteUploadedAsset('uploaded_backgrounds', id, userId)
    
    if (imageKey) {
      await deleteImageFromR2(imageKey).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete background:', error)
    return NextResponse.json({ error: 'Failed to delete background' }, { status: 500 })
  }
}

