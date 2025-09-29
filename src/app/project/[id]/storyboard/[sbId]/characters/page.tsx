'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase, type SupabaseCharacter } from '@/lib/supabase'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { getImageGenerationModels } from '@/lib/fal-ai'

type CharacterFormState = {
  name: string
  description: string
  editPrompt: string
}

const EMPTY_FORM: CharacterFormState = {
  name: '',
  description: '',
  editPrompt: '',
}

type CharacterChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content?: string
  imageUrl?: string
  status?: 'loading' | 'error'
  error?: string
  prompt?: string
}

const ALLOWED_CHARACTER_MODEL_IDS = [
  'fal-ai/flux-pro/kontext/text-to-image',
  'fal-ai/flux-pro/v1.1-ultra',
  'fal-ai/bytedance/seedream/v4/text-to-image',
] as const

const CHARACTER_IMAGE_STYLE =
  'full-body portrait, white background, neutral pose facing forward, clean even lighting'

const ensureCharacterStyle = (prompt: string) => {
  const trimmed = (prompt || '').trim()
  const styleLower = CHARACTER_IMAGE_STYLE.toLowerCase()
  const promptLower = trimmed.toLowerCase()
  if (trimmed && styleLower.split(',').every(part => promptLower.includes(part.trim()))) {
    return trimmed
  }
  const base = trimmed.replace(/[.,;]+$/, '')
  return base ? `${base}, ${CHARACTER_IMAGE_STYLE}` : CHARACTER_IMAGE_STYLE
}

type DetectedCharacterSuggestion = {
  tempId: string
  name: string
  role: string
  description: string
  visualTraits: string
}

type CharacterDetectionResult = {
  id?: string
  name?: string
  role?: string
  description?: string
  visualTraits?: string
}

export default function ProjectCharactersPage() {
  const params = useParams() as { id: string; sbId: string }
  const router = useRouter()
  const { user, session } = useSupabase()

  const projectId = params?.id

  const [characters, setCharacters] = useState<SupabaseCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<SupabaseCharacter | null>(null)
  const [formState, setFormState] = useState<CharacterFormState>(EMPTY_FORM)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [imageChatCharacter, setImageChatCharacter] = useState<SupabaseCharacter | null>(null)
  const [chatMessages, setChatMessages] = useState<CharacterChatMessage[]>([])
  const [chatPrompt, setChatPrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isApplyingImageId, setIsApplyingImageId] = useState<string | null>(null)
  const [detectedCharacters, setDetectedCharacters] = useState<DetectedCharacterSuggestion[]>([])
  const [isDetectingCharacters, setIsDetectingCharacters] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null)
  const [detectionError, setDetectionError] = useState<string | null>(null)
  const detectionUploadsRef = useRef<Map<string, File>>(new Map())
  const detectionPreviewsRef = useRef<Record<string, string>>({})
  const [detectionPreviewsState, setDetectionPreviewsState] = useState<Record<string, string>>({})
  const setDetectionPreviews = useCallback(
    (updater: (prev: Record<string, string>) => Record<string, string>) => {
      setDetectionPreviewsState(prev => {
        const next = updater(prev)
        detectionPreviewsRef.current = next
        return next
      })
    },
    []
  )
  const detectionPreviews = detectionPreviewsState
  const [creatingCharacterId, setCreatingCharacterId] = useState<string | null>(null)
  const [detectionActionErrors, setDetectionActionErrors] = useState<Record<string, string>>({})
  const manualUploadInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingCustomImage, setIsUploadingCustomImage] = useState(false)
  const [isManualCreateOpen, setIsManualCreateOpen] = useState(false)
  const [manualFormState, setManualFormState] = useState<CharacterFormState>(EMPTY_FORM)
  const [manualCreateError, setManualCreateError] = useState<string | null>(null)
  const [isCreatingManualCharacter, setIsCreatingManualCharacter] = useState(false)
  const manualCreateFileInputRef = useRef<HTMLInputElement | null>(null)
  const [manualImageFile, setManualImageFile] = useState<File | null>(null)
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(null)
  const manualImagePreviewRef = useRef<string | null>(null)

  const createObjectUrl = useCallback((file: File) => {
    if (
      typeof window !== 'undefined' &&
      typeof window.URL !== 'undefined' &&
      typeof window.URL.createObjectURL === 'function'
    ) {
      return window.URL.createObjectURL(file)
    }
    return ''
  }, [])

  const revokeObjectUrl = useCallback((url: string) => {
    if (!url) return
    if (
      typeof window !== 'undefined' &&
      typeof window.URL !== 'undefined' &&
      typeof window.URL.revokeObjectURL === 'function'
    ) {
      window.URL.revokeObjectURL(url)
    }
  }, [])
  const characterModels = useMemo(
    () =>
      getImageGenerationModels().filter(model =>
        ALLOWED_CHARACTER_MODEL_IDS.includes(model.id as (typeof ALLOWED_CHARACTER_MODEL_IDS)[number])
      ),
    []
  )
  const fallbackModelId = characterModels[0]?.id || 'fal-ai/flux-pro/kontext/text-to-image'
  const [chatModelId, setChatModelId] = useState<string>(fallbackModelId)

  const hasCharacters = characters.length > 0
  const manualFormHasName = manualFormState.name.trim().length > 0

  useEffect(() => {
    return () => {
      Object.values(detectionPreviewsRef.current).forEach(revokeObjectUrl)
      if (manualImagePreviewRef.current) {
        revokeObjectUrl(manualImagePreviewRef.current)
        manualImagePreviewRef.current = null
      }
    }
  }, [revokeObjectUrl])

  const createId = useCallback(
    () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    []
  )

  const loadCharacters = useCallback(async () => {
    if (!user?.id || !projectId) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[CharactersPage] Failed to load characters:', fetchError)
      setError('Failed to load characters. Please try again.')
    } else {
      setCharacters(data ?? [])
      if (data && data.length > 0) {
        setSelectedCharacter(data[0])
        setFormState({
          name: data[0].name ?? '',
          description: data[0].description ?? '',
          editPrompt: data[0].edit_prompt ?? '',
        })
      } else {
        setSelectedCharacter(null)
        setFormState(EMPTY_FORM)
      }
    }

    setLoading(false)
  }, [projectId, user?.id])

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  useEffect(() => {
    if (!chatModelId && characterModels.length > 0) {
      setChatModelId(characterModels[0].id)
    }
  }, [characterModels, chatModelId])

  const handleSelectCharacter = (character: SupabaseCharacter) => {
    setSelectedCharacter(character)
    setFormState({
      name: character.name ?? '',
      description: character.description ?? '',
      editPrompt: character.edit_prompt ?? '',
    })
  }

  const handleFieldChange = <K extends keyof CharacterFormState>(field: K, value: CharacterFormState[K]) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  const handleManualFieldChange = <K extends keyof CharacterFormState>(field: K, value: CharacterFormState[K]) => {
    setManualFormState(prev => ({ ...prev, [field]: value }))
  }

  const resetManualCreateState = useCallback(() => {
    setManualFormState(EMPTY_FORM)
    setManualCreateError(null)
    setManualImageFile(null)
    setIsCreatingManualCharacter(false)
    if (manualImagePreviewRef.current) {
      revokeObjectUrl(manualImagePreviewRef.current)
      manualImagePreviewRef.current = null
    }
    setManualImagePreview(null)
  }, [revokeObjectUrl])

  const handleOpenManualCreate = useCallback(() => {
    resetManualCreateState()
    setIsManualCreateOpen(true)
  }, [resetManualCreateState])

  const handleCloseManualCreate = useCallback(() => {
    resetManualCreateState()
    setIsManualCreateOpen(false)
  }, [resetManualCreateState])

  const handleManualImageSelection = useCallback(
    (file: File | null) => {
      setManualImageFile(file)
      setManualCreateError(null)
      let createdPreview: string | null = null
      setManualImagePreview(prev => {
        if (prev) revokeObjectUrl(prev)
        if (!file) return null
        createdPreview = createObjectUrl(file) || null
        return createdPreview
      })
      manualImagePreviewRef.current = createdPreview
    },
    [createObjectUrl, revokeObjectUrl]
  )

  const handleManualFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null
      handleManualImageSelection(file)
      event.target.value = ''
    },
    [handleManualImageSelection]
  )

  const handleOpenImageModal = useCallback(() => {
    if (!selectedCharacter) return
    if (!chatModelId) {
      setChatModelId(fallbackModelId)
    }
    setImageChatCharacter(selectedCharacter)
    setChatMessages([
      {
        id: createId(),
        role: 'assistant',
        content:
          'Describe how you want this character to look. I will generate new portraits for you to choose from.',
      },
    ])
    setChatPrompt('')
    setIsImageModalOpen(true)
  }, [chatModelId, createId, fallbackModelId, selectedCharacter])

  const handleCloseImageModal = useCallback(() => {
    setIsImageModalOpen(false)
    setImageChatCharacter(null)
    setChatMessages([])
    setChatPrompt('')
    setIsGeneratingImage(false)
    setIsApplyingImageId(null)
  }, [])

  type CardRow = {
    id: string
    scene_number: number | null
    order_index: number | null
    shot_description: string | null
    dialogue: string | null
    sound: string | null
    content: string | null
    title: string | null
  }

  const compileScriptFromCards = useCallback((rows: CardRow[]) => {
    if (!rows.length) return ''

    return rows
      .map((card, index) => {
        const sceneNumber = card.scene_number ?? index + 1
        const description = (card.shot_description || card.content || '').trim()
        const dialogue = (card.dialogue || '').trim()
        const sound = (card.sound || '').trim()
        const lines = [`Scene ${sceneNumber}${card.title ? `: ${card.title}` : ''}`]
        if (description) lines.push(`Shot Description: ${description}`)
        if (dialogue) lines.push(`Dialogue: ${dialogue}`)
        if (sound) lines.push(`Sound: ${sound}`)
        return lines.join('\n')
      })
      .join('\n\n')
  }, [])

  const handleDetectCharacters = useCallback(async () => {
    if (!projectId || !user?.id) {
      setDetectionError('Missing project or user information.')
      return
    }

    setIsDetectingCharacters(true)
    setDetectionStatus(null)
    setDetectionError(null)
    setDetectedCharacters([])

    try {
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('id, scene_number, order_index, shot_description, dialogue, sound, content, title')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })

      if (cardsError) {
        throw new Error(cardsError.message || 'Failed to load project scenes.')
      }

      const script = compileScriptFromCards((cards || []) as CardRow[])
      if (!script.trim()) {
        throw new Error('No storyboard scenes available to analyze.')
      }

      const response = await fetch('/api/characters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          model: 'auto',
          prompt: 'Extract the main characters along with concise visual notes for reference images.',
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !Array.isArray(payload?.characters)) {
        throw new Error(payload?.error || 'Character detection failed.')
      }

      if (payload.characters.length === 0) {
        setDetectionStatus('No characters detected from the current storyboard scenes.')
        setDetectedCharacters([])
        return
      }

      const rawCharacters = payload.characters as CharacterDetectionResult[]
      const suggestions: DetectedCharacterSuggestion[] = rawCharacters.map(entry => ({
        tempId: createId(),
        name: typeof entry?.name === 'string' ? entry.name : 'Unnamed character',
        role: typeof entry?.role === 'string' ? entry.role : '',
        description: typeof entry?.description === 'string' ? entry.description : '',
        visualTraits: typeof entry?.visualTraits === 'string' ? entry.visualTraits : '',
      }))

      setDetectedCharacters(suggestions)
      setDetectionStatus(`Detected ${suggestions.length} character${suggestions.length === 1 ? '' : 's'} from the script.`)
    } catch (err) {
      console.error('[CharactersPage] Character detection failed:', err)
      setDetectionError(err instanceof Error ? err.message : 'Failed to detect characters.')
    } finally {
      setIsDetectingCharacters(false)
    }
  }, [compileScriptFromCards, createId, projectId, user?.id])

  const handleDetectionFileChange = useCallback(
    (tempId: string, file: File | null) => {
      setDetectionActionErrors(prev => {
        if (!prev[tempId]) return prev
        const next = { ...prev }
        delete next[tempId]
        return next
      })

      const uploads = detectionUploadsRef.current

      if (!file) {
        uploads.delete(tempId)
        setDetectionPreviews(prev => {
          if (!prev[tempId]) return prev
          const next = { ...prev }
          revokeObjectUrl(next[tempId])
          delete next[tempId]
          return next
        })
        return
      }

      uploads.set(tempId, file)

      const previewUrl = createObjectUrl(file)
      if (previewUrl) {
        setDetectionPreviews(prev => {
          const next = { ...prev }
          const existing = next[tempId]
          if (existing) revokeObjectUrl(existing)
          next[tempId] = previewUrl
          return next
        })
      }
    },
    [createObjectUrl, revokeObjectUrl, setDetectionPreviews]
  )

  const handleDismissDetectedCharacter = useCallback(
    (tempId: string) => {
      setDetectedCharacters(prev => prev.filter(character => character.tempId !== tempId))
      detectionUploadsRef.current.delete(tempId)
      setDetectionActionErrors(prev => {
        if (!prev[tempId]) return prev
        const next = { ...prev }
        delete next[tempId]
        return next
      })
      setDetectionPreviews(prev => {
        if (!prev[tempId]) return prev
        const next = { ...prev }
        revokeObjectUrl(next[tempId])
        delete next[tempId]
        return next
      })
    },
    [revokeObjectUrl, setDetectionPreviews]
  )

  const handleCreateDetectedCharacter = useCallback(
    async (suggestion: DetectedCharacterSuggestion) => {
      if (!user?.id || !projectId) {
        setDetectionActionErrors(prev => ({ ...prev, [suggestion.tempId]: 'Missing project or user information.' }))
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const descriptionParts = [suggestion.role, suggestion.description]
        .map(part => (part || '').trim())
        .filter(Boolean)
      const description = descriptionParts.join(' — ')
      const promptPieces = [`portrait of ${suggestion.name}`]
      if (suggestion.visualTraits) {
        promptPieces.push(suggestion.visualTraits)
      }
      const editPrompt = ensureCharacterStyle(promptPieces.join(', '))

      setCreatingCharacterId(suggestion.tempId)
      setDetectionActionErrors(prev => {
        if (!prev[suggestion.tempId]) return prev
        const next = { ...prev }
        delete next[suggestion.tempId]
        return next
      })

      try {
        const createResponse = await fetch('/api/characters', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: user.id,
            project_id: projectId,
            name: suggestion.name,
            description: description || null,
            edit_prompt: editPrompt || null,
          }),
        })

        const createPayload = await createResponse.json().catch(() => ({}))

        if (!createResponse.ok || !createPayload?.character) {
          throw new Error(createPayload?.error || 'Failed to create character.')
        }

        let latestCharacter: SupabaseCharacter = createPayload.character as SupabaseCharacter

        const file = detectionUploadsRef.current.get(suggestion.tempId) || null
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('characterId', latestCharacter.id)
          formData.append('projectId', projectId)
          formData.append('characterName', suggestion.name)
          formData.append('editPrompt', editPrompt)
          formData.append('userId', user.id)
          formData.append('isUpdate', 'true')

          const uploadResponse = await fetch('/api/characters/upload-image', {
            method: 'POST',
            body: formData,
          })

          const uploadPayload = await uploadResponse.json().catch(() => ({}))

          if (!uploadResponse.ok || !uploadPayload?.success) {
            throw new Error(uploadPayload?.error || 'Failed to upload character image.')
          }

          const imageUrl: string | undefined = uploadPayload.publicUrl || uploadPayload.signedUrl || undefined
          const imageKey: string | undefined = uploadPayload.key
          const imageSize: number | undefined = uploadPayload.size

          if (uploadPayload.character) {
            latestCharacter = uploadPayload.character as SupabaseCharacter
          } else if (imageUrl) {
            latestCharacter = {
              ...latestCharacter,
              image_url: imageUrl,
              image_key: imageKey ?? (latestCharacter.image_key ?? undefined),
              image_size: imageSize ?? (latestCharacter.image_size ?? undefined),
            }
          }

          if (imageUrl) {
            const updateHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
            if (session?.access_token) {
              updateHeaders['Authorization'] = `Bearer ${session.access_token}`
            }

            const updateBody: Record<string, unknown> = {
              id: latestCharacter.id,
              original_image_url: imageUrl,
            }
            if (imageKey) updateBody.original_image_key = imageKey
            if (imageSize) updateBody.original_image_size = imageSize
            if (!latestCharacter.image_url) updateBody.image_url = imageUrl

            const updateResponse = await fetch('/api/characters', {
              method: 'PUT',
              headers: updateHeaders,
              body: JSON.stringify(updateBody),
            })

            const updatePayload = await updateResponse.json().catch(() => ({}))

            if (!updateResponse.ok) {
              throw new Error(updatePayload?.error || 'Failed to save uploaded photo.')
            }

            if (updatePayload?.character) {
              latestCharacter = updatePayload.character as SupabaseCharacter
            } else {
              latestCharacter = {
                ...latestCharacter,
                original_image_url: imageUrl,
                original_image_key: imageKey ?? (latestCharacter.original_image_key ?? undefined),
                original_image_size: imageSize ?? (latestCharacter.original_image_size ?? undefined),
              }
            }
          }
        }

        setCharacters(prev => {
          const filtered = prev.filter(char => char.id !== latestCharacter.id)
          return [latestCharacter, ...filtered]
        })
        setSelectedCharacter(latestCharacter)
        setFormState({
          name: latestCharacter.name ?? '',
          description: latestCharacter.description ?? '',
          editPrompt: latestCharacter.edit_prompt ?? '',
        })

        setDetectedCharacters(prev => prev.filter(character => character.tempId !== suggestion.tempId))
        detectionUploadsRef.current.delete(suggestion.tempId)
        setDetectionPreviews(prev => {
          if (!prev[suggestion.tempId]) return prev
          const next = { ...prev }
          revokeObjectUrl(next[suggestion.tempId])
          delete next[suggestion.tempId]
          return next
        })
        setDetectionStatus(`${suggestion.name} added to your character list.`)
        setDetectionError(null)
      } catch (err) {
        console.error('[CharactersPage] Failed to add detected character:', err)
        setDetectionActionErrors(prev => ({
          ...prev,
          [suggestion.tempId]: err instanceof Error ? err.message : 'Failed to add character.',
        }))
      } finally {
        setCreatingCharacterId(null)
      }
    },
    [projectId, revokeObjectUrl, session?.access_token, setDetectionPreviews, user?.id]
  )

  const handleUploadCustomImage = useCallback(
    async (file: File) => {
      if (!selectedCharacter) {
        setError('Choose a character before uploading an image.')
        return
      }

      if (!projectId || !user?.id) {
        setError('Missing project context for image upload.')
        return
      }

      setIsUploadingCustomImage(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('characterId', selectedCharacter.id)
        formData.append('projectId', projectId)
        formData.append('characterName', selectedCharacter.name || 'Character')
        formData.append('editPrompt', formState.editPrompt || '')
        formData.append('userId', user.id)
        formData.append('isUpdate', 'true')

        const uploadResponse = await fetch('/api/characters/upload-image', {
          method: 'POST',
          body: formData,
        })

        const uploadPayload = await uploadResponse.json().catch(() => ({}))

        if (!uploadResponse.ok || !uploadPayload?.success) {
          throw new Error(uploadPayload?.error || 'Image upload failed.')
        }

        const imageUrl: string | undefined = uploadPayload.publicUrl || uploadPayload.signedUrl || undefined
        const imageKey: string | undefined = uploadPayload.key
        const imageSize: number | undefined = uploadPayload.size

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }

        const updateBody: Record<string, unknown> = {
          id: selectedCharacter.id,
        }
        if (imageUrl) {
          updateBody.image_url = imageUrl
          updateBody.original_image_url = imageUrl
        }
        if (imageKey) updateBody.original_image_key = imageKey
        if (imageSize) updateBody.original_image_size = imageSize

        const updateResponse = await fetch('/api/characters', {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateBody),
        })

        const updatePayload = await updateResponse.json().catch(() => ({}))

        if (!updateResponse.ok || !updatePayload?.character) {
          throw new Error(updatePayload?.error || 'Failed to save uploaded image.')
        }

        const updatedCharacter: SupabaseCharacter = updatePayload.character as SupabaseCharacter

        setCharacters(prev => prev.map(char => (char.id === updatedCharacter.id ? updatedCharacter : char)))
        setSelectedCharacter(updatedCharacter)
        setFormState({
          name: updatedCharacter.name ?? '',
          description: updatedCharacter.description ?? '',
          editPrompt: updatedCharacter.edit_prompt ?? '',
        })
      } catch (err) {
        console.error('[CharactersPage] Failed to upload custom character image:', err)
        setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.')
      } finally {
        setIsUploadingCustomImage(false)
      }
    },
    [formState.editPrompt, projectId, selectedCharacter, session?.access_token, user?.id]
  )

  const handleManualUploadChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        void handleUploadCustomImage(file)
      }
      event.target.value = ''
    },
    [handleUploadCustomImage]
  )

  const handleGenerateFromPrompt = useCallback(async () => {
    if (!imageChatCharacter) return
    const input = chatPrompt.trim()
    if (!input || isGeneratingImage) return

    const userMessage: CharacterChatMessage = {
      id: createId(),
      role: 'user',
      content: input,
    }
    const pendingId = createId()
    const loadingMessage: CharacterChatMessage = {
      id: pendingId,
      role: 'assistant',
      status: 'loading',
      prompt: input,
    }

    setChatMessages(prev => [...prev, userMessage, loadingMessage])
    setChatPrompt('')
    setIsGeneratingImage(true)

    try {
      const styledPrompt = ensureCharacterStyle(input)
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: styledPrompt,
          aspectRatio: '3:4',
          quality: 'balanced',
          modelId: chatModelId || fallbackModelId,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.imageUrl) {
        throw new Error(data?.error || 'Image generation failed')
      }

      setChatMessages(prev =>
        prev.map(message =>
          message.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                imageUrl: data.imageUrl as string,
                prompt: styledPrompt,
              }
            : message
        )
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image generation failed'
      setChatMessages(prev =>
        prev.map(message =>
          message.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                status: 'error',
                error: errorMessage,
                prompt: ensureCharacterStyle(input),
              }
            : message
        )
      )
    } finally {
      setIsGeneratingImage(false)
    }
  }, [chatPrompt, chatModelId, createId, fallbackModelId, imageChatCharacter, isGeneratingImage])

  const handleApplyGeneratedImage = useCallback(
    async (imageUrl: string, prompt?: string) => {
      if (!imageChatCharacter || !projectId || !user?.id) return

      setIsApplyingImageId(imageUrl)
      try {
        const response = await fetch('/api/characters/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
          },
          body: JSON.stringify({
            characterId: imageChatCharacter.id,
            imageUrl,
            projectId,
            characterName: imageChatCharacter.name,
            editPrompt: prompt,
            userId: user.id,
            isUpdate: true,
          }),
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to save character image')
        }

        if (payload.character) {
          setCharacters(prev =>
            prev.map(char => (char.id === payload.character.id ? payload.character : char))
          )
          setSelectedCharacter(prev =>
            prev && prev.id === payload.character.id ? payload.character : prev
          )
          setImageChatCharacter(payload.character)
          setFormState(prev => ({
            name: payload.character.name ?? prev.name ?? '',
            description: payload.character.description ?? prev.description ?? '',
            editPrompt: payload.character.edit_prompt ?? prev.editPrompt,
          }))
        } else {
          await loadCharacters()
        }

        handleCloseImageModal()
      } catch (err) {
        setChatMessages(prev => [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to save character image',
          },
        ])
      } finally {
        setIsApplyingImageId(null)
      }
    },
    [createId, handleCloseImageModal, imageChatCharacter, loadCharacters, projectId, session?.access_token, user?.id]
  )

  const handleSave = useCallback(async () => {
    if (!selectedCharacter) return
    const name = formState.name.trim()
    if (!name) {
      setError('Character name is required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/characters', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          id: selectedCharacter.id,
          name,
          description: formState.description.trim() || null,
          edit_prompt: formState.editPrompt.trim() || null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to save character')
      }

      const payload = (await response.json().catch(() => ({}))) as { character?: SupabaseCharacter }
      const updated = payload?.character

      if (updated) {
        setCharacters(prev => prev.map(char => (char.id === updated.id ? updated : char)))
        setSelectedCharacter(updated)
        setFormState({
          name: updated.name ?? '',
          description: updated.description ?? '',
          editPrompt: updated.edit_prompt ?? '',
        })
      } else {
        await loadCharacters()
      }
    } catch (err) {
      console.error('[CharactersPage] Failed to save character:', err)
      setError(err instanceof Error ? err.message : 'Failed to save character')
    } finally {
      setSaving(false)
    }
  }, [formState.description, formState.editPrompt, formState.name, loadCharacters, selectedCharacter, session?.access_token])

  const handleSubmitManualCreate = useCallback(async () => {
    if (!user?.id || !projectId) {
      setManualCreateError('Missing project or user information.')
      return
    }

    const name = manualFormState.name.trim()
    if (!name) {
      setManualCreateError('Character name is required.')
      return
    }

    const styledManualPrompt = manualFormState.editPrompt.trim()
    const normalizedManualPrompt = styledManualPrompt
      ? ensureCharacterStyle(styledManualPrompt)
      : null

    setIsCreatingManualCharacter(true)
    setManualCreateError(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/characters', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: user.id,
          project_id: projectId,
          name,
          description: manualFormState.description.trim() || null,
          edit_prompt: normalizedManualPrompt,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.character) {
        throw new Error(payload?.error || 'Failed to create character.')
      }

      let createdCharacter = payload.character as SupabaseCharacter

      if (manualImageFile) {
        const formData = new FormData()
        formData.append('file', manualImageFile)
        formData.append('characterId', createdCharacter.id)
        formData.append('projectId', projectId)
        formData.append('characterName', name)
        formData.append('editPrompt', normalizedManualPrompt || '')
        formData.append('userId', user.id)
        formData.append('isUpdate', 'true')

        const uploadResponse = await fetch('/api/characters/upload-image', {
          method: 'POST',
          body: formData,
        })

        const uploadPayload = await uploadResponse.json().catch(() => ({}))

        if (!uploadResponse.ok || !uploadPayload?.success) {
          throw new Error(uploadPayload?.error || 'Failed to upload character image.')
        }

        const imageUrl: string | undefined = uploadPayload.publicUrl || uploadPayload.signedUrl || undefined
        const imageKey: string | undefined = uploadPayload.key
        const imageSize: number | undefined = uploadPayload.size

        if (uploadPayload.character) {
          createdCharacter = uploadPayload.character as SupabaseCharacter
        } else if (imageUrl) {
          const updateHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
          if (session?.access_token) {
            updateHeaders['Authorization'] = `Bearer ${session.access_token}`
          }

          const updateBody: Record<string, unknown> = {
            id: createdCharacter.id,
            original_image_url: imageUrl,
          }
          if (imageKey) updateBody.original_image_key = imageKey
          if (imageSize) updateBody.original_image_size = imageSize
          if (!createdCharacter.image_url) updateBody.image_url = imageUrl

          const updateResponse = await fetch('/api/characters', {
            method: 'PUT',
            headers: updateHeaders,
            body: JSON.stringify(updateBody),
          })

          const updatePayload = await updateResponse.json().catch(() => ({}))

          if (!updateResponse.ok) {
            throw new Error(updatePayload?.error || 'Failed to save uploaded image.')
          }

          if (updatePayload?.character) {
            createdCharacter = updatePayload.character as SupabaseCharacter
          } else {
            createdCharacter = {
              ...createdCharacter,
              original_image_url: imageUrl,
              original_image_key: imageKey ?? (createdCharacter.original_image_key ?? undefined),
              original_image_size: imageSize ?? (createdCharacter.original_image_size ?? undefined),
              image_url: imageUrl,
              image_key: imageKey ?? (createdCharacter.image_key ?? undefined),
              image_size: imageSize ?? (createdCharacter.image_size ?? undefined),
            }
          }
        }
      }

      setCharacters(prev => [createdCharacter, ...prev])
      setSelectedCharacter(createdCharacter)
      setFormState({
        name: createdCharacter.name ?? '',
        description: createdCharacter.description ?? '',
        editPrompt: createdCharacter.edit_prompt ?? normalizedManualPrompt ?? '',
      })

      handleCloseManualCreate()
    } catch (err) {
      console.error('[CharactersPage] Failed to manually create character:', err)
      setManualCreateError(err instanceof Error ? err.message : 'Failed to create character.')
    } finally {
      setIsCreatingManualCharacter(false)
    }
  }, [handleCloseManualCreate, manualFormState.description, manualFormState.editPrompt, manualFormState.name, manualImageFile, projectId, session?.access_token, user?.id])

  const selectedImage = useMemo(() => {
    if (!selectedCharacter) return null
    return selectedCharacter.image_url || selectedCharacter.original_image_url || null
  }, [selectedCharacter])

  const listScrollStyle = useMemo(() => ({ scrollbarWidth: 'thin' } as CSSProperties), [])

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Characters</h1>
            <p className="text-sm text-neutral-400">
              Review and update the character references used throughout this storyboard project.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={handleOpenManualCreate}
              className="px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-100 text-sm transition-colors hover:border-neutral-500 hover:text-white"
            >
              Add character
            </button>
            <button
              type="button"
              onClick={() => router.push(`/project/${projectId}/storyboard/${params?.sbId}`)}
              className="px-3 py-1.5 rounded border border-neutral-700 text-neutral-200 text-sm hover:border-neutral-500 hover:text-white transition-colors"
            >
              Back to storyboard
            </button>
          </div>
        </header>

        {(detectionStatus || detectionError || detectedCharacters.length > 0) && (
          <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex flex-col gap-2">
              {detectionStatus && (
                <div className="rounded border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">
                  {detectionStatus}
                </div>
              )}
              {detectionError && (
                <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {detectionError}
                </div>
              )}
            </div>

            {detectedCharacters.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold text-white">Detected characters</h2>
                  <p className="text-xs text-neutral-500">
                    Review the suggestions, optionally upload your own reference photo, then add them to your character library.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detectedCharacters.map(character => {
                    const previewUrl = detectionPreviews[character.tempId]
                    return (
                      <div
                        key={character.tempId}
                        className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3 text-sm text-neutral-200 space-y-3"
                      >
                        <div className="space-y-1">
                          <p className="text-base font-medium text-white">{character.name}</p>
                          {character.role && (
                            <p className="text-xs text-neutral-400">Role: {character.role}</p>
                          )}
                          {character.description && (
                            <p className="text-xs text-neutral-400">{character.description}</p>
                          )}
                          {character.visualTraits && (
                            <p className="text-xs text-neutral-500">Visual notes: {character.visualTraits}</p>
                          )}
                        </div>

                        {previewUrl && (
                          <div className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
                            <img
                              src={previewUrl}
                              alt={`Preview upload for ${character.name}`}
                              className="h-40 w-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex items-center justify-center rounded border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-100 cursor-pointer hover:border-neutral-500 hover:text-white transition-colors">
                            {previewUrl ? 'Replace photo' : 'Upload photo'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={event => {
                                const file = event.target.files?.[0] || null
                                handleDetectionFileChange(character.tempId, file)
                                event.target.value = ''
                              }}
                            />
                          </label>
                          {previewUrl && (
                            <button
                              type="button"
                              onClick={() => handleDetectionFileChange(character.tempId, null)}
                              className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
                            >
                              Remove photo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDismissDetectedCharacter(character.tempId)}
                            className="rounded border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>

                        {!previewUrl && (
                          <p className="text-[11px] text-neutral-500">
                            Optional: upload your own photo before saving.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCreateDetectedCharacter(character)}
                          disabled={creatingCharacterId === character.tempId}
                          className="w-full rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {creatingCharacterId === character.tempId ? 'Adding…' : 'Add character'}
                        </button>

                        {detectionActionErrors[character.tempId] && (
                          <p className="text-xs text-red-400">
                            {detectionActionErrors[character.tempId]}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-neutral-300 text-sm">
              <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
              Loading characters…
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,320px)_1fr] lg:h-[calc(100vh-220px)] lg:items-start lg:overflow-hidden">
            <section className="flex h-full flex-col space-y-4 lg:min-h-0">
              {error && (
                <div className="px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {!hasCharacters && (
                <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/60 p-6 text-center text-sm text-neutral-300">
                  <p className="mb-3 font-medium text-neutral-200">No characters saved yet</p>
                  <p className="text-neutral-400">
                    Use the project setup flow to generate character portraits and prompt notes.
                  </p>
                </div>
              )}

              <div className="grid grow gap-3 overflow-y-auto pr-1 min-h-0" style={listScrollStyle}>
                {characters.map(character => {
                  const imageUrl = character.image_url || character.original_image_url || null
                  const isSelected = selectedCharacter?.id === character.id
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => handleSelectCharacter(character)}
                      className={`group rounded-xl border text-left transition-colors ${
                        isSelected ? 'border-white/80 bg-neutral-900/70' : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-600'
                      }`}
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-neutral-900">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={character.name || 'Character portrait'}
                            fill
                            sizes="240px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-1">
                        <p className="text-sm font-medium text-white line-clamp-1">
                          {character.name || 'Unnamed character'}
                        </p>
                        {character.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2">{character.description}</p>
                        )}
                        {character.edit_prompt && (
                          <p className="text-[11px] text-neutral-500 line-clamp-2">
                            {character.edit_prompt}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <aside className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5 space-y-5 h-full overflow-y-auto">
              <div>
                <h2 className="text-base font-semibold text-white">Edit character</h2>
                <p className="text-xs text-neutral-400">
                  Click a character to update their name, description, or prompt notes.
                </p>
              </div>

              {selectedCharacter ? (
                <div className="space-y-4">
                  {selectedImage ? (
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-neutral-800">
                      <Image
                        src={selectedImage}
                        alt={selectedCharacter.name || 'Character portrait'}
                        fill
                        sizes="240px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-500">
                      No reference image
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleOpenImageModal}
                      className="w-full sm:w-auto rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
                    >
                      Regenerate image
                    </button>
                    <button
                      type="button"
                      onClick={() => manualUploadInputRef.current?.click()}
                      disabled={isUploadingCustomImage}
                      className="w-full sm:w-auto rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUploadingCustomImage ? 'Uploading…' : 'Upload photo'}
                    </button>
                  </div>
                  <input
                    ref={manualUploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleManualUploadChange}
                  />

                  <label className="block text-xs font-medium text-neutral-300">
                    Name
                    <input
                      value={formState.name}
                      onChange={event => handleFieldChange('name', event.target.value)}
                      className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                      placeholder="Character name"
                    />
                  </label>

                  <label className="block text-xs font-medium text-neutral-300">
                    Description
                    <textarea
                      value={formState.description}
                      onChange={event => handleFieldChange('description', event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                      placeholder="Optional summary of the character"
                    />
                  </label>

                  <label className="block text-xs font-medium text-neutral-300">
                    Prompt notes
                    <textarea
                      value={formState.editPrompt}
                      onChange={event => handleFieldChange('editPrompt', event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                      placeholder="Add reference notes that should be mentioned when prompting"
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectCharacter(selectedCharacter)}
                      className="px-3 py-1.5 rounded border border-neutral-700 text-neutral-200 text-sm hover:border-neutral-500 hover:text-white transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-white text-black text-sm disabled:opacity-60 disabled:pointer-events-none hover:bg-neutral-200 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-neutral-700 bg-neutral-900/60 p-6 text-center text-xs text-neutral-400">
                  Select a character from the list to edit their details.
                </div>
              )}

              <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500">
                Tip: Mention these names or traits in your storyboard prompts to keep characters consistent.
              </div>
            </aside>
          </div>
        )}
      </div>

      {isManualCreateOpen && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="absolute inset-0" onClick={handleCloseManualCreate} />
          <div className="relative z-[901] w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">Add character</h2>
                <p className="text-xs text-neutral-400">Name the character, optionally describe them, and upload your own reference.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseManualCreate}
                className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block">Character name *</label>
                <input
                  value={manualFormState.name}
                  onChange={event => handleManualFieldChange('name', event.target.value)}
                  placeholder="Enter the character's name"
                  className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block">Description</label>
                <textarea
                  value={manualFormState.description}
                  onChange={event => handleManualFieldChange('description', event.target.value)}
                  rows={3}
                  placeholder="Optional summary, role, or personality notes"
                  className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block">Prompt notes</label>
                <textarea
                  value={manualFormState.editPrompt}
                  onChange={event => handleManualFieldChange('editPrompt', event.target.value)}
                  rows={3}
                  placeholder="Reference notes for regeneration prompts"
                  className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-300">Reference image</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                      {manualImagePreview ? (
                        <img src={manualImagePreview} alt="Character preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-neutral-500">
                          No image selected
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-48">
                    <button
                      type="button"
                      onClick={() => manualCreateFileInputRef.current?.click()}
                      className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 transition-colors hover:border-neutral-500 hover:text-white"
                    >
                      {manualImagePreview ? 'Replace image' : 'Upload image'}
                    </button>
                    {manualImagePreview && (
                      <button
                        type="button"
                        onClick={() => handleManualImageSelection(null)}
                        className="w-full rounded border border-neutral-800 px-3 py-2 text-xs text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
                      >
                        Remove image
                      </button>
                    )}
                    <p className="text-[11px] text-neutral-500">
                      JPG or PNG up to 10MB.
                    </p>
                  </div>
                </div>
                <input
                  ref={manualCreateFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleManualFileChange}
                />
              </div>

              {manualCreateError && (
                <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {manualCreateError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseManualCreate}
                  className="rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitManualCreate}
                  disabled={isCreatingManualCharacter || !manualFormHasName}
                  className="rounded bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingManualCharacter ? 'Saving…' : 'Create character'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isImageModalOpen && imageChatCharacter && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="absolute inset-0" onClick={handleCloseImageModal} />
          <div className="relative z-[1001] w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Regenerate image for {imageChatCharacter.name || 'character'}
                </h3>
                <p className="text-xs text-neutral-400">
                  Share the tweaks you want. We will generate fresh portraits so you can pick the best fit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseImageModal}
                className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-4 h-[520px]">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2" style={listScrollStyle}>
                {chatMessages.length === 0 ? (
                  <div className="text-sm text-neutral-400">
                    Start by telling me how you would like this character to look.
                  </div>
                ) : (
                  chatMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-full rounded-lg border px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'border-blue-700/60 bg-blue-900/30 text-blue-100'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-200'
                        }`}
                      >
                        {message.content && <p className="whitespace-pre-wrap text-sm">{message.content}</p>}

                        {message.status === 'loading' && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-transparent" />
                            Generating image…
                          </div>
                        )}

                        {message.status === 'error' && (
                          <p className="mt-2 text-xs text-red-400">{message.error}</p>
                        )}

                        {message.imageUrl && (
                          <div className="mt-3 space-y-3">
                            <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-lg border border-neutral-800">
                              <Image
                                src={message.imageUrl}
                                alt="Generated character option"
                                fill
                                sizes="280px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleApplyGeneratedImage(message.imageUrl as string, message.prompt)}
                                disabled={isApplyingImageId === message.imageUrl}
                                className="rounded bg-white px-3 py-1 text-xs font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isApplyingImageId === message.imageUrl ? 'Updating…' : 'Use this image'}
                              </button>
                              {message.prompt && (
                                <span className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-400">
                                  Prompt: {message.prompt}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={event => {
                  event.preventDefault()
                  handleGenerateFromPrompt()
                }}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="mb-3 flex flex-col gap-1">
                  <span className="text-xs font-medium text-neutral-300">Model</span>
                  <select
                    value={chatModelId}
                    onChange={event => setChatModelId(event.target.value)}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                  >
                    {characterModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name || model.id}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-neutral-500">Choose the image model to steer the look.</p>
                </div>
                <label className="block text-xs font-medium text-neutral-300">
                  Prompt
                  <textarea
                    value={chatPrompt}
                    onChange={event => setChatPrompt(event.target.value)}
                    rows={3}
                    placeholder="Describe the look, pose, outfit, or mood you want."
                    className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
                  />
                </label>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-neutral-500">Use Shift+Enter for a new line.</p>
                  <button
                    type="submit"
                    disabled={isGeneratingImage || !chatPrompt.trim()}
                    className="rounded bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingImage ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
