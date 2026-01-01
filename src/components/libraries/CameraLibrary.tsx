'use client'

import React from 'react'
import clsx from 'clsx'
import { Check, Camera, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useSWR, { mutate as globalMutate } from 'swr'

const PRESETS_API_KEY = '/api/camera-presets'


export type CameraPreset = {
  id: string
  title: string
  prompt: string
  image?: string  // 썸네일 이미지 (Built-in만 해당, 커스텀은 없을 수 있음)
  isBuiltIn?: boolean
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'front',
    title: 'Front',
    prompt: 'eye-level shot, 50mm lens, centered framing, soft studio lighting, sharp focus',
    image: '/front-view-v2.png',
    isBuiltIn: true,
  },
  {
    id: 'behind',
    title: 'Behind',
    prompt: 'centered framing, 50mm lens, soft studio lighting, clear posture',
    image: '/behind-view-v2.png',
    isBuiltIn: true,
  },
  {
    id: 'side',
    title: 'Side',
    prompt: '35mm lens, clear silhouette, soft studio lighting, minimalist framing',
    image: '/side-view-v2.png',
    isBuiltIn: true,
  },
  {
    id: 'quarter',
    title: 'Quarter',
    prompt: '35mm lens, soft studio lighting, clean background, professional lookbook style',
    image: '/front-side-view-v2.png',
    isBuiltIn: true,
  },
]

// SWR Hook
export function useCameraPresets() {
  const { data, error, isLoading, mutate } = useSWR(PRESETS_API_KEY, async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    const json = await res.json()
    return (json?.data?.presets || []) as CameraPreset[]
  }, {
    revalidateOnFocus: false
  })

  // Combine built-in and custom presets
  const allPresets = React.useMemo(() => {
    // If we have data, use it. If loading, show built-ins. If error, show built-ins.
    const custom = data || []
    return [...CAMERA_PRESETS, ...custom]
  }, [data])

  return {
    presets: data || [],
    allPresets,
    isLoading,
    isError: error,
    mutate
  }
}

// API Functions
export const createCustomCameraPreset = async (preset: Omit<CameraPreset, 'isBuiltIn'>): Promise<CameraPreset | null> => {
  try {
    const res = await fetch(PRESETS_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    })
    if (!res.ok) throw new Error('Failed to create')
    const json = await res.json()
    const created = json?.data?.preset
    if (created) {
      globalMutate(PRESETS_API_KEY) // Invalidate cache
    }
    return created || null
  } catch (e) {
    console.error(e)
    return null
  }
}

export const deleteCustomCameraPresetApi = async (presetId: string): Promise<boolean> => {
  try {
    const res = await fetch(`${PRESETS_API_KEY}?id=${encodeURIComponent(presetId)}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete')

    globalMutate(PRESETS_API_KEY) // Invalidate cache
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

// Legacy exports explicitly marked (can be removed later if unused)
export const fetchCustomCameraPresets = async () => []
export const loadCustomCameraPresetsFromStorage = () => []
export const saveCustomCameraPresetsToStorage = () => { }
export const deleteCustomCameraPreset = () => []

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
  const { allPresets, isLoading: loading } = useCameraPresets()
  const [saving, setSaving] = React.useState(false)



  const handleSelect = React.useCallback(
    (preset: CameraPreset, event: Event) => {
      event.preventDefault()
      onSelect(preset)
      onOpenChange?.(false)
    },
    [onSelect, onOpenChange]
  )

  const handleAddPreset = async () => {
    const title = window.prompt('Preset name', 'My camera angle')
    if (!title?.trim()) return

    const prompt = window.prompt(
      'Camera prompt (include angle, lens, lighting, etc.)',
      'medium shot, 35mm lens, soft natural lighting, shallow depth of field'
    )
    if (!prompt?.trim()) return

    const newPreset: CameraPreset = {
      id: `custom-camera-${Date.now()}`,
      title: title.trim(),
      prompt: prompt.trim(),
      isBuiltIn: false,
    }

    setSaving(true)
    try {
      const created = await createCustomCameraPreset(newPreset)
      // global mutate is handled in createCustomCameraPreset
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePreset = async (presetId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()

    if (!window.confirm('Delete this preset?')) return

    // 먼저 UI에서 제거 (Optimistic update or just wait for revalidate)
    // SWR will handle revalidation via mutate in deleteCustomCameraPresetApi

    // API 호출
    await deleteCustomCameraPresetApi(presetId)

    // Clear selection if deleted preset was selected
    if (selectedPreset?.id === presetId) {
      onClear()
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={clsx(
            'h-9 px-3 text-sm transition-all duration-200',
            'border border-border/50 hover:border-primary/30 hover:bg-primary/5',
            selectedPreset
              ? 'text-primary bg-primary/10 border-primary/20'
              : 'text-muted-foreground bg-background/80'
          )}
        >
          {selectedPreset ? (
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px] font-medium">{selectedPreset.title}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 rounded-xl p-0 z-[80] border border-border/50 bg-popover shadow-lg"
        sideOffset={8}
      >
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">Camera Presets</h4>
          <button
            onClick={handleAddPreset}
            disabled={saving}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            + Add
          </button>
        </div>

        <div className="flex flex-col max-h-[320px] overflow-y-auto p-1.5">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {allPresets.map(preset => {
            const isSelected = selectedPreset?.id === preset.id
            const isCustom = !preset.isBuiltIn

            return (
              <DropdownMenuItem
                key={preset.id}
                onSelect={event => handleSelect(preset, event)}
                className={clsx(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-left cursor-pointer transition-colors group',
                  isSelected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60'
                )}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{preset.title}</span>
                    {isCustom && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{preset.prompt}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCustom && (
                    <button
                      onClick={e => handleDeletePreset(preset.id, e)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            )
          })}
        </div>

        {selectedPreset && (
          <div className="p-1.5 pt-0 border-t border-border/30">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-8 rounded-lg"
              onClick={event => {
                event.preventDefault()
                onClear()
                onOpenChange?.(false)
              }}
            >
              Clear selection
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CameraLibrary
