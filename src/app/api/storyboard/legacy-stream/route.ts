import { NextRequest } from 'next/server'
import { createStoryboard, getStoryboardRecord, trimFrame } from '@/lib/storyboardEngine'

// Experimental legacy-style single endpoint that both builds and streams frames sequentially (no separate build step)
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const script = req.nextUrl.searchParams.get('script') || ''
  const style = req.nextUrl.searchParams.get('style') || 'photo'
  const ratio = req.nextUrl.searchParams.get('ratio') || '16:9'
  if (!script.trim()) return new Response('Missing script', { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      const done = () => { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close() }
      ;(async () => {
        try {
          const sb = await createStoryboard({ rawScript: script, aspectRatio: ratio, style, processMode: 'async' })
          // Immediately send skeleton frames (pending)
          send({ storyboardId: sb.id, init: true, frames: sb.frames.map(trimFrame) })
          // Poll in-memory record until complete; since internal engine already sequentially regenerates frames,
          // we emit each frame change naïvely by simple interval scan (legacy semantics). Real-time updates should use /stream.
          const interval = setInterval(() => {
            const latest = getStoryboardRecord(sb.id)
            if (!latest) return
            latest.frames.forEach(f => {
              if (['ready','error'].includes(f.status)) {
                send({ frame: trimFrame(f) })
              }
            })
            if (['ready','partial','error'].includes(latest.status)) {
              clearInterval(interval)
              send({ complete: true, status: latest.status, frames: latest.frames.map(trimFrame) })
              done()
            }
          }, 500)
        } catch (e: any) {
          send({ error: e?.message || 'Failed to build storyboard' })
          done()
        }
      })()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
}
