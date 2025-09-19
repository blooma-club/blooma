'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

type Mode = 'paste' | 'upload'

type Props = {
  mode: Mode
  setMode: (m: Mode) => void
  textValue: string
  setTextValue: (v: string) => void
  file: File | null
  fileError: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  fileRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (e?: React.FormEvent) => void
  generating: boolean
  onGenerateScript: () => void
}

export default function ScriptEditor(props: Props) {
  const {
    mode,
    setMode,
    textValue,
    setTextValue,
    file,
    fileError,
    onFileChange,
    onDrop,
    fileRef,
    onSubmit,
    generating,
    onGenerateScript,
  } = props

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-neutral-900 p-10 rounded-xl border border-neutral-800 flex flex-col lg:col-span-2 shadow-lg">
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
              <div className="mt-1 text-[11px] text-neutral-400">
                <span>{textValue.length} chars</span>
              </div>
            </div>
          )}

          {mode==='upload' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Attach TXT, MD, PDF, or DOCX</label>
              <div onDrop={onDrop} onDragOver={e=>e.preventDefault()} onClick={() => fileRef.current?.click()} className="border border-dashed border-neutral-700 rounded-md p-6 text-center cursor-pointer hover:bg-neutral-700 transition w-full min-h-[320px] flex flex-col justify-center bg-neutral-900">
                <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} className="hidden" />
                {!file && <div className="text-sm text-neutral-300">Drag & drop or <span className="underline">browse</span></div>}
                {file && <div className="text-sm text-neutral-200">{file.name} • {(file.size/1024).toFixed(1)} KB</div>}
                <p className="mt-2 text-[11px] text-neutral-400">TXT/MD preview • PDF/DOCX upload only</p>
              </div>
              {fileError && <div className="mt-2 text-sm text-red-400">{fileError}</div>}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t flex-wrap">
          <Button type="button" onClick={onGenerateScript} disabled={generating} className="min-w-[160px] h-12 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">{generating ? 'Generating...' : 'Generate Script'}</Button>
        </div>
      </div>
    </form>
  )
}


