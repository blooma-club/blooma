'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  ChevronDown,
  Camera,
  Palette,
  LayoutTemplate,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { InitialCardData, Storyboard, Card, Project } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { useUserStore } from '@/store/user'
import { generateImageWithEnhancedPrompt, generateStoryboardImage } from '@/lib/imageGeneration'
import { supabase } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
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

type SettingsView = 'structure' | 'camera' | 'style'

// Sortable Card Component
interface SortableCardProps {
  step: Step
  index: number
  form: StepForm
  hasImage: boolean
  onStepChange: (index: number, field: keyof StepForm, value: string) => void
  onDeleteStep: (index: number) => void
  stepsLength: number
  isGeneratingImage?: boolean
}

function SortableCard({
  step,
  index,
  form,
  hasImage,
  onStepChange,
  onDeleteStep,
  stepsLength,
  isGeneratingImage,
}: SortableCardProps) {
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
      className={`border-1 border-gray-900 rounded-md bg-white flex flex-col h-full shadow-[2px_2px_0_0_#000000] ${isDragging ? 'ring-2 ring-gray-900 scale-[1.01] shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-center p-3 border-b-1 border-gray-700">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="h-4 w-4 text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">{step.title}</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDeleteStep(index)}
          disabled={stepsLength <= 1}
          className="rounded-md border-1 border-gray-900 hover:bg-red-500 hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow space-y-3 p-4">
        {hasImage && (
          <div className="w-full">
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">
              Image Prompt
              {isGeneratingImage && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating...
                </span>
              )}
            </label>
            <textarea
              className="w-full border-1 border-gray-900 rounded-md p-2 text-sm min-h-[90px] outline-none"
              placeholder={step.promptPlaceholder}
              value={form.prompt || ''}
              onChange={e => onStepChange(index, 'prompt', e.target.value)}
              required
            />
          </div>
        )}
        <div className="w-full">
          <label className="text-sm font-bold text-gray-700 mb-1.5 block">Description</label>
          <textarea
            className={`w-full border-1 border-gray-900 rounded-md p-2 text-sm ${hasImage ? 'min-h-[90px]' : 'min-h-[180px]'} outline-none`}
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
  const [steps, setSteps] = useState<Step[]>(
    templates.standard.steps.map(t => generateStep(t.key, t.title, templates.standard.hasImage))
  )
  const [form, setForm] = useState<StepForm[]>(
    templates.standard.steps.map(() => ({ prompt: '', desc: '' }))
  )
  const [activeTemplate, setActiveTemplate] = useState('standard')
  const [activeFramework, setActiveFramework] = useState<'marketing' | 'storytelling' | 'all'>(
    'marketing'
  )
  const [hasImage, setHasImage] = useState(true)
  const [selectedRatio, setSelectedRatio] = useState<'1:1' | '9:16' | '16:9'>('16:9')
  const [activeSettingsView, setActiveSettingsView] = useState<SettingsView>('structure')
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
    const newSteps = template.steps.map(t => generateStep(t.key, t.title, template.hasImage))
    setSteps(newSteps)
    setForm(newSteps.map(() => ({ prompt: '', desc: '' })))
    setActiveTemplate(templateKey)

    // Update project title if it's empty or still using default
    if (!projectTitle || projectTitle.startsWith('Project ')) {
      setProjectTitle(`Project ${template.name}`)
    }
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
    if (steps.length >= 8) {
      alert('You can add a maximum of 8 steps.')
      return
    }
    const newStepKey = `custom-${Date.now()}`
    const template = templates[activeTemplate as keyof typeof templates]
    const newStep = generateStep(newStepKey, `New Step ${steps.length + 1}`, template.hasImage)
    setSteps(prev => [...prev, newStep])
    setForm(prev => [...prev, { prompt: '', desc: '' }])
  }

  const handleDeleteStep = (indexToDelete: number) => {
    if (steps.length <= 1) {
      alert('You must have at least one step.')
      return
    }
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
      <div className="bg-[#F5F2ED] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
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
      <div className="bg-[#F5F2ED] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
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
    <div className="bg-[#F5F2ED] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900">Quick Start</h2>
          <p className="mt-2 text-lg text-gray-500">
            Get started with templates or create your own story flow.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel: Settings */}
          <div className="lg:w-1/4">
            <div className="sticky top-12 bg-white p-8 rounded-md border-2 border-gray-900 shadow-[2px_2px_0_0_#000000]">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Templates</h3>

              {/* Project Title Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  placeholder="Enter project title..."
                  className="w-full border-2 border-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-opacity-50"
                />
              </div>

              <div className="w-full mb-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="reverse"
                      className="w-full justify-between rounded-md transition-all"
                    >
                      <span className="flex items-center gap-2">
                        {activeSettingsView === 'structure' && (
                          <LayoutTemplate className="w-5 h-5" />
                        )}
                        {activeSettingsView === 'camera' && <Camera className="w-5 h-5" />}
                        {activeSettingsView === 'style' && <Palette className="w-5 h-5" />}
                        {activeSettingsView === 'structure'
                          ? 'Structure'
                          : activeSettingsView === 'camera'
                            ? 'Camera'
                            : 'Style'}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white border-2 border-gray-900 rounded-md">
                    <DropdownMenuLabel>Menu</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-900" />
                    <DropdownMenuRadioGroup
                      value={activeSettingsView}
                      onValueChange={value => setActiveSettingsView(value as SettingsView)}
                    >
                      <DropdownMenuRadioItem
                        value="structure"
                        className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900"
                      >
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Structure
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="camera"
                        className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Camera
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="style"
                        className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900"
                      >
                        <Palette className="w-4 h-4 mr-2" />
                        Style
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="border-t-2 border-gray-900 pt-4">
                {activeSettingsView === 'structure' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900">Frameworks</h3>
                    <div className="mb-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="reverse" className="w-full justify-between rounded-md">
                            <span className="flex items-center gap-2">
                              Frameworks:{' '}
                              {activeFramework.charAt(0).toUpperCase() + activeFramework.slice(1)}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white border-2 border-gray-900 rounded-md">
                          <DropdownMenuLabel>Frameworks</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-900" />
                          <DropdownMenuRadioGroup
                            value={activeFramework}
                            onValueChange={value =>
                              setActiveFramework(value as 'marketing' | 'storytelling' | 'all')
                            }
                          >
                            <DropdownMenuRadioItem
                              value="marketing"
                              className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900"
                            >
                              Marketing
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value="storytelling"
                              className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900"
                            >
                              Storytelling
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value="all"
                              className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900"
                            >
                              All
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(templates)
                        .filter(
                          ([, template]) =>
                            activeFramework === 'all' || template.category === activeFramework
                        )
                        .map(([key, template]) => (
                          <Button
                            key={key}
                            type="button"
                            variant="reverse"
                            onClick={() => handleTemplateChange(key as keyof typeof templates)}
                            className={`w-full justify-start text-left h-auto py-4 px-5 rounded-md ${activeTemplate === key ? 'bg-gray-900 text-white hover:shadow-none' : ''}`}
                          >
                            <div>
                              <div className="font-bold">{template.name}</div>
                              <div className="text-xs">{template.steps.length} steps</div>
                            </div>
                          </Button>
                        ))}
                      {Object.entries(templates).filter(
                        ([, template]) =>
                          activeFramework === 'all' || template.category === activeFramework
                      ).length === 0 && (
                        <div className="text-sm text-gray-500">
                          No templates for this category yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSettingsView === 'camera' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Camera Settings</h3>
                    <p className="text-gray-600">
                      Camera settings will be available in future updates.
                    </p>
                  </div>
                )}

                {activeSettingsView === 'style' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Style Settings</h3>
                    <p className="text-gray-600">
                      Style settings will be available in future updates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Storyboard Grid */}
          <div className="lg:w-3/4">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-8 rounded-md border-2 border-gray-700 shadow-[2px_2px_0_0_#000000]"
            >
              {/* Image/Text Mode Toggle */}
              <div className="flex justify-end mb-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="reverse"
                    onClick={() => setHasImage(true)}
                    className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                      hasImage
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    With Image
                  </Button>
                  <Button
                    type="button"
                    variant="reverse"
                    onClick={() => setHasImage(false)}
                    className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                      !hasImage
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Text Only
                  </Button>
                </div>
              </div>
              {hasImage && (
                <div className="flex justify-end mb-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="reverse"
                      onClick={() => setSelectedRatio('1:1')}
                      className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                        selectedRatio === '1:1'
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      1:1
                    </Button>
                    <Button
                      type="button"
                      variant="reverse"
                      onClick={() => setSelectedRatio('9:16')}
                      className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                        selectedRatio === '9:16'
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      9:16
                    </Button>
                    <Button
                      type="button"
                      variant="reverse"
                      onClick={() => setSelectedRatio('16:9')}
                      className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                        selectedRatio === '16:9'
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      16:9
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
                        onDeleteStep={handleDeleteStep}
                        stepsLength={steps.length}
                        isGeneratingImage={imageGenerationProgress[step.key]}
                      />
                    ))}
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
                {steps.length < 8 && (
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center justify-center border-2 border-dashed border-gray-400 rounded-md bg-gray-50 hover:bg-gray-100 hover:border-gray-900 transition-all min-h-[280px] group"
                  >
                    <div className="text-center text-gray-500 group-hover:text-gray-900 transition-all">
                      <Plus className="h-10 w-10 mx-auto mb-2" />
                      <span className="text-base font-bold">Add Step</span>
                    </div>
                  </button>
                )}
              </div>
              {hasImage && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Image Style:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUseFluxPrompts(true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          useFluxPrompts
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Realistic
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseFluxPrompts(false)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          !useFluxPrompts
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Sketch
                      </button>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {useFluxPrompts
                        ? 'High-quality realistic images'
                        : 'Quick sketch-style drawings'}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-8 pt-6 border-t-2 border-gray-900 gap-4">
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
        </div>
      </div>
    </div>
  )
}
