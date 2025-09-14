"use client"

import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { BuildStoryboardOptions, StoryboardBuildResponse } from '@/types/storyboard'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { getImageGenerationModels, getModelInfo, type FalAIModel } from '@/lib/fal-ai'
import { saveDraftToLocal, loadDraftFromLocal, clearDraftFromLocal } from '@/lib/localStorage'
import Image from 'next/image'
import { useSupabase } from '@/components/providers/SupabaseProvider'

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

type SetupFormProps = {
  id?: string
  onSubmit?: (payload: { mode: 'write' | 'upload'; text?: string; file?: File | null }) => void
}

export default function SetupForm({ onSubmit }: SetupFormProps) {
  const params = useParams() as { id: string }
  const projectId = params.id
  const router = useRouter()
  const { session } = useSupabase()

  const [isInitialized, setIsInitialized] = useState(false)
  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [textValue, setTextValue] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [storyboardLoading, setStoryboardLoading] = useState(false)
  // Storyboard UI migrated to storyboard/[sbId] page; keep only script-related state here.
  const [genResult, setGenResult] = useState<string | null>(null)
  const [showGenModal, setShowGenModal] = useState(false)

  // Visual / layout settings (right panel)
  const [ratio, setRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9')
  const [visualStyle, setVisualStyle] = useState<string>('photo')
  // AI Model selection - default to Flux 1 Schnell
  const [selectedModel, setSelectedModel] = useState<string>('fal-ai/flux-1/schnell')

  // Auto-save status (최소 표시만 유지)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null)

  // Auto-save function with debouncing (과도 저장 방지: 2.5s, 의미 있는 변경시에만)
  const lastDraftSignature = useRef<string>('')
  const autoSave = useCallback(
    debounce(() => {
      if (!projectId) return
      if (generating || storyboardLoading) return
      const signature = `${textValue.trim()}|${visualStyle}|${ratio}|${selectedModel}`
      if (lastDraftSignature.current === signature) return
      lastDraftSignature.current = signature
      setAutoSaveStatus('saving')
      try {
        saveDraftToLocal(projectId, {
          script: textValue,
          visualStyle,
          ratio,
          selectedModel
        })
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus(null), 1500)
      } catch (error) {
        setAutoSaveStatus('error')
        setTimeout(() => setAutoSaveStatus(null), 2500)
      }
    }, 2500),
    [projectId, textValue, visualStyle, ratio, selectedModel, generating, storyboardLoading]
  )

  // Load saved draft on component mount
  useEffect(() => {
    if (!projectId) return
    
    const savedDraft = loadDraftFromLocal(projectId)
    if (savedDraft) {
      setTextValue(savedDraft.script || '')
      setVisualStyle(savedDraft.visualStyle || 'photo')
      setRatio(savedDraft.ratio as '16:9' | '1:1' | '9:16' || '16:9')
      setSelectedModel(savedDraft.selectedModel || 'fal-ai/flux-1/schnell')
      console.log('Draft restored from localStorage:', savedDraft)
      // 현재 로드된 드래프트를 기준선으로 설정하여 불필요한 재저장 방지
      const sig = `${(savedDraft.script || '').trim()}|${savedDraft.visualStyle || 'photo'}|${savedDraft.ratio || '16:9'}|${savedDraft.selectedModel || 'fal-ai/flux-1/schnell'}`
      lastDraftSignature.current = sig
    }
    
    // 초기화 완료 표시
    setTimeout(() => {
      setIsInitialized(true)
    }, 300)
  }, [projectId])

  // Auto-save when form data changes (텍스트가 실제로 바뀐 경우에만)
  useEffect(() => {
    if (!textValue.trim() && visualStyle === 'photo' && ratio === '16:9' && selectedModel === 'fal-ai/flux-1/schnell') return
    autoSave()
  }, [textValue, visualStyle, ratio, selectedModel, autoSave])

  // 페이지 이탈 경고: 드래프트가 저장되지 않은 경우에만 표시
  useEffect(() => {
    const signature = `${textValue.trim()}|${visualStyle}|${ratio}|${selectedModel}`
    const baseline = `|photo|16:9|fal-ai/flux-1/schnell`
    const dirty = signature !== lastDraftSignature.current && signature !== baseline
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [textValue, visualStyle, ratio, selectedModel])

  // Clear saved draft when storyboard generation is successful
  const clearSavedDraft = useCallback(() => {
    if (projectId) {
      clearDraftFromLocal(projectId)
      setAutoSaveStatus(null)
    }
  }, [projectId])

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
    // if (!session?.access_token) { setFileError('Please log in to generate scripts.'); return }
    
    setGenerating(true)
    try {
      // 먼저 크레딧 체크 (임시 비활성화)
      /*
      const creditResponse = await fetch('/api/credits?action=balance', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (creditResponse.ok) {
        const creditData = await creditResponse.json()
        const requiredCredits = creditData.data?.tier === 'pro' ? 4 : 
                               creditData.data?.tier === 'enterprise' ? 3 : 5
        
        if (creditData.data?.credits < requiredCredits) {
          setFileError(`Insufficient credits. Required: ${requiredCredits}, Available: ${creditData.data?.credits || 0}`)
          return
        }
      }
      */
      
      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // 'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ brief: textValue })
      })
      const data = await res.json()
      
      if (!res.ok) {
        if (res.status === 402) {
          setFileError(`Insufficient credits: ${data.error}`)
        } else {
          throw new Error(data.error || 'Failed')
        }
        return
      }
      
      if (typeof data.script === 'string') {
        // show preview modal so user can accept/append
        setGenResult(data.script)
        setShowGenModal(true)
        setMode('paste')
        
        // 성공 메시지 표시
        if (data.meta?.credits_used) {
          console.log(`Script generated successfully. Credits used: ${data.meta.credits_used}, Remaining: ${data.meta.credits_remaining}`)
        }
      } else {
        setFileError('The generated script is empty.')
      }
    } catch (e: any) {
      setFileError(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateStoryboard = async () => {
    setFileError(null)
    if (!textValue.trim()) { setFileError('Please enter a script before generating storyboard.'); return }
    setStoryboardLoading(true)
    try {
    const payload: BuildStoryboardOptions = { 
      projectId: projectId, 
      script: textValue, 
      visualStyle, 
      ratio, 
      mode: 'async',
      // AI Model settings
      aiModel: selectedModel
    }
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
      const newSbId = data.storyboardId
      if (newSbId) {
        // Clear the draft since we've successfully generated a storyboard
        clearSavedDraft()
        
        // Replace current location with storyboard page (same position, different content)
        router.replace(`/project/${projectId}/storyboard/${encodeURIComponent(newSbId)}`)
      } else throw new Error('No storyboard ID returned.')
    } catch (e: any) {
      setFileError(e.message || 'Storyboard generation failed')
    } finally {
      setStoryboardLoading(false)
    }
  }

  // Removed polling in favor of SSE
  // Removed storyboard grid logic; handled on storyboard page.
  // Pre-built views for clarity
  const scriptView = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left: Script form */}
  <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900 p-10 rounded-xl border border-neutral-800 flex flex-col lg:col-span-2 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Storyboard Script</h2>
          <div role="tablist" aria-label="Mode" className="inline-flex items-center rounded-md bg-neutral-800 p-1 gap-1">
            <button type="button" role="tab" aria-selected={mode==='paste'} onClick={() => setMode('paste')} className={`px-4 py-2 text-sm focus:outline-none rounded-md ${mode==='paste' ? 'bg-white text-black shadow-sm' : 'text-neutral-300 hover:bg-neutral-700'}`}>Write</button>
            <button type="button" role="tab" aria-selected={mode==='upload'} onClick={() => setMode('upload')} className={`px-4 py-2 text-sm focus:outline-none rounded-md ${mode==='upload' ? 'bg-white text-black shadow-sm' : 'text-neutral-300 hover:bg-neutral-700'}`}>Upload</button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border-t pt-4 space-y-3">
            {mode==='paste' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Script</label>
                <textarea value={textValue} onChange={e=>setTextValue(e.target.value)} placeholder="Write your storyboard script here..." className="w-full p-4 border border-neutral-700 rounded-md min-h-[320px] text-sm focus:outline-none focus:ring-1 focus:ring-neutral-700 bg-neutral-900 text-white placeholder-neutral-400" />
                <div className="mt-1 text-[11px] text-neutral-400 flex justify-between">
                  <span>{textValue.length} chars</span>
                  {autoSaveStatus && (
                    <span className={`flex items-center gap-1 ${
                      autoSaveStatus === 'saved' ? 'text-green-400' : 
                      autoSaveStatus === 'saving' ? 'text-blue-400' : 
                      'text-red-400'
                    }`}>
                      {autoSaveStatus === 'saved' && '✓ Saved'}
                      {autoSaveStatus === 'saving' && '💾 Saving...'}
                      {autoSaveStatus === 'error' && '⚠ Save failed'}
                    </span>
                  )}
                </div>
              </div>
            )}
            {mode==='upload' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Attach TXT, MD, PDF, or DOCX</label>
                <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={() => fileRef.current?.click()} className="border border-dashed border-neutral-700 rounded-md p-6 text-center cursor-pointer hover:bg-neutral-700 transition w-full min-h-[320px] flex flex-col justify-center bg-neutral-900">
                  <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} className="hidden" />
                  {!file && <div className="text-sm text-neutral-300">Drag & drop or <span className="underline">browse</span></div>}
                  {file && <div className="text-sm text-neutral-200">{file.name} • {(file.size/1024).toFixed(1)} KB</div>}
                  <p className="mt-2 text-[11px] text-neutral-400">TXT/MD preview • PDF/DOCX upload only</p>
                </div>
                                  {file && (file.type==='text/plain' || file.type==='text/markdown' || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-neutral-300 mb-1">Preview</div>
                      <div className="p-3 border border-neutral-700 rounded-md bg-neutral-900 text-xs max-h-56 overflow-auto whitespace-pre-wrap text-white">{textValue.slice(0,800) || 'Empty file'}</div>
                      {textValue.length>800 && <div className="text-[10px] text-neutral-400 mt-1">(Truncated)</div>}
                    </div>
                  )}
                  {file && (file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && <div className="mt-3 text-xs text-neutral-400">PDF uploaded. Preview not available.</div>}
                  {file && (file.type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) && <div className="mt-3 text-xs text-neutral-400">DOCX uploaded. Preview not available.</div>}
                  {fileError && <div className="mt-2 text-sm text-red-400">{fileError}</div>}
              </div>
            )}
          </div>
          <div className="flex justify-between gap-3 pt-4 border-t flex-wrap">
            <Button type="button" onClick={handleGenerateScript} disabled={generating} className="min-w-[160px] h-12 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">{generating ? 'Generating...' : 'AI Assist (Script)'}</Button>
            <Button type="button" onClick={handleGenerateStoryboard} disabled={storyboardLoading || !textValue.trim()} className="min-w-[180px] h-12 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">{storyboardLoading ? 'Generating Storyboard…' : 'Generate Storyboard'}</Button>
          </div>
        </div>
      </form>
      {/* Right: Visual settings */}
      <div className="lg:col-span-1 flex flex-col gap-4">
  <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6 md:p-7 flex flex-col overflow-hidden">
          <h3 className="text-sm font-semibold text-white mb-4">Visual Settings</h3>
          <div className="flex-1 pr-1 space-y-6 text-[13px]">
            <section>
              <div className="font-medium mb-3 flex items-center justify-between">
                <span className="text-neutral-300">AI Model</span>
                <span className="text-xs text-neutral-400 font-normal">
                  {getModelInfo(selectedModel)?.cost || 0} credits
                </span>
              </div>
              <div className="space-y-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200 inline-flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-sm">{getModelInfo(selectedModel)?.name || 'Select Model'}</span>
                      </div>
                      <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-300 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={4} className="w-64 border border-neutral-700 bg-neutral-900 shadow-xl rounded-lg">
                    <DropdownMenuLabel className="text-xs font-semibold text-neutral-300 px-4 py-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">
                      Select AI Model
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={selectedModel} onValueChange={setSelectedModel}>
                      {getImageGenerationModels().map((model) => (
                        <DropdownMenuRadioItem key={model.id} value={model.id} className="px-4 py-3 hover:bg-neutral-800 cursor-pointer text-white border-b border-neutral-700 last:border-b-0 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="font-medium text-sm">{model.name}</span>
                            </div>
                            <span className="text-xs text-neutral-400">{model.cost} credits</span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </section>
            <section>
              <div className="font-medium mb-3 flex items-center justify-between">
                <span className="text-neutral-300">Aspect Ratio</span>
              </div>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200 inline-flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium text-sm">{ratio}</span>
                      </div>
                      <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-300 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={4} className="w-48 border border-neutral-700 bg-neutral-900 shadow-xl rounded-lg">
                    <DropdownMenuLabel className="text-xs font-semibold text-neutral-300 px-4 py-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">
                      Select Aspect Ratio
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={ratio} onValueChange={(v) => setRatio(v as any)}>
                      {(['16:9','1:1','9:16'] as const).map(r => (
                        <DropdownMenuRadioItem key={r} value={r} className="px-4 py-3 hover:bg-neutral-800 cursor-pointer text-white border-b border-neutral-700 last:border-b-0 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="font-medium text-sm">{r}</span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </section>
            <section>
              <div className="font-medium mb-2 flex items-center justify-between"><span className="text-neutral-300">Visual Style</span></div>
              <button type="button" onClick={() => setShowGalleryModal(true)} className="group relative flex flex-col rounded-lg overflow-hidden border border-neutral-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition w-full" aria-label={`Current visual style ${stylePresets.find(s=>s.id===visualStyle)?.label} (selected)`}>
                <div className="aspect-[4/3] w-full bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-300">
                  <Image src={stylePresets.find(s=>s.id===visualStyle)?.img || '/styles/photo.jpg'} alt={stylePresets.find(s=>s.id===visualStyle)?.label || 'Selected style'} fill className="object-cover" />
                  <span className="relative z-10 bg-black/60 text-white px-1 rounded-sm">Selected</span>
                </div>
                <div className="px-2 py-1.5 text-xs font-medium flex items-center gap-1 bg-black text-white relative">{stylePresets.find(s=>s.id===visualStyle)?.label}</div>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  )

  if (!isInitialized) {
    return (
      <div className="mx-auto p-6 max-w-7xl">
        <div className="w-full h-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-8 w-8 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <div className="text-neutral-300 text-sm">Loading setup form...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto p-6 max-w-7xl">
      <header className="mb-6 flex items-center justify-between">
      </header>
      {scriptView}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowGalleryModal(false)} />
          <div className="relative max-w-4xl w-full bg-neutral-900 rounded-xl ring-1 ring-neutral-700 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-medium text-white">Select Visual Style</h4>
                <input value={gallerySearch} onChange={e=>setGallerySearch(e.target.value)} placeholder="Search styles" className="text-xs px-3 py-1 rounded-md border border-neutral-700 bg-neutral-900 text-white placeholder-neutral-400" />
              </div>
              <div className="flex items-center gap-2"><button className="text-xs text-neutral-300 underline" onClick={() => setShowGalleryModal(false)}>Close</button></div>
            </div>
            <div className="p-4 grid grid-cols-4 gap-4 max-h-[60vh] overflow-auto text-xs">
              {stylePresets.filter(s=>s.label.toLowerCase().includes(gallerySearch.toLowerCase())).map(s => {
                const active = visualStyle === s.id
                return (
                  <button key={s.id} onClick={() => { setVisualStyle(s.id); setShowGalleryModal(false) }} className={`relative rounded-md overflow-hidden border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-ring ring-2 ring-ring' : 'border-neutral-700 hover:border-neutral-600'}`}>
                    <Image src={s.img} alt={s.label} width={200} height={96} className="w-full h-24 object-cover" loading="lazy" />
                    <div className={`px-2 py-1 font-medium ${active ? 'bg-black text-white' : 'bg-neutral-800 text-white'}`}>{s.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {showGenModal && genResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowGenModal(false)} />
          <div className="relative max-w-3xl w-full bg-neutral-900 rounded-xl ring-1 ring-neutral-700 shadow-xl overflow-hidden p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Generated Script Preview</h4>
                              <button className="text-xs text-neutral-300" onClick={() => setShowGenModal(false)}>Close</button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-3 border border-neutral-700 rounded-md bg-neutral-900 text-sm whitespace-pre-wrap text-white">{genResult}</div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-2 text-sm rounded-md border border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700" onClick={() => { setTextValue(prev => (prev ? prev + '\n\n' + genResult : genResult)); setShowGenModal(false); setGenResult(null); }}>Append</button>
              <button className="px-4 py-2 text-sm rounded-md bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700" onClick={() => { setTextValue(genResult || ''); setShowGenModal(false); setGenResult(null); }}>Replace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}