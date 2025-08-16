'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { GripVertical, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { InitialCardData, Storyboard, Card, Project } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { useUserStore } from '@/store/user'
import { generateImageWithEnhancedPrompt, generateStoryboardImage } from '@/lib/imageGeneration'
import { supabase } from '@/lib/supabase'
// Dropdown components removed with merged layout
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const templates = {
  standard: {
    category: 'marketing',
    name: 'Standard Marketing',
    hasImage: true,
    steps: [
      { key: 'hook', title: 'Hook' },
      { key: 'problem', title: 'Problem' },
      { key: 'solution', title: 'Solution' },
      { key: 'evidence', title: 'Evidence' },
      { key: 'benefit', title: 'Benefit' },
      { key: 'cta', title: 'Call to Action' },
    ],
  },
  pas: {
    category: 'marketing',
    name: 'PAS Framework',
    hasImage: false,
    steps: [
      { key: 'problem', title: 'Problem' },
      { key: 'agitate', title: 'Agitate' },
      { key: 'solution', title: 'Solution' },
    ],
  },
  aida: {
    category: 'marketing',
    name: 'AIDA Framework',
    hasImage: false,
    steps: [
      { key: 'attention', title: 'Attention' },
      { key: 'interest', title: 'Interest' },
      { key: 'desire', title: 'Desire' },
      { key: 'action', title: 'Action' },
    ],
  },
  fab: {
    category: 'marketing',
    name: 'FAB Analysis',
    hasImage: false,
    steps: [
      { key: 'features', title: 'Features' },
      { key: 'advantages', title: 'Advantages' },
      { key: 'benefits', title: 'Benefits' },
    ],
  },
  problemSolution: {
    category: 'marketing',
    name: 'Problem & Solution',
    hasImage: true,
    steps: [
      { key: 'problem', title: 'Problem' },
      { key: 'solution', title: 'Solution' },
      { key: 'benefits', title: 'Benefits' },
    ],
  },
}

const generateStep = (key: string, title: string, hasImage: boolean): Step => ({
  key,
  title,
  hasImage,
  promptLabel: hasImage ? 'Image Prompt' : '',
  promptPlaceholder: hasImage ? 'Enter your prompt here...' : '',
  descLabel: 'Description',
  descPlaceholder: 'Write your Script here...',
})

type Step = {
  key: string
  title: string
  hasImage: boolean
  promptLabel: string
  promptPlaceholder: string
  descLabel: string
  descPlaceholder: string
}

type StepForm = {
  prompt: string
  desc: string
}

type SetupFormProps = {
  id: string
  onSubmit?: (data: { steps: InitialCardData[] }) => void
}

// Removed settings view / frameworks sidebar in merged layout

// Sortable Card Component
interface SortableCardProps {
  step: Step
  index: number
  form: StepForm
  hasImage: boolean
  onStepChange: (index: number, field: keyof StepForm, value: string) => void
  onTitleChange: (index: number, title: string) => void
  onDelete: (index: number) => void
  isGeneratingImage?: boolean
  stepsLength: number
}

function SortableCard({ step, index, form, hasImage, onStepChange, onTitleChange, onDelete, isGeneratingImage, stepsLength }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-1 border-gray-900 rounded-md bg-[#F9F2E7] flex flex-col h-full shadow-[2px_2px_0_0_#000000] ${isDragging ? 'ring-2 ring-gray-900 scale-[1.01] shadow-lg' : ''}`}
    >
  <div className="flex justify-between items-center p-3 gap-2 bg-[#2B6CB0] text-white rounded-t-md">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="h-4 w-4 text-white" />
          </div>
          <input
            value={step.title}
            onChange={e => {
              onTitleChange(index, e.target.value)
            }}
            className="bg-transparent font-bold text-lg outline-none w-full text-white placeholder:text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => onDelete(index)}
          disabled={stepsLength <= 1}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border-1 border-gray-900 text-gray-100 hover:bg-red-500 hover:text-white disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-grow space-y-3 p-4 bg-[#F9F2E7]">
        {hasImage && (
          <div className="w-full">
            <label className="text-sm font-bold text-gray-800 mb-1.5 block">
              Image Prompt
              {isGeneratingImage && (
                <span className="ml-2 inline-flex items-center gap-1 text-white">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating...
                </span>
              )}
            </label>
            <textarea
              className="w-full border-1 border-gray-900 rounded-md p-2 text-sm min-h-[90px] outline-none bg-white"
              placeholder={step.promptPlaceholder}
              value={form.prompt || ''}
              onChange={e => onStepChange(index, 'prompt', e.target.value)}
              required
            />
          </div>
        )}
        <div className="w-full">
          <label className="text-sm font-bold text-gray-800 mb-1.5 block">Description</label>
          <textarea
            className={`w-full border-1 border-gray-900 rounded-md p-2 text-sm ${hasImage ? 'min-h-[90px]' : 'min-h-[180px]'} outline-none bg-white`}
            placeholder="Write your content here..."
            value={form.desc || ''}
            onChange={e => onStepChange(index, 'desc', e.target.value)}
            required
          />
        </div>
      </div>
    </div>
  )
}

export default function SetupForm({ id, onSubmit }: SetupFormProps) {
  // Dynamic steps: start from template only
  const initialTemplate = templates.standard
  const initialSteps = initialTemplate.steps.map(t =>
    generateStep(t.key, t.title, initialTemplate.hasImage),
  )
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [form, setForm] = useState<StepForm[]>(initialSteps.map(() => ({ prompt: '', desc: '' })))
  const [activeTemplate, setActiveTemplate] = useState('standard')
  const [hasImage, setHasImage] = useState(true)
  // Track if the user has manually changed mode so template switches don't override
  const [modeManuallySet, setModeManuallySet] = useState(false)
  const [selectedRatio, setSelectedRatio] = useState<'1:1' | '9:16' | '16:9'>('16:9')
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useFluxPrompts, setUseFluxPrompts] = useState(true) // Toggle for FLUX vs Storyboard prompts
  const [imageGenerationProgress, setImageGenerationProgress] = useState<{
    [key: string]: boolean
  }>({})
  const [projectData, setProjectData] = useState<Project | null>(null)
  const [projectTitle, setProjectTitle] = useState('')
  const router = useRouter()

  // Store hooks
  const setStoryboard = useCanvasStore(s => s.setStoryboard)
  const setCards = useCanvasStore(s => s.setCards)
  const { userId, isLoaded } = useUserStore()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Debug function to check authentication status
  const debugAuthStatus = async () => {
    try {
      // Check Supabase session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      // Check browser cookies
      if (typeof window !== 'undefined') {
        const cookies = document.cookie.split(';').map(c => c.trim())
        const supabaseCookies = cookies.filter(c => c.startsWith('sb-'))
      }

      // Test API endpoint
      try {
        const response = await fetch('/api/cards?debug=auth')
        const debugData = await response.json()
      } catch (apiError) {
        console.error('API debug failed:', apiError)
      }
    } catch (error) {
      console.error('Debug function failed:', error)
    }
  }

  // Debug user state
  useEffect(() => {
    // Debug auth status when user state changes
    if (userId && isLoaded) {
      debugAuthStatus()
    }
  }, [userId, isLoaded])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [activeId, setActiveId] = useState<string | null>(null)

  // Fetch existing project data if it exists
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!id || !userId) return

      try {
        const response = await fetch(`/api/projects?user_id=${userId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const existingProject = result.data.find((p: Project) => p.id === id)
            if (existingProject) {
              setProjectData(existingProject)
              setProjectTitle(existingProject.title)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project data:', error)
      }
    }

    fetchProjectData()
  }, [id, userId])

  // Initialize project title with default template
  useEffect(() => {
    if (!projectTitle && !projectData) {
      const template = templates[activeTemplate as keyof typeof templates]
      setProjectTitle(`Project ${template.name}`)
    }
  }, [projectTitle, projectData, activeTemplate])

  const handleTemplateChange = (templateKey: keyof typeof templates) => {
    const template = templates[templateKey]
    const baseSteps = template.steps.map(t => generateStep(t.key, t.title, template.hasImage))
    setSteps(baseSteps)
    setForm(baseSteps.map(() => ({ prompt: '', desc: '' })))
    // Only apply template default image mode if user hasn't manually chosen
    if (!modeManuallySet) {
      setHasImage(template.hasImage)
    }
    setActiveTemplate(templateKey)
    if (!projectTitle || projectTitle.startsWith('Project ')) {
      setProjectTitle(`Project ${template.name}`)
    }
  }

  const handleTitleChange = (index: number, title: string) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, title } : s)))
  }

  const handleChange = (index: number, field: keyof StepForm, value: string) => {
    const newForm = [...form]
    newForm[index][field] = value
    setForm(newForm)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = steps.findIndex(step => step.key === active.id)
      const newIndex = steps.findIndex(step => step.key === over?.id)

      setSteps(arrayMove(steps, oldIndex, newIndex))
      setForm(arrayMove(form, oldIndex, newIndex))
    }
    setActiveId(null)
  }

  const handleAddStep = () => {
    const template = templates[activeTemplate as keyof typeof templates]
    if (steps.length >= 10) {
      alert('You can add up to 10 cards only.')
      return
    }
    const index = steps.length + 1
    const newKey = `custom-${Date.now()}`
    const newStep = generateStep(newKey, `Step ${index}`, template.hasImage)
    setSteps(prev => [...prev, newStep])
    setForm(prev => [...prev, { prompt: '', desc: '' }])
  }

  const handleDeleteStep = (indexToDelete: number) => {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter((_, i) => i !== indexToDelete))
    setForm(prev => prev.filter((_, i) => i !== indexToDelete))
  }

  const generateImagesForSteps = async (): Promise<{ [key: string]: string }> => {
    const imageUrls: { [key: string]: string } = {}

    // Only generate images for steps that have image prompts and are set to have images
    const stepsWithImages = steps.filter((step, index) => hasImage && form[index]?.prompt?.trim())

    if (stepsWithImages.length === 0) {
      return imageUrls
    }

    setIsGeneratingImages(true)
    setImageGenerationProgress({})

    try {
      for (const step of stepsWithImages) {
        const stepIndex = steps.findIndex(s => s.key === step.key)
        const prompt = form[stepIndex]?.prompt?.trim()

        if (!prompt) continue

        setImageGenerationProgress(prev => ({ ...prev, [step.key]: true }))

        const result = useFluxPrompts
          ? await generateImageWithEnhancedPrompt(prompt)
          : await generateStoryboardImage(prompt)

        if (result.success && result.imageUrl) {
          imageUrls[step.key] = result.imageUrl
        } else {
          console.error(`Failed to generate image for step ${step.title}:`, result.error)
        }

        setImageGenerationProgress(prev => ({ ...prev, [step.key]: false }))
      }
    } catch (error) {
      console.error('Error generating images:', error)
    } finally {
      setIsGeneratingImages(false)
      setImageGenerationProgress({})
    }

    return imageUrls
  }

  const createOrUpdateProject = async (): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const projectPayload = {
      title:
        projectTitle ||
        `Project ${activeTemplate.charAt(0).toUpperCase() + activeTemplate.slice(1)}`,
      description: `Generated from ${templates[activeTemplate as keyof typeof templates].name} template`,
      user_id: userId,
      is_public: false,
    }

    if (projectData) {
      // Update existing project

      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectPayload, id }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to update project:', response.status, errorText)
        throw new Error('Failed to update project')
      }

      const result = await response.json()

      return id
    } else {
      // Create new project

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to create project:', response.status, errorText)
        throw new Error('Failed to create project')
      }

      const result = await response.json()

      return result.data.id
    }
  }

  const createStoryboard = async (projectId: string): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const storyboardPayload = {
      title: `${templates[activeTemplate as keyof typeof templates].name} Storyboard`,
      description: `Generated from ${activeTemplate} template`,
      project_id: projectId,
      user_id: userId,
      is_public: false,
    }

    const response = await fetch('/api/storyboards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storyboardPayload),
    })

    if (!response.ok) {
      throw new Error('Failed to create storyboard')
    }

    const result = await response.json()
    return result.data.id
  }

  const createCards = async (
    storyboardId: string,
    imageUrls: { [key: string]: string }
  ): Promise<void> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const cardsPayload = steps.map((step, index) => ({
      storyboard_id: storyboardId,
      user_id: userId,
      type: step.key as 'hook' | 'problem' | 'solution' | 'evidence' | 'benefit' | 'cta',
      title: step.title,
      content: form[index]?.desc || '',
      user_input: form[index]?.prompt || '',
      image_urls: imageUrls[step.key] ? [imageUrls[step.key]] : [],
      selected_image_url: imageUrls[step.key] ? 0 : 0,
      position_x: 80 + index * 340,
      position_y: 80,
      width: 400,
      height: 220,
      // Styling is now hardcoded for consistency
      order_index: index,
    }))

    const response = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardsPayload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Cards API error:', response.status, errorData)
      throw new Error(`Failed to create cards: ${response.status} ${errorData.error || ''}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Double-check authentication state
    if (!userId || !isLoaded) {
      console.error('No userId found or user not fully loaded - user not authenticated')
      alert('Please log in to continue')
      return
    }

    // Ensure user is fully authenticated before proceeding
    const ensureAuthenticated = async (retryCount = 0): Promise<any> => {
      if (!userId || !isLoaded) {
        throw new Error('User not authenticated')
      }

      setIsAuthenticating(true)
      try {
        // Double-check with Supabase directly
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (error || !session?.user) {
          console.error('Session validation failed:', error)

          // If this is a retry and we still have userId, try to refresh the session
          if (retryCount < 2 && userId) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError || !refreshData.session) {
              throw new Error('Session refresh failed')
            }
            // Retry with refreshed session
            return ensureAuthenticated(retryCount + 1)
          }

          throw new Error('Session validation failed')
        }

        if (session.user.id !== userId) {
          console.error('User ID mismatch between store and session')
          throw new Error('User ID mismatch')
        }

        return session.user
      } catch (error) {
        // If this is a retry and we still have userId, try to refresh the session
        if (retryCount < 2 && userId) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError && refreshData.session) {
              // Retry with refreshed session
              return ensureAuthenticated(retryCount + 1)
            }
          } catch (refreshError) {
            console.error('Session refresh failed:', refreshError)
          }
        }
        throw error
      } finally {
        setIsAuthenticating(false)
      }
    }

    try {
      // Generate images first if needed
      const imageUrls = await generateImagesForSteps()

      // 1) Create or update project in database

      const projectId = await createOrUpdateProject()

      // 2) Create storyboard in database

      const storyboardId = await createStoryboard(projectId)

      // 3) Create cards in database
      await createCards(storyboardId, imageUrls)

      // 4) Map current steps + form data to InitialCardData shape
      const mappedSteps: InitialCardData[] = steps.map((s, i) => ({
        title: s.title,
        content: form[i]?.desc || '',
      }))
      const submissionData = { steps: mappedSteps }

      // 5) Optionally notify parent
      if (onSubmit) onSubmit(submissionData)

      // 6) Build a temporary storyboard and cards for the editor
      const newStoryboard: Storyboard = {
        id: storyboardId,
        user_id: userId,
        project_id: projectId,
        title: `${templates[activeTemplate as keyof typeof templates].name} Storyboard`,
        description: `Template: ${activeTemplate}`,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const newCards: Card[] = mappedSteps.map((ms, index) => ({
        id: `temp-card-${index + 1}-${Date.now()}`,
        storyboard_id: storyboardId,
        user_id: userId,
        title: ms.title || `Step ${index + 1}`,
        content: ms.content || '',
        user_input: form[index]?.prompt || '',
        type: steps[index].key as 'hook' | 'problem' | 'solution' | 'evidence' | 'benefit' | 'cta',
        image_urls: imageUrls[steps[index].key] ? [imageUrls[steps[index].key]] : [],
        selected_image_url: imageUrls[steps[index].key] ? 0 : 0,
        // Styling is now hardcoded for consistency
        position_x: 80 + index * 340,
        position_y: 80,
        width: 400,
        height: 220,
        order_index: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      // 7) Save to store so the editor can render it
      setStoryboard(newStoryboard)
      setCards(newStoryboard.id, newCards)

      // 8) Navigate to editor

      router.push(`/project/${projectId}/editor`)
    } catch (error) {
      console.error('Storyboard creation error:', error)
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    try {
      router.push(`/project/${id}/editor`)
    } catch (error) {
      console.error('Skip setup error:', error)
      alert('An unexpected error occurred during storyboard setup.')
    }
  }

  // Show loading state if user is not loaded
  if (!userId && isLoaded) {
    return (
  <div className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-lg text-gray-500">Please log in to create or edit projects.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while user is being loaded
  if (!isLoaded) {
    return (
  <div className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Loading...</h2>
            <p className="text-lg text-gray-500">
              Please wait while we verify your authentication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <label htmlFor="project-title" className="sr-only">Project title</label>
        <input
          id="project-title"
          type="text"
          value={projectTitle}
          onChange={e => setProjectTitle(e.target.value)}
          placeholder="Untitled Project"
          className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-0 p-0 outline-none placeholder-gray-400"
        />
        <p className="mt-1 text-sm text-gray-500">Choose a template and add cards as needed.</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-10"
      >
  {/* Top Controls */}
  <div className="flex flex-wrap items-end gap-6">
                <div className="flex flex-wrap gap-4 ml-auto items-end">
                  <div className="min-w-[160px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-wide">Template</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="primary" className="w-full justify-between h-12 px-4 text-sm font-medium border-2 border-gray-900 rounded-full">
                          <span className="truncate text-left">{templates[activeTemplate as keyof typeof templates].name}</span>
                          <span className="ml-2 text-gray-600">▼</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border-2 border-gray-900 rounded-md w-64 p-0">
                        <DropdownMenuLabel className="px-3 py-2 text-xs font-bold tracking-wide">Choose Template</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-900" />
                        <DropdownMenuRadioGroup value={activeTemplate} onValueChange={val => handleTemplateChange(val as keyof typeof templates)}>
                          {Object.entries(templates).map(([key, t]) => (
                            <DropdownMenuRadioItem
                              key={key}
                              value={key}
                              className="text-xs px-3 py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-200"
                            >
                              {t.name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-wide">Mode</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="primary" className="w-full justify-between h-12 px-4 text-sm font-medium border-2 border-gray-900 rounded-full">
                          <span>{hasImage ? 'Image' : 'Text'}</span>
                          <span className="ml-2 text-gray-600">▼</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border-2 border-gray-900 rounded-md w-56 p-0">
                        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold tracking-wide">Select Mode</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-900" />
                        <DropdownMenuRadioGroup value={hasImage ? 'image' : 'text'} onValueChange={val => { setHasImage(val === 'image'); setModeManuallySet(true) }}>
                          <DropdownMenuRadioItem value="image" className="text-xs px-3 py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-200">Image</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="text" className="text-xs px-3 py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-200">Text</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-wide">Aspect</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button
                          variant="primary"
                          disabled={!hasImage}
                          className={`w-full justify-between h-12 px-4 text-sm font-medium border-2 border-gray-900 rounded-full ${!hasImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>{selectedRatio}</span>
                          <span className="ml-2 text-gray-600">▼</span>
                        </Button>
                      </DropdownMenuTrigger>
                      {hasImage && (
                        <DropdownMenuContent className="bg-white border-2 border-gray-900 rounded-md w-56 p-0">
                          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold tracking-wide">Aspect Ratio</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-900" />
                          <DropdownMenuRadioGroup value={selectedRatio} onValueChange={val => setSelectedRatio(val as '1:1' | '9:16' | '16:9')}>
                            {(['1:1', '9:16', '16:9'] as const).map(r => (
                              <DropdownMenuRadioItem
                                key={r}
                                value={r}
                                className="text-xs px-3 py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-200"
                              >
                                {r}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                    {/* Aspect helper text removed for text mode */}
                  </div>
                  <div className="min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-wide">Image Style</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button
                          variant="primary"
                          disabled={!hasImage}
                          className={`w-full justify-between h-12 px-4 text-sm font-medium border-2 border-gray-900 rounded-full ${!hasImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>{useFluxPrompts ? 'Realistic' : 'Sketch'}</span>
                          <span className="ml-2 text-gray-600">▼</span>
                        </Button>
                      </DropdownMenuTrigger>
                      {hasImage && (
                        <DropdownMenuContent className="bg-white border-2 border-gray-900 rounded-md w-56 p-0">
                          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold tracking-wide">Image Style</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-900" />
                          <DropdownMenuRadioGroup value={useFluxPrompts ? 'realistic' : 'sketch'} onValueChange={val => setUseFluxPrompts(val === 'realistic')}>
                            <DropdownMenuRadioItem value="realistic" className="text-xs px-3 py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-200">Realistic</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="sketch" className="text-xs px-3 py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-200">Sketch</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                  </div>
                </div>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={steps.map(step => step.key)}
                    strategy={rectSortingStrategy}
                  >
                    {steps.map((step, idx) => (
                      <SortableCard
                        key={step.key}
                        step={step}
                        index={idx}
                        form={form[idx]}
                        hasImage={hasImage}
                        onStepChange={handleChange}
                        onTitleChange={handleTitleChange}
                        onDelete={handleDeleteStep}
                        stepsLength={steps.length}
                        isGeneratingImage={imageGenerationProgress[step.key]}
                      />
                    ))}
          {steps.length < 10 && (
                      <button
                        type="button"
                        onClick={handleAddStep}
                        className="flex flex-col items-center justify-center border-1 border-gray-900 border-dashed rounded-md bg-gray-50 hover:bg-white transition-all min-h-[200px] md:min-h-[240px] group shadow-[2px_2px_0_0_#000000] hover:shadow-[4px_4px_0_0_#000000]"
                      >
                        <Plus className="h-12 w-12 mb-3 text-gray-500 group-hover:text-gray-900 transition-all" />
                        <span className="text-base font-bold text-gray-600 group-hover:text-gray-900">Add Card</span>
            <span className="mt-1 text-[10px] text-gray-400 group-hover:text-gray-600">{10 - steps.length} remaining</span>
                      </button>
                    )}
                  </SortableContext>
                  <DragOverlay dropAnimation={null}>
                    {activeId ? (
                      <div className="border-1 border-gray-900 rounded-md bg-white shadow-xl opacity-90 pointer-events-none p-4 w-[280px]">
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical className="h-4 w-4 text-gray-500" />
                          <span className="font-bold">
                            {steps.find(s => s.key === activeId)?.title}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded" />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
  </div>
  
  <div className="flex justify-end pt-6 border-t border-gray-200 gap-4">
                <Button type="button" variant="reverse" onClick={handleSkip}>
                  Skip to Editor
                </Button>
                <Button
                  type="submit"
                  variant="reverse"
                  disabled={isGeneratingImages || isSubmitting || isAuthenticating}
                  className="min-w-[180px]"
                >
                  {isGeneratingImages ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Images...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Generate Storyboard'
                  )}
                </Button>
        </div>
      </form>
    </div>
  )
}