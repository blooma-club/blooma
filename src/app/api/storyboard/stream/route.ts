import { NextRequest } from 'next/server'
import { getStoryboardRecord, getStoryboardEmitter } from '@/lib/storyboardEngine'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return new Response('Missing id', { status: 400 })
  }
  const sb = getStoryboardRecord(id)
  if (!sb) {
    // Allow client to retry; 404 indicates storyboard not yet in this instance
    return new Response('Not found', { status: 404 })
  }
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, payload: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }
      // Initial snapshot
      send('init', {
        storyboardId: sb.id,
        status: sb.status,
  title: sb.title || '',
        frames: sb.frames.map(f => ({
          id: f.id,
          imageUrl: f.imageUrl,
          scene: (f.sceneOrder ?? 0) + 1,
          title: f.title || '',
          shotDescription: f.baseDescription || '',
          shot: f.shotType || '',
          dialogue: f.dialogue || '',
          sound: f.sound || '',
          imagePrompt: f.imagePrompt || '',
          status: f.status
        }))
      })
      const emitter = getStoryboardEmitter(id)
      const onUpdate = (p: any) => send('frame', p)
  const onComplete = (p: any) => send('complete', { ...p, title: sb.title || '' })
      emitter.on('update', onUpdate)
      emitter.on('complete', onComplete)
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(':heartbeat\n')), 15000)
      const cleanup = () => {
        emitter.off('update', onUpdate)
        emitter.off('complete', onComplete)
        clearInterval(heartbeat)
      }
      // Auto cleanup after completion event
      emitter.once('complete', () => {
        send('end', { storyboardId: id })
        cleanup()
        controller.close()
      })
    },
    cancel() {
      // reader closed by client
    }
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
