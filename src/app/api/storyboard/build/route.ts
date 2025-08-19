import { NextResponse } from 'next/server'
import { createStoryboard, trimFrames } from '@/lib/storyboardEngine'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const projectId = body.projectId
    const script = body.script || ''
  const style = body.visualStyle
  const ratio = body.ratio
  const mode = body.mode === 'async' ? 'async' : 'sync'
    if (!script.trim()) return NextResponse.json({ error: 'Missing script' }, { status: 400 })
  const aspect = ratio || '16:9'
  const chosenStyle = style || 'Photorealistic'
  const sb = await createStoryboard({ projectId, rawScript: script, aspectRatio: aspect, style: chosenStyle, processMode: mode })
  // For sync mode, return full frames. For async mode return initial shell frames (no waiting for generation)
  return NextResponse.json({ storyboardId: sb.id, mode, framesCount: sb.frames.length, title: sb.title || '', frames: trimFrames(sb.frames) })
  } catch (err: any) {
    console.error('build storyboard error', err)
    return NextResponse.json({ error: 'Build failed' }, { status: 500 })
  }
}
