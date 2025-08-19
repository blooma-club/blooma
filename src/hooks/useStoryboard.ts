import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoryboardFrame, BuildStoryboardOptions, StoryboardBuildResponse } from '@/types/storyboard'

interface UseStoryboardOpts {
  onError?: (msg: string) => void
  onStatus?: (status: string) => void
}

export function useStoryboard(opts: UseStoryboardOpts = {}) {
  const [frames, setFrames] = useState<StoryboardFrame[]>([])
  const [storyboardId, setStoryboardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [completed, setCompleted] = useState(false)
  const sseRef = useRef<EventSource | null>(null)

  const closeStream = useCallback(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    setStreaming(false)
  }, [])

  const startStream = useCallback((id: string) => {
    closeStream()
    setStreaming(true)
    setCompleted(false)
    const attach = (attempt = 0) => {
      const es = new EventSource(`/api/storyboard/stream?id=${encodeURIComponent(id)}`)
      sseRef.current = es
      const parse = (raw: string) => { try { return JSON.parse(raw) } catch { return null } }
      es.addEventListener('init', (e) => {
        const data = parse((e as MessageEvent).data)
        if (Array.isArray(data?.frames)) setFrames(data.frames)
      })
      es.addEventListener('frame', (e) => {
        const data = parse((e as MessageEvent).data)
        const frame: StoryboardFrame | undefined = data?.frame
        if (frame?.id) {
          setFrames(prev => {
            const i = prev.findIndex(f => f.id === frame.id)
            if (i === -1) return [...prev, frame]
            const cp = [...prev]; cp[i] = { ...prev[i], ...frame }; return cp
          })
        }
      })
      es.addEventListener('complete', (e) => {
        const data = parse((e as MessageEvent).data)
        if (Array.isArray(data?.frames)) setFrames(data.frames)
      })
      es.addEventListener('end', () => { setCompleted(true); closeStream() })
      es.onerror = () => {
        es.close()
        if (attempt < 5) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
          setTimeout(() => attach(attempt + 1), delay)
        } else {
          opts.onError?.('SSE 연결 실패. 잠시 후 다시 시도하세요.')
          closeStream()
        }
      }
    }
    attach()
  }, [closeStream, opts])

  const build = useCallback(async (payload: BuildStoryboardOptions) => {
    setLoading(true)
    opts.onError?.('') // clear external error if consumer uses it
    try {
      const res = await fetch('/api/storyboard/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data: StoryboardBuildResponse = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to build storyboard')
      setStoryboardId(data.storyboardId)
      if (Array.isArray(data.frames)) setFrames(data.frames)
      startStream(data.storyboardId)
      return data.storyboardId
    } catch (e: any) {
      opts.onError?.(e.message || 'Storyboard build failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [opts, startStream])

  useEffect(() => () => closeStream(), [closeStream])

  return {
    frames,
    storyboardId,
    loading,
    streaming,
    completed,
    build,
    startStream,
    closeStream,
    setFrames
  }
}
