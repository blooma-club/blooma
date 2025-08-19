import { NextResponse } from 'next/server'
import { regenerateFrame } from '@/lib/storyboardEngine'

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const storyboardId = body.storyboardId
    const frameId = body.frameId
    if (!storyboardId || !frameId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 })
    const frame = await regenerateFrame(storyboardId, frameId)
    return NextResponse.json({ frame })
  } catch (err:any) {
    console.error('regenerate frame error', err)
    return NextResponse.json({ error: 'Regenerate failed' }, { status: 500 })
  }
}
