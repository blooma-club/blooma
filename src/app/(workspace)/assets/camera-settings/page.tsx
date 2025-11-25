'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2, Camera, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CameraPreset } from '@/components/storyboard/libraries/CameraLibrary'
import {
  CAMERA_PRESETS,
  loadCustomCameraPresets,
  saveCustomCameraPresets,
  deleteCustomCameraPreset,
} from '@/components/storyboard/libraries/CameraLibrary'
import { cn } from '@/lib/utils'

type PresetFormState = {
  title: string
  prompt: string
}

const createEmptyFormState = (): PresetFormState => ({
  title: '',
  prompt: '',
})

export default function CameraSettingsPage() {
  const [customPresets, setCustomPresets] = useState<CameraPreset[]>(() => loadCustomCameraPresets())
  const [formState, setFormState] = useState<PresetFormState>(createEmptyFormState)
  const [creating, setCreating] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const allPresets = [...CAMERA_PRESETS, ...customPresets]

  const handleChange =
    (field: keyof PresetFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState(previous => ({
        ...previous,
        [field]: event.target.value,
      }))
    }

  const handleSavePreset = () => {
    const trimmedTitle = formState.title.trim()
    const trimmedPrompt = formState.prompt.trim()

    if (!trimmedTitle || !trimmedPrompt) {
      return
    }

    setCreating(true)
    try {
      const newPreset: CameraPreset = {
        id: `custom-camera-${Date.now()}`,
        title: trimmedTitle,
        prompt: trimmedPrompt,
        isBuiltIn: false,
      }

      const updatedCustom = [newPreset, ...customPresets]
      saveCustomCameraPresets(updatedCustom)
      setCustomPresets(updatedCustom)
      setFormState(createEmptyFormState())
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePreset = (presetId: string) => {
    if (!window.confirm('Delete this preset?')) return
    const updated = deleteCustomCameraPreset(presetId)
    setCustomPresets(updated)
  }

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Camera Presets</h1>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Camera preset guide"
              >
                <Info className="w-4 h-4" />
              </button>
              
              {showTooltip && (
                <div
                  className={cn(
                    'absolute left-0 top-6 z-50 w-80 rounded-lg border border-border/50 bg-popover p-4 shadow-lg',
                    'animate-in fade-in-0 zoom-in-95'
                  )}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">How to write effective camera prompts</p>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>
                        <span className="text-foreground font-medium">Angle:</span> front view, side view, 3/4 view, low
                        angle, high angle, top-down
                      </li>
                      <li>
                        <span className="text-foreground font-medium">Distance:</span> close-up, medium shot, full body, wide
                        shot
                      </li>
                      <li>
                        <span className="text-foreground font-medium">Lens:</span> 24mm wide, 35mm, 50mm, 85mm portrait,
                        telephoto
                      </li>
                      <li>
                        <span className="text-foreground font-medium">Depth:</span> shallow depth of field, bokeh, deep focus
                      </li>
                      <li>
                        <span className="text-foreground font-medium">Lighting:</span> natural light, soft lighting, dramatic
                        shadows, backlit
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground pt-1">
                      Example: "medium shot, 35mm lens, soft natural lighting, shallow depth of field, clean background"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Camera presets are automatically added to your prompts for consistent shot composition.
          </p>
        </div>

        {/* Create Form */}
        <section className="mb-8 rounded-xl border border-border/50 bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create custom preset
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                placeholder="e.g. Dramatic low angle, Product flat lay"
                value={formState.title}
                onChange={handleChange('title')}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Camera Prompt</label>
              <textarea
                placeholder="e.g. low angle shot, 24mm wide lens, dramatic lighting, subject appears powerful, sky visible"
                value={formState.prompt}
                onChange={handleChange('prompt')}
                className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSavePreset}
                disabled={creating || !formState.title.trim() || !formState.prompt.trim()}
                className="h-9 px-4 inline-flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save preset
              </Button>
            </div>
          </div>
        </section>

        {/* All Presets */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">All presets ({allPresets.length})</h2>
          <div className="grid gap-2">
            {allPresets.map(preset => {
              const isCustom = !preset.isBuiltIn

              return (
                <div
                  key={preset.id}
                  className="group rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium text-foreground truncate">{preset.title}</p>
                        {isCustom ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 pl-6">{preset.prompt}</p>
                    </div>

                    {isCustom && (
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Delete preset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
