"use client"

import React, { useRef, useState } from 'react'
import type { StoryboardFrame, BuildStoryboardOptions, StoryboardBuildResponse } from '@/types/storyboard'
import { useParams } from 'next/navigation'

type SetupFormProps = {
  id?: string
  onSubmit?: (payload: { mode: 'write' | 'upload'; text?: string; file?: File | null }) => void
}

export default function SetupForm({ onSubmit }: SetupFormProps) {

  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [textValue, setTextValue] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [storyboardLoading, setStoryboardLoading] = useState(false)
  const [view, setView] = useState<'script' | 'storyboard'>('script')
  // Storyboard frames state
  const [frames, setFrames] = useState<StoryboardFrame[]>([])
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null)
  const [storyboardTitle, setStoryboardTitle] = useState<string>('Storyboard')
  const [genResult, setGenResult] = useState<string | null>(null)
  const [showGenModal, setShowGenModal] = useState(false)

  // Visual / layout settings (right panel)
  const [ratio, setRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16'>('16:9')
  const [visualStyle, setVisualStyle] = useState<string>('photo')
  // Removed advanced visual settings (lighting, tone, mood, camera, grid, guides) per simplification request

  const stylePresets: { id: string; label: string; img: string; desc: string }[] = [
  { id: 'photo', label: 'Photo realistic', img: '/styles/photo.jpg', desc: 'Photorealistic imagery' },
    { id: 'cinematic', label: 'Cinematic', img: '/styles/cinematic.jpg', desc: 'Film-like lighting & depth' },
    { id: 'watercolor', label: 'Watercolor', img: '/styles/watercolor.jpg', desc: 'Soft pigment wash' },
    { id: 'lineart', label: 'Line Art', img: '/styles/lineart.jpg', desc: 'Clean monochrome lines' },
    { id: 'pixel', label: 'Pixel', img: '/styles/pixel.jpg', desc: 'Retro low-res charm' },
  ]

  // Carousel & modal state (may have been removed earlier)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [gallerySearch, setGallerySearch] = useState('')

  const scrollByPage = (dir: number) => {
    const el = carouselRef.current
    if (!el) return
    const step = Math.max(160, Math.floor(el.clientWidth * 0.6))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const fileRef = useRef<HTMLInputElement | null>(null)

  const ACCEPTED = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  const MAX_MB = 10

  const resetAll = () => {
    setMode('paste')
    setTextValue('')
    setFile(null)
    setFileError(null)
    setSuccess(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const f = e.target.files?.[0] ?? null
    if (!f) { setFile(null); return }
    const name = f.name.toLowerCase()
    if (
      !ACCEPTED.includes(f.type) &&
      !name.endsWith('.txt') &&
      !name.endsWith('.md') &&
      !name.endsWith('.pdf') &&
      !name.endsWith('.docx')
    ) {
      setFileError('Unsupported file type. Please provide TXT, MD, PDF, or DOCX.')
      setFile(null)
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`File too large. Max ${MAX_MB}MB.`)
      setFile(null)
      return
    }
    setFile(f)
    if (
      f.type === 'text/plain' ||
      f.type === 'text/markdown' ||
      name.endsWith('.txt') ||
      name.endsWith('.md')
    ) {
      try {
        const txt = await f.text()
        setTextValue(txt)
      } catch {
        setFileError('Failed to read TXT or MD file.')
      }
    } else if (f.type === 'application/pdf' || name.endsWith('.pdf')) {
      setTextValue('PDF file uploaded. Preview not available.')
    } else if (
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      setTextValue('DOCX file uploaded. Preview not available.')
    } else {
      // Keep existing text value (user may have written something previously); don't overwrite
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0] ?? null
    if (f) {
      await handleFileChange({ target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>)
      setMode('upload')
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFileError(null)
  if (mode === 'upload' && !file) { setFileError('Please upload a file or switch to Write mode.'); return }
  if (mode === 'paste' && !textValue.trim()) { setFileError('Please enter text or switch to Upload mode.'); return }

    setSubmitting(true)
    try {
  const payload: { mode: 'write' | 'upload'; text?: string; file?: File | null } = { mode: mode === 'paste' ? 'write' : 'upload', text: textValue, file }
      onSubmit?.(payload)
  setSuccess('Saved successfully.')
      setTimeout(() => setSuccess(null), 4000)
    } catch {
      setFileError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateScript = async () => {
    // Use existing Script (textValue) as the brief for AI generation.
    setFileError(null)
  if (mode !== 'paste') { setFileError('Please switch to Write mode to use AI generation.'); return }
  if (!textValue.trim()) { setFileError('Please enter a script.'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: textValue })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (typeof data.script === 'string') {
        // show preview modal so user can accept/append
        setGenResult(data.script)
        setShowGenModal(true)
        setMode('paste')
      } else {
        setFileError('The generated script is empty.')
      }
    } catch (e: any) {
      setFileError(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const params = useParams()
  const projectIdFromParams = (params as any)?.id

  // SSE stream management (encapsulated for clarity)
  const sseRef = React.useRef<EventSource | null>(null)
  const startStoryboardStream = (id: string) => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    const attach = (attempt = 0) => {
      const es = new EventSource(`/api/storyboard/stream?id=${encodeURIComponent(id)}`)
      sseRef.current = es
      const parseJSON = (raw: string) => { try { return JSON.parse(raw) } catch { return null } }
      es.addEventListener('init', (e: MessageEvent) => {
  const data = parseJSON(e.data)
  if (data?.title) setStoryboardTitle(data.title)
  if (data?.frames) setFrames(data.frames as StoryboardFrame[])
      })
      es.addEventListener('frame', (e: MessageEvent) => {
        const data = parseJSON(e.data)
        const frame: StoryboardFrame | undefined = data?.frame
        if (frame?.id) {
          setFrames(prev => {
            const idx = prev.findIndex(f => f.id === frame.id)
            if (idx === -1) return [...prev, frame]
            const copy = [...prev]; copy[idx] = { ...prev[idx], ...frame }; return copy
          })
        }
      })
      es.addEventListener('complete', (e: MessageEvent) => {
        const data = parseJSON(e.data)
        if (Array.isArray(data?.frames)) setFrames(data.frames as StoryboardFrame[])
      })
      es.addEventListener('end', () => { es.close(); sseRef.current = null })
      es.onerror = () => {
        es.close()
        if (attempt < 5) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
          setTimeout(() => attach(attempt + 1), delay)
        } else {
          setFileError('SSE 연결 실패. 잠시 후 다시 시도하세요.')
        }
      }
    }
    attach()
  }
  React.useEffect(() => () => { if (sseRef.current) sseRef.current.close() }, [])

  const handleGenerateStoryboard = async () => {
    setFileError(null)
    if (!textValue.trim()) { setFileError('Please enter a script before generating storyboard.'); return }
    setStoryboardLoading(true)
    try {
    const payload: BuildStoryboardOptions = { projectId: projectIdFromParams, script: textValue, visualStyle, ratio, mode: 'async' }
      const res = await fetch('/api/storyboard/build', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
    let data: StoryboardBuildResponse | null = null
    try {
      data = await res.json()
    } catch (jsonErr) {
      const txt = await res.text().catch(() => '')
      console.error('Non-JSON response from /api/storyboard/build', res.status, txt)
      throw new Error(`Server returned ${res.status}: ${txt || 'Non-JSON response'}`)
    }
      if (!res.ok) throw new Error((data && (data as any).error) || 'Failed to build storyboard')
      if (!data) throw new Error('Invalid server response')
      const sbId = data.storyboardId
      if (sbId) {
        if (Array.isArray(data.frames)) setFrames(data.frames as StoryboardFrame[])
        if (data.title) setStoryboardTitle(data.title)
  startStoryboardStream(sbId)
        setView('storyboard')
      } else {
        setFileError('No storyboard ID returned.')
      }
    } catch (e: any) {
      setFileError(e.message || 'Storyboard generation failed')
    } finally {
      setStoryboardLoading(false)
    }
  }

  // Removed polling in favor of SSE
  // viewport width to tune grid behavior
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)
  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    if (typeof window !== 'undefined') window.addEventListener('resize', onResize)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('resize', onResize) }
  }, [])

  // Decide how many columns to show based on aspect ratio and viewport width
  const colsForRatio = (r: string) => {
    // wide monitor -> favor larger cards (fewer cols)
    const wide = viewportWidth >= 1600
    if (r === '1:1') return wide ? 4 : 3
    if (r === '9:16') return wide ? 2 : 1
    // default 16:9 and others
    return wide ? 3 : 2
  }

  const gridClassesForRatio = (r: string) => {
    const cols = colsForRatio(r)
    // produce responsive classes: base 1, sm 2, md 2, lg = cols
    return `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-${cols} gap-8 w-full px-4`
  }

  const imageStyleForRatio = (r: string) => {
    const parts = (r || '16:9').split(':').map(n => Number(n) || 1)
    return { aspectRatio: `${parts[0]}/${parts[1]}` }
  }
  // Pre-built views for clarity
  const scriptView = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left: Script form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-10 rounded-xl ring-1 ring-gray-200 shadow-sm flex flex-col lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Storyboard Script</h2>
          <div className="text-xs text-gray-500">Upload or write directly</div>
        </div>
        <div className="space-y-4">
          <div className="border-t pt-4 space-y-3">
            <div role="tablist" aria-label="Mode" className="inline-flex items-center rounded-md bg-gray-100 p-1 gap-1">
              <button type="button" role="tab" aria-selected={mode==='paste'} onClick={() => setMode('paste')} className={`px-4 py-2 text-sm focus:outline-none rounded-md ${mode==='paste' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Write</button>
              <button type="button" role="tab" aria-selected={mode==='upload'} onClick={() => setMode('upload')} className={`px-4 py-2 text-sm focus:outline-none rounded-md ${mode==='upload' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Upload</button>
            </div>
            {mode==='paste' && (
              <div>
                <label className="block text-sm font-medium mb-1">Script</label>
                <textarea value={textValue} onChange={e=>setTextValue(e.target.value)} placeholder="Write your storyboard script here..." className="w-full p-4 border border-gray-700 rounded-md min-h-[320px] text-sm focus:outline-none focus:ring-1 focus:ring-gray-700" />
                <div className="mt-1 text-[11px] text-gray-500 flex justify-between"><span>{textValue.length} chars</span><span>Shift+Enter for line break</span></div>
              </div>
            )}
            {mode==='upload' && (
              <div>
                <label className="block text-sm font-medium mb-1">Attach TXT, MD, PDF, or DOCX</label>
                <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={() => fileRef.current?.click()} className="border border-dashed border-gray-700 rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition w-full min-h-[320px] flex flex-col justify-center">
                  <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} className="hidden" />
                  {!file && <div className="text-sm text-gray-600">Drag & drop or <span className="underline">browse</span></div>}
                  {file && <div className="text-sm text-gray-800">{file.name} • {(file.size/1024).toFixed(1)} KB</div>}
                  <p className="mt-2 text-[11px] text-gray-500">TXT/MD preview • PDF/DOCX upload only</p>
                </div>
                {file && (file.type==='text/plain' || file.type==='text/markdown' || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">Preview</div>
                    <div className="p-3 border border-gray-700 rounded-md bg-white text-xs max-h-56 overflow-auto whitespace-pre-wrap">{textValue.slice(0,800) || 'Empty file'}</div>
                    {textValue.length>800 && <div className="text-[10px] text-gray-500 mt-1">(Truncated)</div>}
                  </div>
                )}
                {file && (file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && <div className="mt-3 text-xs text-gray-500">PDF uploaded. Preview not available.</div>}
                {file && (file.type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) && <div className="mt-3 text-xs text-gray-500">DOCX uploaded. Preview not available.</div>}
                {fileError && <div className="mt-2 text-sm text-red-600">{fileError}</div>}
              </div>
            )}
          </div>
          {mode==='paste' && <div className="text-[11px] text-gray-500">Your script will be used to generate the storyboard.</div>}
          {success && <div className="text-sm text-green-700">{success}</div>}
          {fileError && <div className="text-sm text-red-600">{fileError}</div>}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={handleGenerateScript} disabled={generating} className="px-5 py-2 rounded-md bg-black text-white min-w-[160px] disabled:opacity-60">{generating ? 'Generating...' : 'Generate Script'}</button>
        </div>
      </form>
      {/* Right: Visual settings */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-6 md:p-7 flex flex-col overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Visual Settings</h3>
          <div className="flex-1 pr-1 space-y-6 text-[13px]">
            <section>
              <div className="font-medium mb-2 flex items-center justify-between"><span>Aspect Ratio</span></div>
              <div className="flex flex-wrap gap-2">
                {(['16:9','4:3','1:1','9:16'] as const).map(r => (
                  <button key={r} type="button" aria-pressed={ratio===r} onClick={() => setRatio(r)} className={`px-3 py-1.5 rounded-md border text-xs font-medium transition ${ratio===r ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}>{r}</button>
                ))}
              </div>
            </section>
            <section>
              <div className="font-medium mb-2 flex items-center justify-between"><span>Visual Style</span></div>
              <button type="button" onClick={() => setShowGalleryModal(true)} className="group relative flex flex-col rounded-lg overflow-hidden border ring-2 ring-black border-black text-left focus:outline-none transition w-full" aria-label={`Current visual style ${stylePresets.find(s=>s.id===visualStyle)?.label} (selected)`}>
                <div className="aspect-[4/3] w-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                  <img src={stylePresets.find(s=>s.id===visualStyle)?.img} alt={stylePresets.find(s=>s.id===visualStyle)?.label} className="absolute inset-0 w-full h-full object-cover" />
                  <span className="relative z-10 bg-black/60 text-white px-1 rounded-sm">Selected</span>
                </div>
                <div className="px-2 py-1.5 text-xs font-medium flex items-center gap-1 bg-black text-white relative">{stylePresets.find(s=>s.id===visualStyle)?.label}</div>
              </button>
            </section>
          </div>
        </div>
        <button type="button" onClick={handleGenerateStoryboard} disabled={storyboardLoading || !textValue.trim()} className="w-full py-2.5 rounded-md bg-black text-white text-sm font-medium hover:bg-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed">{storyboardLoading ? 'Generating Storyboard…' : (frames.length ? 'Regenerate Storyboard' : 'Generate Storyboard')}</button>
      </div>
    </div>
  )

  const storyboardView = (
    <div>
      {frames.length === 0 && <div className="text-center text-sm text-gray-500 py-12">No frames. Generate a storyboard first.</div>}
      {frames.length > 0 && (
        <div className="flex justify-center">
          <div className={gridClassesForRatio(ratio)}>
            {frames.map((f, i) => (
              <div key={f.id || i} className="mx-auto w-full group" style={{ maxWidth: 420 }}>
                <div className="flex flex-col rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden h-full relative">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFrame({ ...f })
                    }}
                    className="absolute top-2 right-2 z-30 px-2 py-1 text-[11px] rounded-md bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >Edit</button>
                  <div className="relative w-full" style={imageStyleForRatio(ratio)}>
                    {/* Image or Loading Skeleton */}
                    {f.status === 'ready' && f.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.imageUrl}
                        alt={f.shotDescription || `Frame ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                      />
                    )}
                    {f.status !== 'ready' && f.status !== 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center select-none">
                        <div className="w-full h-full bg-[linear-gradient(110deg,#e5e7eb_8%,#f3f4f6_18%,#e5e7eb_33%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
                        <style jsx>{`
                          @keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
                        `}</style>
                        <div className="absolute bottom-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded bg-black/60 text-white capitalize tracking-wide">
                          {f.status}
                        </div>
                      </div>
                    )}
                    {f.status === 'error' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-red-500 text-[11px] bg-red-50">
                        <span>Image Error</span>
                        <span className="text-[10px] text-red-400">Retry Regenerate Later</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-sm px-1.5 py-0.5 text-white text-[10px] font-medium tracking-wide">
                      {i + 1}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-1">
                      <div className="text-[11px] font-medium text-gray-500 tracking-wide">Scene {f.scene}</div>
                      {(() => {
                        const titleText = (f.title || '').trim()
                        const firstLine = (f.shotDescription || '').split(/\r?\n/)[0].trim()
                        if (titleText && titleText.toLowerCase() !== firstLine.toLowerCase()) {
                          return <div className="text-xs font-semibold text-gray-800 line-clamp-1">{titleText}</div>
                        }
                        return null
                      })()}
                      <div className="text-[12px] text-gray-900 leading-5 break-words whitespace-pre-wrap">
                        {(f.shotDescription && f.shotDescription.trim()) ? f.shotDescription : '—'}
                      </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
  <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{view === 'script' ? 'Storyboard Script' : storyboardTitle || 'Storyboard'}</h1>
          {view === 'storyboard' && <span className="text-xs text-gray-500">{frames.length} frames</span>}
        </div>
        <nav className="flex gap-2">
          <button type="button" onClick={() => setView('script')} disabled={view==='script'} className="px-4 py-1.5 rounded-md border text-sm disabled:opacity-50">Previous</button>
          <button type="button" onClick={() => setView('storyboard')} disabled={view==='storyboard' || frames.length===0} className="px-4 py-1.5 rounded-md bg-black text-white text-sm disabled:opacity-50">Next</button>
        </nav>
      </header>
      {view === 'script' ? scriptView : storyboardView}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowGalleryModal(false)} />
          <div className="relative max-w-4xl w-full bg-white rounded-xl ring-1 ring-gray-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-medium">Select Visual Style</h4>
                <input value={gallerySearch} onChange={e=>setGallerySearch(e.target.value)} placeholder="Search styles" className="text-xs px-3 py-1 rounded-md border border-gray-200" />
              </div>
              <div className="flex items-center gap-2"><button className="text-xs text-gray-600 underline" onClick={() => setShowGalleryModal(false)}>Close</button></div>
            </div>
            <div className="p-4 grid grid-cols-4 gap-4 max-h-[60vh] overflow-auto text-xs">
              {stylePresets.filter(s=>s.label.toLowerCase().includes(gallerySearch.toLowerCase())).map(s => {
                const active = visualStyle === s.id
                return (
                  <button key={s.id} onClick={() => { setVisualStyle(s.id); setShowGalleryModal(false) }} className={`relative rounded-md overflow-hidden border focus:outline-none transition ${active ? 'ring-2 ring-black border-black' : 'border-gray-200 hover:border-gray-400'}`}>
                    <img src={s.img} alt={s.label} className="w-full h-24 object-cover" loading="lazy" />
                    <div className={`px-2 py-1 font-medium ${active ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>{s.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {editingFrame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingFrame(null)} />
          <div className="relative w-full max-w-5xl bg-white rounded-xl border border-gray-300 shadow-xl p-0 overflow-hidden">
            <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
              {/* Left large image */}
              <div className="md:w-1/2 w-full bg-black relative flex items-center justify-center">
                {editingFrame.imageUrl ? (
                  <img src={editingFrame.imageUrl} alt="frame" className="w-full h-full object-contain max-h-[85vh]" />
                ) : (
                  <div className="text-gray-500 text-xs">No image</div>
                )}
                <button type="button" onClick={() => setEditingFrame(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-md px-2 py-1 text-[11px]">Close</button>
                <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[11px] font-medium">
                  Scene {editingFrame.scene}
                </div>
              </div>
              {/* Right metadata panel */}
              <div className="md:w-1/2 w-full flex flex-col p-6 overflow-y-auto text-sm">
                <h3 className="text-sm font-semibold mb-4">Frame Metadata</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!editingFrame) return
                    setFrames(prev => prev.map(fr => fr.id === editingFrame.id ? { ...fr, ...editingFrame } : fr))
                    setEditingFrame(null)
                  }}
                  className="space-y-4"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Scene</label>
                    <input type="number" min={1} value={editingFrame.scene || 1} onChange={e=>setEditingFrame(p=>p?{...p,scene:Number(e.target.value)}:p)} className="px-2 py-1.5 rounded border text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Shot Description (원본)</label>
                    <textarea value={editingFrame.shotDescription || ''} onChange={e=>setEditingFrame(p=>p?{...p,shotDescription:e.target.value}:p)} rows={4} className="px-2 py-1.5 rounded border text-xs resize-y" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Image Prompt (인핸싱)</label>
                    <textarea value={editingFrame.imagePrompt || ''} onChange={e=>setEditingFrame(p=>p?{...p,imagePrompt:e.target.value}:p)} rows={4} className="px-2 py-1.5 rounded border text-xs resize-y font-mono" placeholder="Enhanced prompt for image generation" />
                    <p className="text-[10px] text-gray-500">Shot Description 과 분리된 이미지 생성용 프롬프트.</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Shot</label>
                    <input type="text" value={editingFrame.shot} onChange={e=>setEditingFrame(p=>p?{...p,shot:e.target.value}:p)} required className="px-2 py-1.5 rounded border text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Dialogue / VO</label>
                    <input type="text" value={editingFrame.dialogue} onChange={e=>setEditingFrame(p=>p?{...p,dialogue:e.target.value}:p)} required className="px-2 py-1.5 rounded border text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Sound</label>
                    <input type="text" value={editingFrame.sound} onChange={e=>setEditingFrame(p=>p?{...p,sound:e.target.value}:p)} required className="px-2 py-1.5 rounded border text-xs" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onClick={()=>setEditingFrame(null)} className="px-4 py-1.5 rounded border text-xs">Cancel</button>
                    <button type="submit" className="px-5 py-1.5 rounded bg-black text-white text-xs">Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showGenModal && genResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowGenModal(false)} />
          <div className="relative max-w-3xl w-full bg-white rounded-xl ring-1 ring-gray-200 shadow-xl overflow-hidden p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Generated Script Preview</h4>
              <button className="text-xs text-gray-600" onClick={() => setShowGenModal(false)}>Close</button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-3 border rounded-md bg-gray-50 text-sm whitespace-pre-wrap">{genResult}</div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-2 text-sm rounded-md border" onClick={() => { setTextValue(prev => (prev ? prev + '\n\n' + genResult : genResult)); setShowGenModal(false); setGenResult(null); }}>Append</button>
              <button className="px-4 py-2 text-sm rounded-md bg-black text-white" onClick={() => { setTextValue(genResult || ''); setShowGenModal(false); setGenResult(null); }}>Replace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}