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

export type CameraPreset = {
  id: string
  title: string
  prompt: string
  isBuiltIn?: boolean
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'front-view',
    title: 'Front view',
    prompt: 'front view, eye-level shot, 50mm lens, centered composition, natural lighting, clear subject focus, clean background',
    isBuiltIn: true,
  },
  {
    id: 'side-view',
    title: 'Side view',
    prompt: 'side view profile shot, 35mm lens, clear silhouette, simple background, minimalist framing',
    isBuiltIn: true,
  },
  {
    id: 'three-quarter',
    title: '3/4 view',
    prompt: '3/4 view angle, subject slightly turned, 35mm lens, soft background blur, natural pose',
    isBuiltIn: true,
  },
  {
    id: 'close-up',
    title: 'Close-up',
    prompt: 'close-up shot, 85mm portrait lens, shallow depth of field, strong bokeh, emphasis on details',
    isBuiltIn: true,
  },
  {
    id: 'low-angle',
    title: 'Low angle',
    prompt: 'low angle shot from below, 24mm wide lens, subject appears powerful, dramatic perspective',
    isBuiltIn: true,
  },
  {
    id: 'high-angle',
    title: 'High angle',
    prompt: 'high angle shot from above, 35mm lens, subject framed in environment, soft shadows',
    isBuiltIn: true,
  },
  {
    id: 'top-view',
    title: 'Top-down view',
    prompt: 'top-down flat lay view, overhead shot, 24mm wide lens, clean arrangement, graphic composition',
    isBuiltIn: true,
  },
]

const CUSTOM_CAMERA_PRESETS_STORAGE_KEY = 'blooma.customCameraPresets.v2'

// localStorage 폴백 함수들 (API 실패 시 사용)
export const loadCustomCameraPresetsFromStorage = (): CameraPreset[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_CAMERA_PRESETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is CameraPreset => {
      if (!value || typeof value !== 'object') return false
      const preset = value as Partial<CameraPreset>
      return typeof preset.id === 'string' && typeof preset.title === 'string' && typeof preset.prompt === 'string'
    })
  } catch {
    return []
  }
}

export const saveCustomCameraPresetsToStorage = (presets: CameraPreset[]): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_CAMERA_PRESETS_STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Silent failure – storage access may be blocked
  }
}

// API 함수들
export const fetchCustomCameraPresets = async (): Promise<CameraPreset[]> => {
  try {
    const res = await fetch('/api/camera-presets')
    if (!res.ok) throw new Error('Failed to fetch')
    const json = await res.json()
    const presets = json?.data?.presets || []
    // DB에서 가져온 데이터를 localStorage에도 동기화
    saveCustomCameraPresetsToStorage(presets)
    return presets
  } catch {
    // API 실패 시 localStorage 폴백
    return loadCustomCameraPresetsFromStorage()
  }
}

export const createCustomCameraPreset = async (preset: Omit<CameraPreset, 'isBuiltIn'>): Promise<CameraPreset | null> => {
  try {
    const res = await fetch('/api/camera-presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    })
    if (!res.ok) throw new Error('Failed to create')
    const json = await res.json()
    return json?.data?.preset || null
  } catch {
    // API 실패 시 localStorage에 저장
    const current = loadCustomCameraPresetsFromStorage()
    const newPreset = { ...preset, isBuiltIn: false }
    saveCustomCameraPresetsToStorage([...current, newPreset])
    return newPreset
  }
}

export const deleteCustomCameraPresetApi = async (presetId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/camera-presets?id=${encodeURIComponent(presetId)}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete')
    return true
  } catch {
    return false
  }
}

// 레거시 호환성을 위한 함수들
export const loadCustomCameraPresets = loadCustomCameraPresetsFromStorage
export const saveCustomCameraPresets = saveCustomCameraPresetsToStorage
export const deleteCustomCameraPreset = (presetId: string): CameraPreset[] => {
  const current = loadCustomCameraPresetsFromStorage()
  const updated = current.filter(p => p.id !== presetId)
  saveCustomCameraPresetsToStorage(updated)
  return updated
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
  const [customPresets, setCustomPresets] = React.useState<CameraPreset[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // 초기 로드 시 API에서 가져오기
  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchCustomCameraPresets()
      .then(presets => {
        if (mounted) setCustomPresets(presets)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const allPresets = React.useMemo(() => [...CAMERA_PRESETS, ...customPresets], [customPresets])

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
      if (created) {
        setCustomPresets(previous => [...previous, created])
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePreset = async (presetId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    
    if (!window.confirm('Delete this preset?')) return
    
    // 먼저 UI에서 제거
    setCustomPresets(previous => previous.filter(p => p.id !== presetId))
    
    // API 호출 (실패해도 localStorage 폴백)
    await deleteCustomCameraPresetApi(presetId)
    
    // localStorage에서도 삭제
    deleteCustomCameraPreset(presetId)
    
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
