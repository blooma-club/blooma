'use client'

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, Camera, Palette, LayoutTemplate, GripVertical } from 'lucide-react'
import { InitialCardData, Storyboard, Card } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
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
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const templates = {
  standard: {
    category: "marketing",
    name: "Standard Marketing",
    hasImage: true,
    steps: [
      { key: "hook", title: "Hook" },
      { key: "problem", title: "Problem" },
      { key: "solution", title: "Solution" },
      { key: "evidence", title: "Evidence" },
      { key: "benefit", title: "Benefit" },
      { key: "cta", title: "Call to Action" },
    ],
  },
  pas: {
    category: "marketing",
    name: "PAS Framework",
    hasImage: false,
    steps: [
      { key: "problem", title: "Problem" },
      { key: "agitate", title: "Agitate" },
      { key: "solution", title: "Solution" },
    ],
  },
  aida: {
    category: "marketing",
    name: "AIDA Framework",
    hasImage: false,
    steps: [
      { key: "attention", title: "Attention" },
      { key: "interest", title: "Interest" },
      { key: "desire", title: "Desire" },
      { key: "action", title: "Action" },
    ],
  },
  fab: {
    category: "marketing",
    name: "FAB Analysis",
    hasImage: false,
    steps: [
      { key: "features", title: "Features" },
      { key: "advantages", title: "Advantages" },
      { key: "benefits", title: "Benefits" },
    ],
  },
  problemSolution: {
    category: "marketing",
    name: "Problem & Solution",
    hasImage: true,
    steps: [
      { key: "problem", title: "Problem" },
      { key: "solution", title: "Solution" },
      { key: "benefits", title: "Benefits" },
    ],
  },
};

const generateStep = (key: string, title: string, hasImage: boolean): Step => ({
  key,
  title,
  hasImage,
  promptLabel: hasImage ? "Image Prompt" : "",
  promptPlaceholder: hasImage ? "A lone astronaut gazes at a distant galaxy..." : "",
  descLabel: "Description",
  descPlaceholder: "Write your content here...",
});

type Step = {
  key: string;
  title: string;
  hasImage: boolean;
  promptLabel: string;
  promptPlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
}

type StepForm = {
  prompt: string;
  desc: string;
}

type SetupFormProps = {
  id: string
  onSubmit?: (data: { steps: InitialCardData[] }) => void
}

type SettingsView = 'structure' | 'camera' | 'style';

// Sortable Card Component
interface SortableCardProps {
  step: Step;
  index: number;
  form: StepForm;
  hasImage: boolean;
  onStepChange: (index: number, field: keyof StepForm, value: string) => void;
  onDeleteStep: (index: number) => void;
  stepsLength: number;
}

function SortableCard({ step, index, form, hasImage, onStepChange, onDeleteStep, stepsLength }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties;

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
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Image Prompt</label>
            <textarea
              className="w-full border-1 border-gray-900 rounded-md p-2 text-sm min-h-[90px] outline-none"
              placeholder="A lone astronaut gazes at a distant galaxy..."
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
  );
}

export default function SetupForm({ id, onSubmit }: SetupFormProps) {
  const [steps, setSteps] = useState<Step[]>(templates.standard.steps.map(t => generateStep(t.key, t.title, templates.standard.hasImage)))
  const [form, setForm] = useState<StepForm[]>(templates.standard.steps.map(() => ({ prompt: "", desc: "" })))
  const [activeTemplate, setActiveTemplate] = useState('standard');
  const [activeFramework, setActiveFramework] = useState<'marketing' | 'storytelling' | 'all'>('marketing');
  const [hasImage, setHasImage] = useState(true);
  const [activeSettingsView, setActiveSettingsView] = useState<SettingsView>('structure');
  const router = useRouter()
  // canvas store actions
  const setStoryboard = useCanvasStore(s => s.setStoryboard)
  const setCards = useCanvasStore(s => s.setCards)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleTemplateChange = (templateKey: keyof typeof templates) => {
    const template = templates[templateKey];
    const newSteps = template.steps.map(t => generateStep(t.key, t.title, template.hasImage));
    setSteps(newSteps);
    setForm(newSteps.map(() => ({ prompt: "", desc: "" })));
    setActiveTemplate(templateKey);
  };

  const handleChange = (index: number, field: keyof StepForm, value: string) => {
    const newForm = [...form]
    newForm[index][field] = value
    setForm(newForm)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = steps.findIndex(step => step.key === active.id);
      const newIndex = steps.findIndex(step => step.key === over?.id);

      setSteps(arrayMove(steps, oldIndex, newIndex));
      setForm(arrayMove(form, oldIndex, newIndex));
    }
    setActiveId(null);
  };

  const handleAddStep = () => {
    if (steps.length >= 8) {
      alert("You can add a maximum of 8 steps.")
      return
    }
    const newStepKey = `custom-${Date.now()}`
    const template = templates[activeTemplate as keyof typeof templates];
    const newStep = generateStep(newStepKey, `New Step ${steps.length + 1}`, template.hasImage);
    setSteps(prev => [...prev, newStep])
    setForm(prev => [...prev, { prompt: "", desc: "" }])
  }

  const handleDeleteStep = (indexToDelete: number) => {
    if (steps.length <= 1) {
      alert("You must have at least one step.")
      return
    }
    setSteps(prev => prev.filter((_, i) => i !== indexToDelete))
    setForm(prev => prev.filter((_, i) => i !== indexToDelete))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Map current steps + form data to InitialCardData shape
    const mappedSteps: InitialCardData[] = steps.map((s, i) => ({
      title: s.title,
      content: form[i]?.desc || '',
    }))
    const submissionData = { steps: mappedSteps };
    console.log("Submitting data:", submissionData);
    try {
      // 1) Optionally notify parent
      if (onSubmit) onSubmit(submissionData)

      // 2) Build a temporary storyboard and cards for the editor
      const storyboardId = `temp-${Date.now()}`
      const newStoryboard: Storyboard = {
        id: storyboardId,
        user_id: 'local-user',
        project_id: id,
        title: 'Generated Storyboard',
        description: `Template: ${activeTemplate}`,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const newCards: Card[] = mappedSteps.map((ms, index) => ({
        id: `temp-card-${index + 1}-${Date.now()}`,
        storyboard_id: storyboardId,
        user_id: 'local-user',
        title: ms.title || `Step ${index + 1}`,
        content: ms.content || '',
        type: 'hook',
        image_url: '',
        background_color: '#ffffff',
        text_color: '#000000',
        font_size: 16,
        font_weight: 'normal',
        position_x: 80 + index * 340,
        position_y: 80,
        width: 400,
        height: 220,
        order_index: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      // 3) Save to store so the editor can render it
      setStoryboard(newStoryboard)
      setCards(newStoryboard.id, newCards)

      // 4) Navigate to editor
      router.push(`/project/${id}/editor`)
    } catch (error) {
      console.error('Storyboard creation error:', error)
      alert('An unexpected error occurred during storyboard creation.')
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

  // const SettingsMenuButton = ({ view, label, icon: Icon }: { view: SettingsView, label: string, icon: React.ElementType }) => (
  //   <Button
  //     variant="reverse"
  //     onClick={() => setActiveSettingsView(view)}
  //     className={`flex-1 justify-center gap-2 text-regular p-3 }`}>
  //     <Icon className="w-5 h-5" />
  //     <span>{label}</span>
  //   </Button>
  // );

  return (
    <div className="bg-[#F5F2ED] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900">Quick Start</h2>
          <p className="mt-2 text-lg text-gray-500">Get started with templates or create your own story flow.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel: Settings */}
          <div className="lg:w-1/4">
            <div className="sticky top-12 bg-white p-8 rounded-md border-2 border-gray-900 shadow-[2px_2px_0_0_#000000]">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Templates</h3>
              <div className="w-full mb-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="reverse" className="w-full justify-between rounded-md transition-all">
                      <span className="flex items-center gap-2">
                        {activeSettingsView === 'structure' && <LayoutTemplate className="w-5 h-5" />}
                        {activeSettingsView === 'camera' && <Camera className="w-5 h-5" />}
                        {activeSettingsView === 'style' && <Palette className="w-5 h-5" />}
                        {activeSettingsView === 'structure' ? 'Structure' : 
                         activeSettingsView === 'camera' ? 'Camera' : 'Style'}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white border-2 border-gray-900 rounded-md">
                    <DropdownMenuLabel>Menu</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-900"/>
                    <DropdownMenuRadioGroup value={activeSettingsView} onValueChange={(value) => setActiveSettingsView(value as SettingsView)}>
                      <DropdownMenuRadioItem value="structure" className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Structure
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="camera" className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900">
                        <Camera className="w-4 h-4 mr-2" />
                        Camera
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="style" className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900">
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
                              Frameworks: {activeFramework.charAt(0).toUpperCase() + activeFramework.slice(1)}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white border-2 border-gray-900 rounded-md">
                          <DropdownMenuLabel>Frameworks</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-900"/>
                          <DropdownMenuRadioGroup value={activeFramework} onValueChange={value => setActiveFramework(value as 'marketing' | 'storytelling' | 'all')}>
                            <DropdownMenuRadioItem value="marketing" className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900">
                              Marketing
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="storytelling" className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900">
                              Storytelling
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="all" className="focus:bg-gray-200 data-[state=checked]:bg-gray-100 data-[state=checked]:text-gray-900">
                              All
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(templates)
                        .filter(([_, template]) => activeFramework === 'all' || template.category === activeFramework)
                        .map(([key, template]) => (
                        <Button
                          key={key}
                          type="button"
                          variant="reverse"
                          onClick={() => handleTemplateChange(key as keyof typeof templates)}
                          className={`w-full justify-start text-left h-auto py-4 px-5 rounded-md ${activeTemplate === key ? 'bg-gray-900 text-white hover:shadow-none' : ''}`}>
                          <div>
                            <div className="font-bold">{template.name}</div>
                            <div className="text-xs">{template.steps.length} steps</div>
                          </div>
                        </Button>
                      ))}
                      {Object.entries(templates).filter(([_, template]) => activeFramework === 'all' || template.category === activeFramework).length === 0 && (
                        <div className="text-sm text-gray-500">No templates for this category yet.</div>
                      )}
                    </div>
                  </div>
                )}

                {activeSettingsView === 'camera' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Camera Settings</h3>
                    <p className="text-gray-600">Camera settings will be available in future updates.</p>
                  </div>
                )}

                {activeSettingsView === 'style' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Style Settings</h3>
                    <p className="text-gray-600">Style settings will be available in future updates.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Storyboard Grid */}
          <div className="lg:w-3/4">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-md border-2 border-gray-700 shadow-[2px_2px_0_0_#000000]">
              {/* Image/Text Mode Toggle */}
              <div className="flex justify-end mb-4">
                <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="reverse"
                      onClick={() => setHasImage(true)}
                      className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                        hasImage ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      With Image
                    </Button>
                    <Button
                      type="button"
                      variant="reverse"
                      onClick={() => setHasImage(false)}
                      className={`px-4 py-2 h-10 min-w-[96px] border-2 border-gray-900 rounded-md text-sm font-medium transition-all ${
                        !hasImage ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Text Only
                    </Button>
                </div>
              </div>
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
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay dropAnimation={null}>
                    {activeId ? (
                      <div className="border-1 border-gray-900 rounded-md bg-white shadow-xl opacity-90 pointer-events-none p-4 w-[280px]">
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical className="h-4 w-4 text-gray-500" />
                          <span className="font-bold">{steps.find(s => s.key === activeId)?.title}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded" />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
                {steps.length < 8 && (
                  <button type="button" onClick={handleAddStep} className="flex items-center justify-center border-2 border-dashed border-gray-400 rounded-md bg-gray-50 hover:bg-gray-100 hover:border-gray-900 transition-all min-h-[280px] group">
                    <div className="text-center text-gray-500 group-hover:text-gray-900 transition-all">
                      <Plus className="h-10 w-10 mx-auto mb-2" />
                      <span className="text-base font-bold">Add Step</span>
                    </div>
                  </button>
                )}
              </div>
              <div className="flex justify-end mt-8 pt-6 border-t-2 border-gray-900 gap-4">
                <Button
                  type="button"
                  variant="reverse"
                  onClick={handleSkip}
                >
                  Skip to Editor
                </Button>
                <Button type="submit" variant="reverse">
                  Generate Storyboard
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
