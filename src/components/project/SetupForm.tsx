'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { BuildStoryboardOptions, StoryboardBuildResponse } from '@/types/storyboard'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DEFAULT_MODEL } from '@/lib/fal-ai'
import {
  saveDraftToLocal,
  loadDraftFromLocal,
  clearDraftFromLocal,
  saveProjectRatio,
} from '@/lib/localStorage'
import Image from 'next/image'
import ScriptEditor from '@/components/project/setup/ScriptEditor'
import WizardProgress from '@/components/project/setup/WizardProgress'
import CharacterWizard from '@/components/project/setup/CharacterWizard'
import PreviewPanel from './setup/PreviewPanel'
import { useAuth } from '@clerk/nextjs'
import type { OptionalSettings } from '@/components/project/setup/OptionalSettingsPanel'

type CharacterWizardCharacter = NonNullable<
  NonNullable<React.ComponentProps<typeof CharacterWizard>['initial']>
>[number]

type SetupDraftData = {
  script: string
  visualStyle: string
  ratio: '16:9' | '1:1' | '9:16'
  selectedModel: string
  settings: OptionalSettings
  characters: CharacterWizardCharacter[]
}

const DEFAULT_SETTINGS: OptionalSettings = {
  intent: '',
  genre: '',
  tone: '',
  audience: '',
  objective: '',
  keyMessage: '',
  language: 'English',
  constraints: '',
  aiModel: 'gemini-2.0-flash-exp',
}

type SetupFormProps = {
  id?: string
  onSubmit?: (payload: { mode: 'write' | 'upload'; text?: string; file?: File | null }) => void
}

export default function SetupForm({ id, onSubmit }: SetupFormProps) {
  const params = useParams() as { id: string }
  const projectId = id || params.id
  const router = useRouter()
  const { isSignedIn, userId } = useAuth()

  const [isInitialized, setIsInitialized] = useState(false)
  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [storyboardLoading, setStoryboardLoading] = useState(false)
  // Storyboard UI migrated to storyboard/[sbId] page; keep only script-related state here.
  const [genResult, setGenResult] = useState<string | null>(null)
  const [showGenModal, setShowGenModal] = useState(false)
  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Optional Settings (left brief panel)
  // 간단한 상태 관리 - 모든 드래프트 데이터를 하나의 객체로 관리
  const [draftData, setDraftData] = useState<SetupDraftData>({
    script: '',
    visualStyle: 'photo',
    ratio: '16:9',
    selectedModel: DEFAULT_MODEL,
    settings: { ...DEFAULT_SETTINGS },
    characters: [],
  })

  // 개별 상태는 draftData에서 파생
  const textValue = draftData.script
  const visualStyle = draftData.visualStyle
  const ratio = draftData.ratio
  const selectedModel = draftData.selectedModel
  const characters = draftData.characters

  // 상태 업데이트 함수들
  const setTextValue = useCallback(
    (value: string) => setDraftData(prev => ({ ...prev, script: value })),
    []
  )
  const setVisualStyle = useCallback(
    (value: string) => setDraftData(prev => ({ ...prev, visualStyle: value })),
    []
  )
  const setRatio = useCallback(
    (value: '16:9' | '1:1' | '9:16') => {
      setDraftData(prev => ({ ...prev, ratio: value }))
      // Save ratio to localStorage immediately when changed
      if (projectId) {
        saveProjectRatio(projectId, value)
      }
    },
    [projectId]
  )
  const setSelectedModel = useCallback(
    (value: string) => setDraftData(prev => ({ ...prev, selectedModel: value })),
    []
  )
  const setCharacters = useCallback((value: CharacterWizardCharacter[]) => {
    setDraftData(prev => ({ ...prev, characters: value }))
  }, [])

  // 간단한 자동 저장 (debounce, UI 표시 없음)
  useEffect(() => {
    if (!projectId || storyboardLoading) return

    const timer = setTimeout(() => {
      try {
        saveDraftToLocal(projectId, draftData)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [projectId, draftData, storyboardLoading])

  // Load saved draft on component mount
  useEffect(() => {
    if (!projectId) return

    const savedDraft = loadDraftFromLocal(projectId)
    if (savedDraft) {
      const savedSettings = savedDraft.settings ?? {}
      const savedCharacters: CharacterWizardCharacter[] = Array.isArray(savedDraft.characters)
        ? savedDraft.characters.map(character => {
            const fromStorage = character as Partial<CharacterWizardCharacter> & { id: string }
            return {
              id: fromStorage.id,
              name: typeof fromStorage.name === 'string' ? fromStorage.name : '',
              imageUrl: fromStorage.imageUrl,
              originalImageUrl: fromStorage.originalImageUrl,
              editPrompt: fromStorage.editPrompt,
              image_url: fromStorage.image_url,
              original_image_url: fromStorage.original_image_url,
              edit_prompt: fromStorage.edit_prompt,
              imageKey: fromStorage.imageKey,
              imageSize: fromStorage.imageSize,
              originalImageKey: fromStorage.originalImageKey,
              originalImageSize: fromStorage.originalImageSize,
              image_key: fromStorage.image_key,
              image_size: fromStorage.image_size,
              original_image_key: fromStorage.original_image_key,
              original_image_size: fromStorage.original_image_size,
            }
          })
        : []
      setDraftData({
        script: savedDraft.script || '',
        visualStyle: savedDraft.visualStyle || 'photo',
        ratio: (savedDraft.ratio as '16:9' | '1:1' | '9:16') || '16:9',
        selectedModel: savedDraft.selectedModel || DEFAULT_MODEL,
        settings: { ...DEFAULT_SETTINGS, ...savedSettings, aiModel: 'gemini-2.0-flash-exp' },
        characters: savedCharacters,
      })
      console.log('Draft restored from localStorage:', savedDraft)
    }

    // 초기화 완료 표시
    setTimeout(() => {
      setIsInitialized(true)
    }, 300)
  }, [projectId])

  // 페이지 이탈 경고: 드래프트가 변경된 경우에만 표시
  useEffect(() => {
    const isDirty = !(
      draftData.script.trim() === '' &&
      draftData.visualStyle === 'photo' &&
      draftData.ratio === '16:9' &&
      draftData.selectedModel === DEFAULT_MODEL &&
      JSON.stringify(draftData.settings) === JSON.stringify(DEFAULT_SETTINGS) &&
      draftData.characters.length === 0
    )

    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [draftData])

  // Clear saved draft when storyboard generation is successful
  const clearSavedDraft = useCallback(() => {
    if (projectId) {
      clearDraftFromLocal(projectId)
    }
  }, [projectId])

  // Removed advanced visual settings (lighting, tone, mood, camera, grid, guides) per simplification request

  const stylePresets: { id: string; label: string; img: string; desc: string }[] = [
    {
      id: 'photo',
      label: 'Photo realistic',
      img: '/styles/photo.jpg',
      desc: 'Photorealistic imagery',
    },
    {
      id: 'cinematic',
      label: 'Cinematic',
      img: '/styles/cinematic.jpg',
      desc: 'Film-like lighting & depth',
    },
    {
      id: 'watercolor',
      label: 'Watercolor',
      img: '/styles/watercolor.jpg',
      desc: 'Soft pigment wash',
    },
    {
      id: 'lineart',
      label: 'Line Art',
      img: '/styles/lineart.jpg',
      desc: 'Clean monochrome lines',
    },
    { id: 'pixel', label: 'Pixel', img: '/styles/pixel.jpg', desc: 'Retro low-res charm' },
  ]

  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [gallerySearch, setGallerySearch] = useState('')

  const fileRef = useRef<HTMLInputElement | null>(null)

  const ACCEPTED = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  const MAX_MB = 10

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const f = e.target.files?.[0] ?? null
    if (!f) {
      setFile(null)
      return
    }
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
      await handleFileChange({
        target: { files: [f] },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
      setMode('upload')
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFileError(null)
    if (mode === 'upload' && !file) {
      setFileError('Please upload a file or switch to Write mode.')
      return
    }
    if (mode === 'paste' && !textValue.trim()) {
      setFileError('Please enter text or switch to Upload mode.')
      return
    }

    try {
      const payload: { mode: 'write' | 'upload'; text?: string; file?: File | null } = {
        mode: mode === 'paste' ? 'write' : 'upload',
        text: textValue,
        file,
      }
      onSubmit?.(payload)
    } catch {
      setFileError('Submission failed. Please try again.')
    }
  }

  const handleGenerateStoryboard = async (
    sceneMetadata?: { sceneId: string; metadata: any[] }[]
  ) => {
    setFileError(null)
    if (!textValue.trim()) {
      setFileError('Please enter a script before generating storyboard.')
      return
    }
    setStoryboardLoading(true)
    try {
      const normalizedCharacters = characters.map(character => ({
        id: character.id,
        name: character.name,
        imageUrl: character.imageUrl ?? character.image_url,
        originalImageUrl: character.originalImageUrl ?? character.original_image_url,
        editPrompt: character.editPrompt ?? character.edit_prompt,
      }))

      const payload: BuildStoryboardOptions = {
        projectId: projectId,
        script: textValue,
        visualStyle,
        ratio,
        mode: 'async',
        // AI Model settings
        aiModel: selectedModel,
        // Character references for image generation
        characters: normalizedCharacters,
        // Scene metadata with dragged characters
        sceneMetadata,
      }

      if (!isSignedIn) {
        throw new Error('Authentication required. Please log in again.')
      }

      console.log('[SETUP] Making authenticated request to build storyboard')

      const res = await fetch('/api/storyboard/build', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      let data: (StoryboardBuildResponse & { backgrounds?: unknown[] }) | null = null
      try {
        data = await res.json()
      } catch {
        const txt = await res.text().catch(() => '')
        console.error('Non-JSON response from /api/storyboard/build', res.status, txt)
        throw new Error(`Server returned ${res.status}: ${txt || 'Non-JSON response'}`)
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to build storyboard')
      if (!data) throw new Error('Invalid server response')
      const newProjectId = data.projectId
      console.log('[SETUP] Storyboard generation result:', {
        projectId: newProjectId,
        mode: data.mode,
        framesCount: data.framesCount,
        title: data.title,
        backgroundsCount: data.backgrounds?.length || 0,
      })

      if (newProjectId) {
        // Clear the draft since we've successfully generated a storyboard
        clearSavedDraft()
        saveProjectRatio(newProjectId, ratio)

        const newUrl = `/project/${encodeURIComponent(newProjectId)}/storyboard?view=editor`
        console.log('[SETUP] Navigating directly to editor:', newUrl)

        router.replace(newUrl)
      } else throw new Error('No project ID returned.')
    } catch (error: unknown) {
      setFileError(error instanceof Error ? error.message : 'Storyboard generation failed')
    } finally {
      setStoryboardLoading(false)
    }
  }
  
  const scriptView = (
    <div className="gap-6 items-start">
      <ScriptEditor
        mode={mode}
        setMode={setMode}
        textValue={textValue}
        setTextValue={setTextValue}
        file={file}
        fileError={fileError}
        onFileChange={handleFileChange}
        onDrop={handleDrop}
        fileRef={fileRef}
        onSubmit={handleSubmit}
        onNext={() => setStep(2)}
      />
    </div>
  )

  const charactersView = (
    <div className="space-y-6">
      <CharacterWizard
        onChange={setCharacters}
        initial={characters}
        // script={textValue} // Removed as 'script' is not part of CharacterWizard's Props
        projectId={projectId}
        userId={userId ?? undefined}
      />
      <div className="flex justify-between">
        <Button
          type="button"
          onClick={() => setStep(1)}
          className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white min-w-[140px]"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => setStep(3)}
          className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white min-w-[160px]"
        >
          Next: Preview
        </Button>
      </div>
    </div>
  )

  const previewView = (
    <PreviewPanel
      script={textValue}
      characters={characters}
      generating={storyboardLoading}
      onBack={() => setStep(2)}
      onEditScript={() => setStep(1)}
      onEditCharacters={() => setStep(2)}
      onGenerateStoryboard={handleGenerateStoryboard}
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      ratio={ratio}
      setRatio={setRatio}
      visualStyle={visualStyle}
      onOpenStyleGallery={() => setShowGalleryModal(true)}
    />
  )

  if (!isInitialized) {
    return (
      <div className="mx-auto p-6 max-w-7xl">
        <div className="w-full h-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
              >
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
      <header className="mb-6 flex items-center justify-center">
        <WizardProgress currentStep={step} />
      </header>
      {step === 1 ? scriptView : step === 2 ? charactersView : previewView}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowGalleryModal(false)}
          />
          <div className="relative max-w-4xl w-full bg-neutral-900 rounded-xl ring-1 ring-neutral-700 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-medium text-white">Select Visual Style</h4>
                <input
                  value={gallerySearch}
                  onChange={e => setGallerySearch(e.target.value)}
                  placeholder="Search styles"
                  className="text-xs px-3 py-1 rounded-md border border-neutral-700 bg-neutral-900 text-white placeholder-neutral-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-neutral-300 underline"
                  onClick={() => setShowGalleryModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-4 gap-4 max-h-[60vh] overflow-auto text-xs">
              {stylePresets
                .filter(s => s.label.toLowerCase().includes(gallerySearch.toLowerCase()))
                .map(s => {
                  const active = visualStyle === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setVisualStyle(s.id)
                        setShowGalleryModal(false)
                      }}
                      className={`relative rounded-md overflow-hidden border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-ring ring-2 ring-ring' : 'border-neutral-700 hover:border-neutral-600'}`}
                    >
                      <Image
                        src={s.img}
                        alt={s.label}
                        width={200}
                        height={96}
                        className="w-full h-24 object-cover"
                        loading="lazy"
                      />
                      <div
                        className={`px-2 py-1 font-medium ${active ? 'bg-black text-white' : 'bg-neutral-800 text-white'}`}
                      >
                        {s.label}
                      </div>
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
              <button className="text-xs text-neutral-300" onClick={() => setShowGenModal(false)}>
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-3 border border-neutral-700 rounded-md bg-neutral-900 text-sm whitespace-pre-wrap text-white">
              {genResult}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                className="px-3 py-2 text-sm rounded-md border border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
                onClick={() => {
                  setTextValue(textValue ? textValue + '\n\n' + genResult : genResult || '')
                  setShowGenModal(false)
                  setGenResult(null)
                }}
              >
                Append
              </button>
              <button
                className="px-4 py-2 text-sm rounded-md bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700"
                onClick={() => {
                  setTextValue(genResult || '')
                  setShowGenModal(false)
                  setGenResult(null)
                }}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
