'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type OptionalSettings = {
  intent: string
  genre: string
  tone: string
  audience: string
  objective: string
  keyMessage: string
  language: string
  constraints: string
  aiModel: string
}

type Props = {
  settings: OptionalSettings
  onChange: (next: Partial<OptionalSettings>) => void
}

const intents = [
  'Advertisement/Commercial',
  'Social Media Post',
  'YouTube Video',
  'Product Demo',
  'Explainer Video',
  'Short-form (Reels/TikTok)',
  'Game Trailer',
  'Short Film',
  'Other',
]

const languages = [
  'English',
  'Chinese',
  'Korean',
  'Japanese',
  'French',
  'Spanish',
  'German',
  'Italian',
]

const aiModels = [
  {
    id: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash',
  },
]

export default function OptionalSettingsPanel({ settings, onChange }: Props) {
  return (
    <section
      className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6"
      aria-label="Optional Settings"
      tabIndex={0}
    >
      <h3 className="text-sm font-semibold text-white mb-4">Optional Settings</h3>

      <div className="space-y-4 text-sm">
        <div>
          <label className="block text-neutral-300 mb-1">What are you creating?</label>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white text-left flex items-center justify-between">
              <span>{settings.intent || 'Select'}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[200px] bg-neutral-900 border-neutral-700">
              <DropdownMenuRadioGroup
                value={settings.intent}
                onValueChange={value => onChange({ intent: value })}
              >
                <DropdownMenuRadioItem value="" className="text-white hover:bg-neutral-800">
                  Select
                </DropdownMenuRadioItem>
                {intents.map(v => (
                  <DropdownMenuRadioItem
                    key={v}
                    value={v}
                    className="text-white hover:bg-neutral-800"
                  >
                    {v}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-300 mb-1">Genre</label>
            <input
              value={settings.genre}
              onChange={e => onChange({ genre: e.target.value })}
              placeholder="e.g. Cinematic, Comedy, Documentary"
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
              aria-label="Genre"
            />
          </div>
          <div>
            <label className="block text-neutral-300 mb-1">Tone/Mood</label>
            <input
              value={settings.tone}
              onChange={e => onChange({ tone: e.target.value })}
              placeholder="e.g. Energetic, Serious, Emotional, Dynamic"
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
              aria-label="Tone/Mood"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">Target Audience</label>
          <input
            value={settings.audience}
            onChange={e => onChange({ audience: e.target.value })}
            placeholder="e.g. Young professionals, Parents, Gamers"
            className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
            aria-label="Target Audience"
          />
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">Objective/Purpose</label>
          <input
            value={settings.objective}
            onChange={e => onChange({ objective: e.target.value })}
            placeholder="e.g. Increase conversions, Brand awareness, Product introduction"
            className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
            aria-label="Objective"
          />
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">Key Message</label>
          <input
            value={settings.keyMessage}
            onChange={e => onChange({ keyMessage: e.target.value })}
            placeholder="Short and clear message"
            className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
            aria-label="Key Message"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-300 mb-1">Language</label>
            <select
              value={settings.language}
              onChange={e => onChange({ language: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white"
              aria-label="Language"
            >
              {languages.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-neutral-300 mb-1">Constraints</label>
            <input
              value={settings.constraints}
              onChange={e => onChange({ constraints: e.target.value })}
              placeholder="Restrictions/Brand guidelines"
              className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
              aria-label="Constraints"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">AI Model for Script Generation</label>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-white text-left flex items-center justify-between">
              <span>{aiModels.find(m => m.id === settings.aiModel)?.label || 'Gemini 2.0 Flash'}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[300px] bg-neutral-900 border-neutral-700">
              <DropdownMenuRadioGroup
                value={settings.aiModel || 'gemini-2.0-flash-exp'}
                onValueChange={value => onChange({ aiModel: value })}
              >
                {aiModels.map(model => (
                  <DropdownMenuRadioItem
                    key={model.id}
                    value={model.id}
                    className="text-white hover:bg-neutral-800 p-3"
                  >
                    {model.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  )
}
