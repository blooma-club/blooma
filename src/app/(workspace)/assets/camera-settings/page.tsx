'use client'

import { useState } from 'react'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CameraPreset } from '@/components/storyboard/libraries/CameraLibrary'
import {
  CAMERA_PRESETS,
  loadCustomCameraPresets,
  saveCustomCameraPresets,
} from '@/components/storyboard/libraries/CameraLibrary'

type PresetFormState = {
  title: string
  lens: string
  movement: string
  prompt: string
}

const createEmptyFormState = (): PresetFormState => ({
  title: '',
  lens: '',
  movement: '',
  prompt: '',
})

export default function CameraSettingsPage() {
  const [presets, setPresets] = useState<CameraPreset[]>(() => [
    ...CAMERA_PRESETS,
    ...loadCustomCameraPresets(),
  ])
  const [formState, setFormState] = useState<PresetFormState>(createEmptyFormState)
  const [creating, setCreating] = useState(false)

  const handleChange =
    (field: keyof PresetFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        lens: formState.lens.trim() || '35mm prime',
        movement: formState.movement.trim() || 'handheld | shallow focus',
        prompt: trimmedPrompt,
      }

      const baseIds = new Set(CAMERA_PRESETS.map(preset => preset.id))
      const existingCustom = presets.filter(preset => !baseIds.has(preset.id))
      const updatedCustom = [newPreset, ...existingCustom]

      saveCustomCameraPresets(updatedCustom)
      setPresets([...CAMERA_PRESETS, ...updatedCustom])
      setFormState(createEmptyFormState())
    } finally {
      setCreating(false)
    }
  }

  const basePresets = CAMERA_PRESETS
  const customPresets = presets.filter(
    preset => !basePresets.some(base => base.id === preset.id)
  )

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Camera settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Save and reuse camera presets for consistent visual style.
            </p>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-border/40 bg-card/40 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Create custom preset
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                placeholder="e.g. 35mm close-up, 50mm medium shot"
                value={formState.title}
                onChange={handleChange('title')}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Lens / focal length
              </label>
              <Input
                placeholder="e.g. 35mm prime, 24mm wide"
                value={formState.lens}
                onChange={handleChange('lens')}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Movement / camera note
              </label>
              <Input
                placeholder="e.g. handheld, locked tripod, slow dolly-in"
                value={formState.movement}
                onChange={handleChange('movement')}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Prompt
              </label>
              <textarea
                placeholder="Describe framing, mood, and lighting in detail."
                value={formState.prompt}
                onChange={handleChange('prompt')}
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSavePreset}
              disabled={creating || !formState.title.trim() || !formState.prompt.trim()}
              className="h-9 px-4 inline-flex items-center gap-2 text-xs"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SlidersHorizontal className="w-4 h-4" />
              )}
              Save preset
            </Button>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Built-in presets
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              These presets are bundled with Blooma and cannot be edited.
            </p>
            <div className="grid gap-2">
              {basePresets.map(preset => (
                <div
                  key={preset.id}
                  className="rounded-xl border border-border/40 bg-card px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {preset.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {preset.lens} • {preset.movement}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                    {preset.prompt}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Custom presets
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Custom presets are stored in your browser and shared with the storyboard
              camera library.
            </p>
            {customPresets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">
                  No custom presets yet. Create one above to reuse your favorite camera
                  setups.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {customPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="rounded-xl border border-border/40 bg-card px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {preset.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {preset.lens} • {preset.movement}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                      {preset.prompt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
