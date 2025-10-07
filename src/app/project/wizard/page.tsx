'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2, RefreshCcw, Save, Sparkles, Upload, Wand2 } from 'lucide-react'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase, type SupabaseCharacter } from '@/lib/supabase'
import { DEFAULT_MODEL } from '@/lib/fal-ai'

type WizardAnswers = {
  q1: string
  q2: string
  q3: string
  q4: string
}

type WizardPhase = 'questions' | 'script' | 'characters'

type CharacterDetailsForm = {
  name: string
  description: string
  editPrompt: string
}

type DetectedCharacterSuggestion = {
  id: string
  name: string
  role: string
  description: string
  visualTraits: string
}

type CharacterUiState = {
  isSaving: boolean
  isGenerating: boolean
  isUploading: boolean
  message: string | null
  error: string | null
}

const DEFAULT_CHARACTER_MODEL = DEFAULT_MODEL

const normalizeName = (value?: string | null) => (value || '').trim().toLowerCase()

type HydratedCharacter = SupabaseCharacter & {
  editPrompt?: string | null
  imageUrl?: string | null
  originalImageUrl?: string | null
}

export default function StoryboardWizardPage() {
  const router = useRouter()
  const { user, session } = useSupabase()

  const [phase, setPhase] = useState<WizardPhase>('questions')
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<WizardAnswers>({ q1: '', q2: '', q3: '', q4: '' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [isCreatingStoryboard, setIsCreatingStoryboard] = useState(false)

  const [characters, setCharacters] = useState<HydratedCharacter[]>([])
  const [characterForms, setCharacterForms] = useState<Record<string, CharacterDetailsForm>>({})
  const [characterUiState, setCharacterUiState] = useState<Record<string, CharacterUiState>>({})
  const [characterSuggestions, setCharacterSuggestions] = useState<Record<string, DetectedCharacterSuggestion>>({})
  const [isDetectingCharacters, setIsDetectingCharacters] = useState(false)
  const [hasDetectedCharacters, setHasDetectedCharacters] = useState(false)
  const [characterDetectionStatus, setCharacterDetectionStatus] = useState<string | null>(null)
  const [characterDetectionError, setCharacterDetectionError] = useState<string | null>(null)

  const questions = [
    {
      id: 'q1',
      question: '무엇을 만들것이냐?',
      placeholder: '브랜드 캠페인에 사용할 숏 필름을 만들고싶어.',
    },
    {
      id: 'q2',
      question: '어떤 스타일을 원하냐?',
      placeholder: '미적이면서 시네마틱한 영상',
    },
    {
      id: 'q3',
      question: '모델/배우를 생성하시겠습니까?(없다면 업로드해주세요.)',
      placeholder: '예/업로드',
    },
    {
      id: 'q4',
      question: '추가적인 요청을 주세요!',
      placeholder: '카메라 앵글이 다이나믹하면 좋겠어요',
    },
  ] as const

  const buildHeaders = useCallback(
    (headers: Record<string, string> = {}) => {
      if (session?.access_token) {
        return { ...headers, Authorization: `Bearer ${session.access_token}` }
      }
      return headers
    },
    [session?.access_token]
  )

  const initializeCharacterForms = useCallback(
    (items: SupabaseCharacter[], suggestions?: DetectedCharacterSuggestion[]) => {
      const suggestionMap = new Map<string, DetectedCharacterSuggestion>()
      suggestions?.forEach(suggestion => {
        const key = normalizeName(suggestion.name)
        if (key) suggestionMap.set(key, suggestion)
      })

      const forms: Record<string, CharacterDetailsForm> = {}
      items.forEach(character => {
        const suggestion = suggestionMap.get(normalizeName(character.name))
        forms[character.id] = {
          name: character.name || suggestion?.name || '',
          description:
            character.description ||
            suggestion?.description ||
            suggestion?.role ||
            '',
          editPrompt: character.edit_prompt || suggestion?.visualTraits || '',
        }
      })

      const uiStates: Record<string, CharacterUiState> = {}
      items.forEach(character => {
        uiStates[character.id] = {
          isSaving: false,
          isGenerating: false,
          isUploading: false,
          message: null,
          error: null,
        }
      })

      setCharacterForms(forms)
      setCharacterUiState(uiStates)
    },
    []
  )

  const updateCharacterUi = useCallback((id: string, updates: Partial<CharacterUiState>) => {
    setCharacterUiState(prev => {
      const current =
        prev[id] || ({
          isSaving: false,
          isGenerating: false,
          isUploading: false,
          message: null,
          error: null,
        } satisfies CharacterUiState)

      return {
        ...prev,
        [id]: {
          ...current,
          ...updates,
        },
      }
    })
  }, [])

  const detectCharactersFromScript = useCallback(async () => {
    if (!user?.id) {
      setCharacterDetectionError('Please sign in to detect characters.')
      return
    }
    if (!projectId) {
      setCharacterDetectionError('Project was not created yet. Please regenerate the script.')
      return
    }
    if (!generatedScript.trim()) {
      setCharacterDetectionError('Generated script is empty. Go back and regenerate before continuing.')
      return
    }

    setIsDetectingCharacters(true)
    setCharacterDetectionStatus('Analyzing script to detect main characters…')
    setCharacterDetectionError(null)

    try {
      const existingResponse = await fetch(
        `/api/characters?project_id=${projectId}`,
        { headers: buildHeaders() }
      )
      const existingPayload = await existingResponse.json().catch(() => ({}))
      if (!existingResponse.ok) {
        throw new Error(existingPayload?.error || 'Failed to load existing characters.')
      }
      const existingCharacters = Array.isArray(existingPayload?.characters)
        ? (existingPayload.characters as SupabaseCharacter[])
        : []

      const detectionResponse = await fetch('/api/characters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: generatedScript,
          model: 'auto',
          prompt: 'Extract the primary characters along with concise visual notes for reference images.',
        }),
      })
      const detectionPayload = await detectionResponse.json().catch(() => ({}))
      if (!detectionResponse.ok) {
        throw new Error(detectionPayload?.error || 'Character detection failed.')
      }

      const suggestionsRaw = Array.isArray(detectionPayload?.characters)
        ? detectionPayload.characters
        : []

      const suggestions: DetectedCharacterSuggestion[] = suggestionsRaw.map((entry: any) => ({
        id: typeof entry?.id === 'string' ? entry.id : normalizeName(entry?.name || ''),
        name:
          typeof entry?.name === 'string' && entry.name.trim()
            ? entry.name.trim()
            : 'Unnamed character',
        role: typeof entry?.role === 'string' ? entry.role.trim() : '',
        description: typeof entry?.description === 'string' ? entry.description.trim() : '',
        visualTraits:
          typeof entry?.visualTraits === 'string' ? entry.visualTraits.trim() : '',
      }))

      const suggestionMap: Record<string, DetectedCharacterSuggestion> = {}
      suggestions.forEach(suggestion => {
        const key = normalizeName(suggestion.name)
        if (key) suggestionMap[key] = suggestion
      })
      setCharacterSuggestions(suggestionMap)

      const existingByName = new Map<string, SupabaseCharacter>()
      existingCharacters.forEach(character => {
        const key = normalizeName(character.name)
        if (key) existingByName.set(key, character)
      })

      const matched: SupabaseCharacter[] = []
      const created: SupabaseCharacter[] = []

      for (const suggestion of suggestions) {
        const key = normalizeName(suggestion.name)
        const existing = key ? existingByName.get(key) : undefined
        if (existing) {
          matched.push(existing)
          continue
        }

        const payload: Record<string, unknown> = {
          user_id: user.id,
          project_id: projectId,
          name: suggestion.name,
        }
        const description = suggestion.description || suggestion.role
        if (description) payload.description = description
        if (suggestion.visualTraits) payload.edit_prompt = suggestion.visualTraits

        const createResponse = await fetch('/api/characters', {
          method: 'POST',
          headers: buildHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        })
        const createPayload = await createResponse.json().catch(() => ({}))
        if (!createResponse.ok) {
          throw new Error(createPayload?.error || `Failed to create character ${suggestion.name}`)
        }
        if (createPayload?.character) {
          created.push(createPayload.character as SupabaseCharacter)
        }
      }

      const unmatchedExisting = existingCharacters.filter(
        character => !matched.some(other => other.id === character.id)
      )
      const ordered = [...matched, ...created, ...unmatchedExisting]

      setCharacters(ordered)
      initializeCharacterForms(ordered, suggestions)
      setHasDetectedCharacters(true)

      if (suggestions.length > 0) {
        setCharacterDetectionStatus(
          `Detected ${suggestions.length} character${suggestions.length === 1 ? '' : 's'}. Review their details and reference images below.`
        )
      } else if (ordered.length > 0) {
        setCharacterDetectionStatus('No new characters detected. Review existing characters below.')
      } else {
        setCharacterDetectionStatus(
          'No characters detected from the script. You can add characters later from the storyboard editor.'
        )
      }
    } catch (error) {
      console.error('[Wizard] Character detection failed:', error)
      setCharacterDetectionError(
        error instanceof Error ? error.message : 'Failed to detect characters.'
      )
    } finally {
      setIsDetectingCharacters(false)
    }
  }, [buildHeaders, generatedScript, initializeCharacterForms, projectId, user?.id])

  useEffect(() => {
    if (phase === 'characters' && !hasDetectedCharacters && !isDetectingCharacters) {
      void detectCharactersFromScript()
    }
  }, [detectCharactersFromScript, hasDetectedCharacters, isDetectingCharacters, phase])

  const handleAnswerChange = (questionId: keyof WizardAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentStep < questions.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleGenerateScript = async () => {
    if (!user?.id) {
      alert('Please sign in to create a project')
      return
    }

    setIsGenerating(true)
    setCharacters([])
    setCharacterForms({})
    setCharacterUiState({})
    setCharacterDetectionStatus(null)
    setCharacterDetectionError(null)
    setCharacterSuggestions({})
    setHasDetectedCharacters(false)

    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: 'Guided Storyboard Project',
          description: `Generated from wizard: ${answers.q1}`,
          user_id: user.id,
          is_public: false,
        })
        .select()
        .single()

      if (projectError) {
        throw new Error(`Failed to create project: ${projectError.message}`)
      }

      setProjectId(project.id)

      const brief = `Create a storyboard script based on these requirements:
1. What to create: ${answers.q1}
2. Style: ${answers.q2}
3. Model/Actor: ${answers.q3}
4. Additional requests: ${answers.q4}

Please generate a detailed storyboard script in English.`

      const scriptResponse = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          tone: answers.q2,
          length: 'Short (30-60 seconds)',
        }),
      })

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate script')
      }

      const scriptData = await scriptResponse.json()
      setGeneratedScript(scriptData.script)
      setPhase('script')
    } catch (error) {
      console.error('Error generating script:', error)
      alert('Failed to generate script. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveCharacter = useCallback(
    async (id: string) => {
      const form = characterForms[id]
      if (!form) return

      const name = form.name.trim()
      if (!name) {
        updateCharacterUi(id, { error: 'Name is required before saving.' })
        return
      }

      updateCharacterUi(id, { isSaving: true, message: 'Saving…', error: null })

      try {
        const response = await fetch('/api/characters', {
          method: 'PUT',
          headers: buildHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            id,
            name,
            description: form.description.trim() || null,
            edit_prompt: form.editPrompt.trim() || null,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to save character.')
        }

        const updated = payload?.character as SupabaseCharacter | undefined
        if (updated) {
          setCharacters(prev => prev.map(character => (character.id === id ? updated : character)))
          setCharacterForms(prev => ({
            ...prev,
            [id]: {
              name: updated.name ?? '',
              description: updated.description ?? '',
              editPrompt: updated.edit_prompt ?? '',
            },
          }))
        }

        updateCharacterUi(id, { isSaving: false, message: 'Details saved.' })
      } catch (error) {
        console.error('Failed to save character', error)
        updateCharacterUi(id, {
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to save character.',
        })
      }
    },
    [buildHeaders, characterForms, updateCharacterUi]
  )

  const applyImageToCharacter = useCallback(
    async (id: string, imageUrl: string, prompt?: string) => {
      const form = characterForms[id]
      const response = await fetch('/api/characters/upload-image', {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          characterId: id,
          imageUrl,
          projectId,
          characterName: form?.name || 'Character',
          editPrompt: prompt || form?.editPrompt || '',
          userId: user?.id,
          isUpdate: true,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save character image.')
      }

      const updated = payload?.character as SupabaseCharacter | undefined
      if (updated) {
        setCharacters(prev => prev.map(character => (character.id === id ? updated : character)))
        setCharacterForms(prev => ({
          ...prev,
          [id]: {
            name: updated.name ?? '',
            description: updated.description ?? '',
            editPrompt: updated.edit_prompt ?? '',
          },
        }))
      } else {
        const imageFromResponse = payload?.publicUrl || payload?.signedUrl || imageUrl
        setCharacters(prev =>
          prev.map(character =>
            character.id === id
              ? {
                  ...character,
                  image_url: imageFromResponse,
                }
              : character
          )
        )
      }
    },
    [buildHeaders, characterForms, projectId, user?.id]
  )

  const handleGenerateCharacterImage = useCallback(
    async (id: string) => {
      const form = characterForms[id]
      if (!form) return

      const prompt = form.editPrompt.trim() || form.description.trim() || form.name.trim()
      if (!prompt) {
        updateCharacterUi(id, {
          error: 'Add a visual prompt or description before generating an image.',
        })
        return
      }

      updateCharacterUi(id, { isGenerating: true, message: 'Generating image…', error: null })

      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            aspectRatio: '3:4',
            quality: 'balanced',
            modelId: DEFAULT_CHARACTER_MODEL,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.imageUrl) {
          throw new Error(payload?.error || 'Image generation failed.')
        }

        await applyImageToCharacter(id, payload.imageUrl as string, prompt)
        updateCharacterUi(id, { isGenerating: false, message: 'Image generated and saved.' })
      } catch (error) {
        console.error('Failed to generate character image', error)
        updateCharacterUi(id, {
          isGenerating: false,
          error: error instanceof Error ? error.message : 'Image generation failed.',
        })
      }
    },
    [applyImageToCharacter, characterForms, updateCharacterUi]
  )

  const handleUploadCharacterImage = useCallback(
    async (id: string, file: File | null) => {
      if (!file) return

      updateCharacterUi(id, { isUploading: true, message: 'Uploading image…', error: null })

      try {
        const form = characterForms[id]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('characterId', id)
        if (projectId) formData.append('projectId', projectId)
        if (form?.name) formData.append('characterName', form.name)
        if (form?.editPrompt) formData.append('editPrompt', form.editPrompt)
        if (user?.id) formData.append('userId', user.id)
        formData.append('isUpdate', 'true')

        const response = await fetch('/api/characters/upload-image', {
          method: 'POST',
          headers: buildHeaders(),
          body: formData,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to upload image.')
        }

        const updated = payload?.character as SupabaseCharacter | undefined
        if (updated) {
          setCharacters(prev => prev.map(character => (character.id === id ? updated : character)))
          setCharacterForms(prev => ({
            ...prev,
            [id]: {
              name: updated.name ?? '',
              description: updated.description ?? '',
              editPrompt: updated.edit_prompt ?? '',
            },
          }))
        } else {
          const imageFromResponse = payload?.publicUrl || payload?.signedUrl
          if (imageFromResponse) {
            setCharacters(prev =>
              prev.map(character =>
                character.id === id
                  ? {
                      ...character,
                      image_url: imageFromResponse,
                    }
                  : character
              )
            )
          }
        }

        updateCharacterUi(id, { isUploading: false, message: 'Image uploaded.' })
      } catch (error) {
        console.error('Failed to upload character image', error)
        updateCharacterUi(id, {
          isUploading: false,
          error: error instanceof Error ? error.message : 'Failed to upload image.',
        })
      }
    },
    [buildHeaders, characterForms, projectId, updateCharacterUi, user?.id]
  )

  const handleCharacterFieldChange = (id: string, field: keyof CharacterDetailsForm, value: string) => {
    setCharacterForms(prev => {
      const current = prev[id] || { name: '', description: '', editPrompt: '' }
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
        },
      }
    })
    updateCharacterUi(id, { message: null, error: null })
  }

  const handleAdvanceToCharacters = () => {
    if (!generatedScript.trim()) return
    setPhase('characters')
  }

  const handleRetryDetection = () => {
    setHasDetectedCharacters(false)
    setCharacterDetectionError(null)
    void detectCharactersFromScript()
  }

  const handleGenerateStoryboard = async () => {
    if (!projectId || !generatedScript.trim()) {
      alert('Missing project or script data')
      return
    }

    setIsCreatingStoryboard(true)
    try {
      const characterPayload = characters.map(character => ({
        id: character.id,
        name: character.name,
        description: character.description,
        editPrompt: character.edit_prompt ?? character.editPrompt,
        imageUrl: character.image_url ?? character.imageUrl,
        originalImageUrl: character.original_image_url ?? character.originalImageUrl,
      }))

      const storyboardResponse = await fetch('/api/storyboard/build', {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          projectId,
          script: generatedScript,
          ratio: '16:9',
          aspectRatio: '16:9',
          visualStyle: answers.q2,
          aiModel: DEFAULT_MODEL,
          characters: characterPayload,
        }),
      })

      if (!storyboardResponse.ok) {
        throw new Error('Failed to create storyboard')
      }

      const storyboardData = await storyboardResponse.json()
      const storyboardId = storyboardData.storyboardId || projectId
      router.push(`/project/${projectId}/storyboard/${storyboardId}`)
    } catch (error) {
      console.error('Error creating storyboard:', error)
      alert('Failed to create storyboard. Please try again.')
    } finally {
      setIsCreatingStoryboard(false)
    }
  }

  const isLastStep = currentStep === questions.length
  const currentQuestion = questions[currentStep - 1]
  const canProceed = answers[currentQuestion.id as keyof WizardAnswers].trim().length > 0

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Generating Script...</h2>
          <p className="text-neutral-400">Please wait while we create your storyboard script</p>
        </div>
      </div>
    )
  }

  if (phase === 'script') {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="w-full bg-black border-b-2 border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setPhase('questions')}
              className="text-neutral-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Questions
            </Button>
            <div className="flex items-center gap-2">
              <img src="/blooma.svg" alt="Blooma Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold">Generated Script Preview</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Generated Script</h2>
                <div className="text-sm text-neutral-400">{generatedScript.split('\n').length} lines</div>
              </div>
              <div className="bg-neutral-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed font-mono">
                  {generatedScript}
                </pre>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-neutral-900 border-neutral-800 p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">What happens next?</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  We will analyse the script to detect the main characters, create editable entries for
                  them, and let you attach AI generated or uploaded reference images before we build the storyboard.
                </p>
                <div className="mt-6 space-y-3">
                  <Button
                    onClick={handleAdvanceToCharacters}
                    disabled={!generatedScript.trim()}
                    className="w-full bg-white hover:bg-neutral-200 text-black font-medium"
                  >
                    Review Characters
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPhase('questions')}
                    className="w-full border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                  >
                    Edit Answers
                  </Button>
                </div>
              </Card>

              <Card className="bg-neutral-900 border-neutral-800 p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Model Preview</h3>
                <div className="bg-neutral-800 rounded-lg p-8 text-center">
                  <div className="w-32 h-32 bg-neutral-700 rounded-full mx-auto mb-4 flex items-center justify-center text-neutral-400 text-sm">
                    Character Images
                  </div>
                  <p className="text-neutral-400 text-sm">
                    Character portraits will be generated or uploaded in the next step.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'characters') {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="w-full bg-black border-b-2 border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setPhase('script')}
              className="text-neutral-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Script
            </Button>
            <div className="flex items-center gap-2">
              <img src="/blooma.svg" alt="Blooma Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold">Character Setup</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <Card className="bg-neutral-900 border-neutral-800 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Detect characters & reference images</h2>
                <p className="text-sm text-neutral-400">
                  Review the detected characters, update their details, and add reference images using AI generation or your own uploads.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleRetryDetection}
                  disabled={isDetectingCharacters}
                  className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry detection
                </Button>
                <Button
                  onClick={handleGenerateStoryboard}
                  disabled={isCreatingStoryboard}
                  className="bg-white hover:bg-neutral-200 text-black font-medium"
                >
                  {isCreatingStoryboard ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating storyboard…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate storyboard
                    </>
                  )}
                </Button>
              </div>
            </div>
            {characterDetectionStatus && (
              <div className="mt-4 text-sm text-neutral-300">{characterDetectionStatus}</div>
            )}
            {characterDetectionError && (
              <div className="mt-4 text-sm text-red-400">{characterDetectionError}</div>
            )}
            {isDetectingCharacters && (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting characters…
              </div>
            )}
          </Card>

          <div className="space-y-6">
            {characters.map(character => {
              const form = characterForms[character.id] || { name: '', description: '', editPrompt: '' }
              const ui = characterUiState[character.id] || {
                isSaving: false,
                isGenerating: false,
                isUploading: false,
                message: null,
                error: null,
              }
              const suggestion = characterSuggestions[normalizeName(character.name)]

              return (
                <Card
                  key={character.id}
                  className="bg-neutral-900 border-neutral-800 p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
                    <div className="space-y-3">
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                        {character.image_url ? (
                          <Image
                            src={character.image_url}
                            alt={character.name || 'Character portrait'}
                            fill
                            sizes="220px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
                            <Sparkles className="h-4 w-4" />
                            No image yet
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          id={`upload-${character.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={event => {
                            const file = event.target.files?.[0] || null
                            void handleUploadCharacterImage(character.id, file)
                            // reset input so the same file can be uploaded again if needed
                            event.target.value = ''
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const element = document.getElementById(`upload-${character.id}`) as HTMLInputElement | null
                            element?.click()
                          }}
                          disabled={ui.isUploading}
                          className="w-full border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                        >
                          {ui.isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading…
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload image
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor={`name-${character.id}`} className="text-xs font-semibold text-neutral-300">
                            Character name
                          </Label>
                          <Input
                            id={`name-${character.id}`}
                            value={form.name}
                            onChange={event => handleCharacterFieldChange(character.id, 'name', event.target.value)}
                            className="mt-1 bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500"
                            placeholder="Character name"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`description-${character.id}`} className="text-xs font-semibold text-neutral-300">
                            Story role & notes
                          </Label>
                          <Textarea
                            id={`description-${character.id}`}
                            value={form.description}
                            onChange={event => handleCharacterFieldChange(character.id, 'description', event.target.value)}
                            rows={3}
                            className="mt-1 bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500"
                            placeholder="Who is this character? Summarise their role and personality."
                          />
                          {suggestion?.role && (
                            <p className="mt-1 text-[11px] text-neutral-500">
                              Detected role: {suggestion.role}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor={`prompt-${character.id}`} className="text-xs font-semibold text-neutral-300">
                            Visual prompt & styling cues
                          </Label>
                          <Textarea
                            id={`prompt-${character.id}`}
                            value={form.editPrompt}
                            onChange={event => handleCharacterFieldChange(character.id, 'editPrompt', event.target.value)}
                            rows={3}
                            className="mt-1 bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500"
                            placeholder="Describe clothing, lighting, era, mood, and other visual traits."
                          />
                          {suggestion?.visualTraits && !form.editPrompt && (
                            <p className="mt-1 text-[11px] text-neutral-500">
                              Suggested: {suggestion.visualTraits}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => handleSaveCharacter(character.id)}
                          disabled={ui.isSaving}
                          className="bg-white hover:bg-neutral-200 text-black"
                        >
                          {ui.isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save details
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleGenerateCharacterImage(character.id)}
                          disabled={ui.isGenerating}
                          className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                        >
                          {ui.isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate AI image
                            </>
                          )}
                        </Button>
                      </div>

                      {ui.message && <p className="text-sm text-emerald-400">{ui.message}</p>}
                      {ui.error && <p className="text-sm text-red-400">{ui.error}</p>}
                    </div>
                  </div>
                </Card>
              )
            })}

            {characters.length === 0 && !isDetectingCharacters && (
              <Card className="bg-neutral-900 border-neutral-800 p-6 text-sm text-neutral-300">
                <p>No characters detected yet. You can retry detection or proceed to the storyboard and add characters later.</p>
              </Card>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="w-full bg-black border-b-2 border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-neutral-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <img src="/blooma.svg" alt="Blooma Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold">Storyboard Wizard</span>
          </div>
        </div>
      </header>

      <div className="w-full bg-neutral-900 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-300">
              Step {currentStep} of {questions.length}
            </span>
            <span className="text-sm text-neutral-300">
              {Math.round((currentStep / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card className="bg-neutral-900 border-neutral-800 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{currentQuestion.question}</h1>
            <p className="text-neutral-400">
              Please provide your answer below. This will help us generate the perfect storyboard for you.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="answer" className="text-lg font-medium text-white mb-3 block">
                Your Answer
              </Label>
              <Textarea
                id="answer"
                value={answers[currentQuestion.id as keyof WizardAnswers]}
                onChange={event => handleAnswerChange(currentQuestion.id as keyof WizardAnswers, event.target.value)}
                placeholder={currentQuestion.placeholder}
                className="min-h-[120px] bg-neutral-800 border-neutral-700 text-white placeholder-neutral-400 focus:ring-2 focus:ring-white focus:border-white"
                rows={4}
              />
            </div>

            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleGenerateScript}
                  disabled={!canProceed || isGenerating}
                  className="bg-white hover:bg-neutral-200 text-black font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Script...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Script
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="bg-white hover:bg-neutral-200 text-black"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {currentStep > 1 && (
          <Card className="bg-neutral-900 border-neutral-800 p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-white">Your Answers So Far</h3>
            <div className="space-y-3">
              {questions.slice(0, currentStep - 1).map((question, index) => (
                <div key={question.id} className="text-sm">
                  <span className="text-neutral-400 font-medium">
                    Q{index + 1}: {question.question}
                  </span>
                  <p className="text-white mt-1">{answers[question.id as keyof WizardAnswers]}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
