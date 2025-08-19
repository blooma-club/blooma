"use client"

import React, { useEffect, useState } from 'react'
import type { StoryboardFrame } from '@/types/storyboard'
import { useParams, useRouter } from 'next/navigation'

export default function StoryboardPage() {
  const params = useParams() as any
  const projectId = params.id
  const sbId = params.sbId
  const router = useRouter()

  const [frames, setFrames] = useState<StoryboardFrame[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [sbTitle, setSbTitle] = useState<string>('Storyboard')
  const sseRef = React.useRef<EventSource | null>(null)

  // Initial stream attach (frames arrive via 'init')
  useEffect(() => {
    if (!sbId) return
    setLoading(true)
    startStream()
    // loading will clear on first 'init'
  }, [sbId])

  // SSE stream for progressive updates
  const startStream = () => {
    if (!sbId) return
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    const connect = (attempt = 0) => {
      try {
        const es = new EventSource(`/api/storyboard/stream?id=${encodeURIComponent(sbId)}`)
        sseRef.current = es
        es.addEventListener('init', (e: any) => {
          try { const data = JSON.parse(e.data); setStatus({ status: data.status }); if (data.title) setSbTitle(data.title); setFrames(data.frames || []); setIndex(0); setLoading(false) } catch {}
        })
        es.addEventListener('frame', (e: any) => {
          try {
            const data = JSON.parse(e.data)
            if (data?.frame?.id) {
              setFrames(prev => {
                const idx = prev.findIndex(f=>f.id===data.frame.id)
                if (idx === -1) return [...prev, data.frame]
                const copy = [...prev]; copy[idx] = { ...prev[idx], ...data.frame }; return copy
              })
            }
          } catch {}
        })
        es.addEventListener('complete', (e: any) => {
          try { const data = JSON.parse(e.data); setStatus({ status: data.status }); if (data.title) setSbTitle(data.title); setFrames(data.frames || []) } catch {}
        })
        es.addEventListener('end', () => { if (sseRef.current) { sseRef.current.close(); sseRef.current = null } })
        es.onerror = () => {
          es.close()
          if (attempt < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
            setTimeout(() => connect(attempt + 1), delay)
          } else {
            setError('SSE 연결 실패. 잠시 후 다시 시도하세요.')
            setLoading(false)
          }
        }
      } catch (err) {
        if (attempt < 5) setTimeout(() => connect(attempt + 1), 1000 * (attempt + 1))
      }
    }
    connect()
  }
  React.useEffect(() => () => { if (sseRef.current) sseRef.current.close() }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex(i => Math.min(frames.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length])

  const frame = frames[index]
  async function handleRegenerate(){
    if (!frame) return
    // optimistic status update
    setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'enhancing', error: undefined } : f))
    await fetch('/api/storyboard/frame', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ storyboardId: sbId, frameId: frame.id }) })
    // SSE will push updated frame; no manual refetch
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">{sbTitle || 'Storyboard'}</h1>
            <div className="text-sm text-gray-500">Project {projectId} • {frames.length} frames {status ? `• ${status.readyCount}/${status.total} ready` : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/project/${projectId}/setup`)} className="text-sm text-gray-600">Back to Script</button>
            <div className="text-sm text-gray-600">{index + 1} / {frames.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : frame ? (
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-500">Scene {frame.scene} • Status {frame.status}</div>
                <h2 className="text-lg font-semibold mt-1">{frame.title || frame.shot || 'Shot'}</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="h-[420px] bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                    {frame.imageUrl ? <img src={frame.imageUrl} alt="" className="object-cover w-full h-full rounded-md"/> : <div className="text-gray-400">{frame.status!=='ready' ? 'Processing…' : 'No image'}</div>}
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{frame.imagePrompt || frame.shotDescription}</pre>
                </div>
                <aside className="bg-gray-50 p-4 rounded-md">
                  <div className="text-xs text-gray-500 mb-2">Shot details</div>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div><span className="font-medium">Description:</span> {frame.shotDescription}</div>
                    {frame.dialogue && <div><span className="font-medium">Dialogue:</span> {frame.dialogue}</div>}
                    {frame.sound && <div><span className="font-medium">Sound:</span> {frame.sound}</div>}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">Actions</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleRegenerate} className="px-3 py-1 rounded border text-sm">Regenerate</button>
                    <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Edit Prompt</button>
                  </div>
                  {frame.error && <div className="text-xs text-red-500 mt-2">{frame.error}</div>}
                </aside>
              </div>

              <div className="flex justify-between mt-6">
                <button disabled={index===0} onClick={() => setIndex(i => Math.max(0, i-1))} className="px-4 py-2 rounded border">Previous</button>
                <div className="flex gap-2">
                  <button onClick={() => {/* export logic */}} className="px-4 py-2 rounded border">Export</button>
                  <button disabled={index===frames.length-1} onClick={() => setIndex(i => Math.min(frames.length-1, i+1))} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No frames generated yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
