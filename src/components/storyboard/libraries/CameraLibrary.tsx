'use client'

import React from 'react'
import clsx from 'clsx'
import { Check, Plus, Camera, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type CameraPreset = {
  id: string
  title: string
  lens: string
  movement: string
  prompt: string
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'bird-eye',
    title: 'Bird-eye',
    lens: '24mm ultra-wide',
    movement: 'top-down hover | geometric',
    prompt:
      'bird-eye overhead shot, 24mm ultra-wide lens from high altitude, orthographic feel, subjects reduced to graphic silhouettes, strong architectural geometry and long shadows',
  },
  {
    id: 'worm-eye',
    title: 'Worm-eye',
    lens: '18mm wide',
    movement: 'ground-level tilt-up',
    prompt:
      'worm-eye angle from the ground, 18mm wide lens tilting upward, towering scale, dramatic leading lines, emphasizes height and power of subjects against the sky',
  },
  {
    id: 'dutch-tilt',
    title: 'Dutch Tilt',
    lens: '35mm handheld',
    movement: 'angled horizon | kinetic',
    prompt:
      'dutch tilt shot on a 35mm handheld lens, diagonal horizon, kinetic tension, moody practical lighting, slight motion blur to intensify unease',
  },
  {
    id: 'over-shoulder',
    title: 'Over-the-Shoulder',
    lens: '50mm prime',
    movement: 'locked-off | shallow focus',
    prompt:
      'over-the-shoulder framing with a 50mm prime lens, shallow depth of field, blurred foreground shoulder, crisp focus on subject across the scene, intimate conversational energy',
  },
  {
    id: 'pov-sprint',
    title: 'POV Run',
    lens: '16mm action cam',
    movement: 'handheld sprint | motion blur',
    prompt:
      'first-person POV running shot, 16mm action camera perspective, slight motion blur on edges, urgent breathing energy, environmental streaks conveying high speed',
  },
  {
    id: 'establishing-wide',
    title: 'Wide Establishing',
    lens: '28mm cine',
    movement: 'locked tripod | symmetrical',
    prompt:
      'wide establishing shot on 28mm cine lens, locked tripod, symmetrical composition, expansive environment storytelling with balanced lighting and soft atmospheric haze',
  },
]

const CUSTOM_CAMERA_PRESETS_STORAGE_KEY = 'blooma.customCameraPresets'

export const loadCustomCameraPresets = (): CameraPreset[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_CAMERA_PRESETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is CameraPreset => {
      if (!value || typeof value !== 'object') return false
      const preset = value as Partial<CameraPreset>
      return (
        typeof preset.id === 'string' &&
        typeof preset.title === 'string' &&
        typeof preset.lens === 'string' &&
        typeof preset.movement === 'string' &&
        typeof preset.prompt === 'string'
      )
    })
  } catch {
    return []
  }
}

export const saveCustomCameraPresets = (presets: CameraPreset[]): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      CUSTOM_CAMERA_PRESETS_STORAGE_KEY,
      JSON.stringify(presets)
    )
  } catch {
    // Silent failure – storage access may be blocked
  }
}

type CameraLibraryProps = {
  selectedPreset: CameraPreset | null
  onSelect: (preset: CameraPreset) => void
  onClear: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CameraLibrary: React.FC<CameraLibraryProps> = ({
  selectedPreset,
  onSelect,
  onClear,
  open,
  onOpenChange,
}) => {
  const [customPresets, setCustomPresets] = React.useState<CameraPreset[]>(() =>
    loadCustomCameraPresets()
  )

  const presets = React.useMemo(() => [...CAMERA_PRESETS, ...customPresets], [customPresets])

  const handleSelect = React.useCallback(
    (preset: CameraPreset, event: Event) => {
      event.preventDefault()
      onSelect(preset)
      onOpenChange?.(false)
    },
    [onSelect, onOpenChange]
  )

  const handleAddPreset = () => {
    const title = window.prompt('Preset name', 'Custom shot')
    if (!title) return
    const lens = window.prompt('Lens / focal length', '35mm prime') || '35mm prime'
    const movement =
      window.prompt('Movement / camera note', 'handheld | shallow focus') ||
      'handheld | shallow focus'
    const prompt =
      window.prompt('Prompt description', 'Describe the framing, mood, and lighting in detail.') ||
      'Custom camera prompt'

    const newPreset: CameraPreset = {
      id: `custom-camera-${Date.now()}`,
      title,
      lens,
      movement,
      prompt,
    }

    setCustomPresets(previous => {
      const updated = [...previous, newPreset]
      saveCustomCameraPresets(updated)
      return updated
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className={clsx(
            'h-9 px-3 text-sm transition-all duration-300 shadow-sm',
            'border border-border/40 hover:border-violet-400/40 hover:bg-violet-500/5',
            selectedPreset 
              ? 'text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/20' 
              : 'text-muted-foreground bg-background/60 backdrop-blur-sm'
          )}
        >
          {selectedPreset ? (
            <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-violet-500/20 text-violet-600 dark:text-violet-300">
                  <Video className="w-2.5 h-2.5" />
               </div>
               <span className="truncate max-w-[100px] font-medium">{selectedPreset.title}</span>
            </div>
          ) : (
            <span className="font-normal">Camera</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className='w-64 rounded-2xl p-0 z-[80] border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl supports-[backdrop-filter]:bg-background/60'
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
             <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Camera Preset</h4>
             <button 
              onClick={handleAddPreset}
              className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors font-medium"
             >
               + Add
             </button>
          </div>

        <div className='flex flex-col gap-1 max-h-[280px] overflow-y-auto p-2 custom-scrollbar'>
          {presets.map(preset => (
            <DropdownMenuItem
              key={preset.id}
              onSelect={event => handleSelect(preset, event)}
              className={clsx(
                'flex items-center justify-between rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors group',
                selectedPreset?.id === preset.id 
                  ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300' 
                  : 'hover:bg-muted/50'
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className='text-xs font-semibold'>{preset.title}</span>
                <span className='text-[10px] text-muted-foreground opacity-70'>{preset.lens}</span>
              </div>
              {selectedPreset?.id === preset.id && (
                 <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                   <Check className='h-3 w-3 text-violet-500' strokeWidth={2.5} />
                 </div>
              )}
            </DropdownMenuItem>
          ))}
        </div>
        
        {selectedPreset && (
           <div className="p-2 pt-0 border-t border-border/30 mt-1">
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full justify-center text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-8 rounded-lg'
              onClick={event => {
                event.preventDefault()
                onClear()
                onOpenChange?.(false)
              }}
            >
              Clear camera preset
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CameraLibrary
