import { NextResponse } from 'next/server'
import { getStoryboardRecord, getStoryboardStatus, trimFrames } from '@/lib/storyboardEngine'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const detail = url.searchParams.get('detail')
    if (detail === 'status') {
      const status = getStoryboardStatus(id)
      if (!status) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(status)
    }
    const sb = getStoryboardRecord(id)
    if (!sb) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Return only requested metadata fields for each frame to avoid leaking internal fields
  return NextResponse.json({ id: sb.id, projectId: sb.projectId, status: sb.status, title: sb.title || '', frames: trimFrames(sb.frames) })
  } catch (err: any) {
    console.error('get storyboard error', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
