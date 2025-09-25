import { NextRequest } from 'next/server'
import { getStoryboardRecord, getStoryboardEmitter } from '@/lib/storyboardEngine'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return new Response('Missing id', { status: 400 })
  }
  
  console.log(`[SSE] Starting stream for storyboard: ${id}`)
  
  const sb = getStoryboardRecord(id)
  if (!sb) {
    // Fallback: serve a one-shot snapshot from DB so clients don't see 404
    console.log(`[SSE] Storyboard not found in memory: ${id}. Attempting DB snapshot fallback.`)
    try {
      const { data: cardsData, error } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', id)
        .order('order_index', { ascending: true })
        
      if (error || !cardsData || cardsData.length === 0) {
        console.log(`[SSE] Cards snapshot not available for: ${id}`)
        return new Response('Not found', { status: 404 })
      }

      // Derive title from first card
      let title = cardsData[0]?.title ? `Storyboard: ${cardsData[0].title.replace(/^Scene \d+:?\s*/, '')}` : 'Storyboard'
      
      // Convert cards to frames format
      let frames: Array<{
        id: string;
        scene?: number;
        shotDescription?: string;
        shot?: string;
        dialogue?: string;
        sound?: string;
        imagePrompt?: string;
        status?: string;
        error?: string;
        imageUrl?: string;
      }> = cardsData.map((card, index) => ({
        id: card.id,
        scene: card.scene_number || index + 1,
        shotDescription: card.shot_description || card.content || '',
        shot: card.shot_type || '',
        dialogue: card.dialogue || '',
        sound: card.sound || '',
        imagePrompt: card.image_prompt || '',
        status: card.storyboard_status || 'ready',
        imageUrl: card.image_url || (card.image_urls && card.image_urls[0]) || undefined
      }))

      const toClientFrame = (f: {
        id: string;
        scene?: number;
        shotDescription?: string;
        shot?: string;
        dialogue?: string;
        sound?: string;
        imagePrompt?: string;
        status?: string;
        error?: string;
        imageUrl?: string;
      }) => ({
        id: f.id,
        imageUrl: f.imageUrl,
        scene: f.scene,
        shotDescription: f.shotDescription || '',
        shot: f.shot || '',
        dialogue: f.dialogue || '',
        sound: f.sound || '',
        imagePrompt: f.imagePrompt || '',
        status: f.status || 'ready'
      })

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const send = (event: string, payload: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          }
          const clientFrames = frames.map(toClientFrame)
          // Send immediate final snapshot and close
          send('init', { storyboardId: id, status: 'ready', title, frames: clientFrames })
          send('complete', { storyboardId: id, status: 'ready', title, frames: clientFrames })
          send('end', { storyboardId: id })
          controller.close()
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
    } catch (e) {
      console.log(`[SSE] Fallback snapshot failed for: ${id}`, e)
      return new Response('Not found', { status: 404 })
    }
  }
  
  const encoder = new TextEncoder()
  let streamClosed = false
  
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Stream started for: ${id}`)
      
      const send = (event: string, payload: unknown) => {
        if (streamClosed) {
          console.log(`[SSE] Attempted to send to closed stream: ${id}`)
          return
        }
        
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch (error) {
          console.error(`[SSE] Send failed for ${id}:`, error)
          streamClosed = true
        }
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
          shotDescription: f.baseDescription || '',
          shot: f.shotType || '',
          dialogue: f.dialogue || '',
          sound: f.sound || '',
          imagePrompt: f.imagePrompt || '',
          status: f.status
        }))
      })
      
      const emitter = getStoryboardEmitter(id)
      const onUpdate = (p: { storyboardId: string; status: string; frame: unknown }) => send('frame', p)
      const onComplete = (p: { storyboardId: string; status: string; frames: unknown[]; title?: string }) => send('complete', { ...p, title: sb.title || '' })
      
      emitter.on('update', onUpdate)
      emitter.on('complete', onComplete)
      
      let heartbeatInterval: NodeJS.Timeout | null = null
      
      // 안전한 heartbeat 시작 (30초마다)
      heartbeatInterval = setInterval(() => {
        if (streamClosed) return
        
        try {
          controller.enqueue(encoder.encode('data: {}\n\n'))
        } catch (error) {
          console.error(`[SSE] Heartbeat failed for ${id}:`, error)
          streamClosed = true
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
        }
      }, 30000)
      
      const cleanup = () => {
        console.log(`[SSE] Cleaning up stream: ${id}`)
        streamClosed = true
        
        try {
          emitter.off('update', onUpdate)
          emitter.off('complete', onComplete)
        } catch (error) {
          console.error(`[SSE] Error removing listeners for ${id}:`, error)
        }
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
      }
      
      // Auto cleanup after completion event
      emitter.once('complete', () => {
        console.log(`[SSE] Storyboard completed: ${id}`)
        send('end', { storyboardId: id })
        cleanup()
        try {
          if (!streamClosed) {
            controller.close()
          }
        } catch (error) {
          console.error(`[SSE] Failed to close controller for ${id}:`, error)
        }
      })
      
      // 클라이언트 연결 해제 시 정리
      const abortHandler = () => {
        console.log(`[SSE] Client aborted connection: ${id}`)
        cleanup()
        try {
          if (!streamClosed) {
            controller.close()
          }
        } catch (error) {
          console.error(`[SSE] Failed to close controller on abort for ${id}:`, error)
        }
      }
      
      req.signal.addEventListener('abort', abortHandler)
    },
    cancel() {
      // reader closed by client
      console.log(`[SSE] Stream cancelled by client: ${id}`)
      streamClosed = true
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
