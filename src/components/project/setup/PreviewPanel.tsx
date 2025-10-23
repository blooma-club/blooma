'use client'

import React from 'react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { getImageGenerationModels, getModelInfo } from '@/lib/fal-ai'

type Character = {
  id: string
  imageUrl?: string
}

type Props = {
  script: string
  characters: Character[]
  onBack?: () => void
  onEditScript?: () => void
  onEditCharacters?: () => void
  onGenerateStoryboard?: () => void
  generating?: boolean
  selectedModel: string
  setSelectedModel: (s: string) => void
  ratio: '16:9' | '1:1' | '9:16'
  setRatio: (r: '16:9' | '1:1' | '9:16') => void
  visualStyle: string
  onOpenStyleGallery: () => void
}

export default function PreviewPanel({
  script,
  characters,
  onBack,
  onEditScript,
  onEditCharacters,
  onGenerateStoryboard,
  generating,
  selectedModel,
  setSelectedModel,
  ratio,
  setRatio,
  visualStyle,
  onOpenStyleGallery,
}: Props) {
  const stylePresets: { id: string; label: string; img: string }[] = [
    { id: 'photo', label: 'Photo realistic', img: '/styles/photo.jpg' },
    { id: 'cinematic', label: 'Cinematic', img: '/styles/cinematic.jpg' },
    { id: 'watercolor', label: 'Watercolor', img: '/styles/watercolor.jpg' },
    { id: 'lineart', label: 'Line Art', img: '/styles/lineart.jpg' },
    { id: 'pixel', label: 'Pixel', img: '/styles/pixel.jpg' },
  ]

  const selectedStyle = stylePresets.find(entry => entry.id === visualStyle)
  const scriptLineCount = script?.trim() ? script.split('\n').filter(Boolean).length : 0

  return (
    <div className="space-y-6 text-white">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900 p-6 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Generated script
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEditScript}
                  className="rounded-full border border-neutral-700 bg-neutral-900/90 px-4 text-xs text-white hover:bg-neutral-800"
                >
                  Edit
                </Button>

                <Button
                  type="button"
                  onClick={onEditCharacters}
                  className="rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-neutral-200"
                >
                  Select
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
              <span>{scriptLineCount} lines</span>
              <span>{script.length} characters</span>
            </div>
            <div
              className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-5 text-sm leading-relaxed text-neutral-200"
              aria-label="Script content"
              tabIndex={0}
            >
              {script?.trim() ? script : 'No script yet.'}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900 p-6 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Models</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onEditCharacters}
                className="rounded-full border border-neutral-700 bg-neutral-900/80 px-4 text-xs text-white hover:bg-neutral-800"
              >
                Edit models
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {characters && characters.length > 0 ? (
                characters.map((character, index) => (
                  <div
                    key={character.id || index}
                    className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950"
                  >
                    <div className="relative w-full pb-[150%]">
                      {character.imageUrl ? (
                        <Image
                          src={character.imageUrl}
                          alt={`character-${index}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
                          No image
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-neutral-700/80 bg-neutral-900/70 p-6 text-center text-xs text-neutral-400">
                  No models yet. Select to configure characters before generating the storyboard.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900 p-6 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Visual settings</h3>
            </div>
            <div className="mt-4 space-y-6 text-[13px]">
              <section>
                <div className="mb-2 flex items-center justify-between text-sm font-medium">
                  <span className="text-neutral-300">AI model</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-left text-sm text-white transition hover:border-neutral-500 hover:bg-neutral-800"
                    >
                      <span>{getModelInfo(selectedModel)?.name || selectedModel}</span>
                      <svg
                        className="h-4 w-4 text-neutral-500"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    sideOffset={4}
                    className="w-64 rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl"
                  >
                    <DropdownMenuLabel className="rounded-t-xl border-b border-neutral-700 bg-neutral-800 px-4 py-3 text-xs font-semibold text-neutral-300">
                      Select AI model
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={selectedModel}
                      onValueChange={value => setSelectedModel(value)}
                    >
                      {getImageGenerationModels().map(model => (
                        <DropdownMenuRadioItem
                          key={model.id}
                          value={model.id}
                          className="px-4 py-3 text-sm text-white transition hover:bg-neutral-800"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-neutral-400">{model.description}</span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-neutral-300">
                  <span>Aspect ratio</span>
                  <span className="text-xs text-neutral-500">{ratio}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-left text-sm text-white transition hover:border-neutral-500 hover:bg-neutral-800"
                    >
                      <span>{ratio}</span>
                      <svg
                        className="fixed h-4 w-4 text-neutral-500"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    sideOffset={4}
                    className="w-48 rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl"
                  >
                    <DropdownMenuLabel className="rounded-t-xl border-b border-neutral-700 bg-neutral-800 px-4 py-3 text-xs font-semibold text-neutral-300">
                      Select aspect ratio
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={ratio}
                      onValueChange={value => setRatio(value as typeof ratio)}
                    >
                      {(['9:16', '3:4', '1:1', '4:3', '16:9'] as const).map(option => (
                        <DropdownMenuRadioItem
                          key={option}
                          value={option}
                          className="px-4 py-3 text-sm text-white transition hover:bg-neutral-800"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-shrink-0 border border-neutral-400 rounded-[2px] bg-neutral-800"
                              style={{
                                aspectRatio: option.includes(':')
                                  ? `${option.split(':')[0]} / ${option.split(':')[1]}`
                                  : '1 / 1',

                                // Fixed visual height for consistency
                                height: '20px',
                                width: 'auto',
                              }}
                            />
                            <span>{option}</span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-neutral-300">
                  <span>Visual style</span>
                  <button
                    type="button"
                    className="text-xs text-neutral-300 underline-offset-4 hover:underline"
                    onClick={onOpenStyleGallery}
                  >
                    Change
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onOpenStyleGallery}
                  className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-neutral-700 text-left transition hover:border-neutral-500"
                >
                  <div className="relative w-full pb-[75%]">
                    <Image
                      src={selectedStyle?.img || '/styles/photo.jpg'}
                      alt={selectedStyle?.label || 'Selected style'}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 text-[10px] uppercase tracking-[0.18em] text-white">
                      Selected
                    </span>
                  </div>
                  <div className="bg-black/70 px-3 py-2 text-xs font-medium text-white">
                    {selectedStyle?.label || 'Photo realistic'}
                  </div>
                </button>
              </section>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-full border border-neutral-700 bg-neutral-900/90 px-6 text-sm text-white transition hover:bg-neutral-800"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onGenerateStoryboard}
          disabled={generating || !script?.trim() || characters.length === 0}
          className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
        >
          {generating ? 'Generating image...' : 'Generate image'}
        </Button>
      </div>
    </div>
  )
}
