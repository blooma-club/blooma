'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDndContext,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

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
import { parseScript } from '@/lib/scriptParser'
import { cn } from '@/lib/utils'
import { usePreviewScenesStore } from '@/store/previewScenes'
import type { SceneEntry } from '@/store/previewScenes'
import type { Character as CharacterModel } from './character-wizard/types'

const CHARACTER_DRAG_TYPE = 'preview-character'

type DraggedCharacterData = {
  type: typeof CHARACTER_DRAG_TYPE
  character: CharacterModel
}

const createHandleFromName = (name?: string) => {
  if (!name) return undefined
  const compact = name.replace(/[^a-z0-9]+/gi, '').toLowerCase()
  return compact ? `@${compact}` : undefined
}

type Props = {
  script: string
  characters: CharacterModel[]
  onBack?: () => void
  onEditScript?: () => void
  onEditCharacters?: () => void
  onGenerateStoryboard?: (sceneMetadata?: { sceneId: string; metadata: any[] }[]) => void
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )
  const stylePresets: { id: string; label: string; img: string }[] = [
    { id: 'photo', label: 'Photo realistic', img: '/styles/photo.jpg' },
    { id: 'cinematic', label: 'Cinematic', img: '/styles/cinematic.jpg' },
    { id: 'watercolor', label: 'Watercolor', img: '/styles/watercolor.jpg' },
    { id: 'lineart', label: 'Line Art', img: '/styles/lineart.jpg' },
    { id: 'pixel', label: 'Pixel', img: '/styles/pixel.jpg' },
  ]

  const selectedStyle = stylePresets.find(entry => entry.id === visualStyle)
  const scriptLineCount = script?.trim() ? script.split('\n').filter(Boolean).length : 0
  const parsedScenes = useMemo(() => parseScript(script || ''), [script])
  const scenes = usePreviewScenesStore(state => state.scenes)
  const initializeScenes = usePreviewScenesStore(state => state.initializeScenes)
  const assignCharacterToScene = usePreviewScenesStore(state => state.assignCharacterToScene)
  const removeCharacterFromScene = usePreviewScenesStore(state => state.removeCharacterFromScene)
  const selectedModelInfo = useMemo(() => getModelInfo(selectedModel), [selectedModel])
  const [activeCharacter, setActiveCharacter] = useState<CharacterModel | null>(null)
  const [activeCharacterWidth, setActiveCharacterWidth] = useState<number | null>(null)

  useEffect(() => {
    if (!script?.trim()) {
      initializeScenes([])
      return
    }

    const seeds = parsedScenes.map((scene, index) => {
      const headerLine = scene.raw.split('\n')[0]?.trim() ?? ''
      const fallbackTitle = scene.sceneNumber ? `Scene ${scene.sceneNumber}` : `Scene ${index + 1}`

      let title = fallbackTitle
      let description = scene.shotDescription.trim() || undefined

      if (headerLine) {
        let headerTitle = headerLine
        let headerDescription: string | undefined

        const colonIndex = headerLine.indexOf(':')
        if (colonIndex >= 0) {
          headerTitle = headerLine.slice(0, colonIndex).trim() || headerTitle
          headerDescription = headerLine.slice(colonIndex + 1).trim() || undefined
        } else {
          const hyphenMatch = headerLine.match(/\s[-–—]\s/)
          if (hyphenMatch && hyphenMatch.index !== undefined) {
            headerTitle = headerLine.slice(0, hyphenMatch.index).trim() || headerTitle
            headerDescription =
              headerLine.slice(hyphenMatch.index + hyphenMatch[0].length).trim() || undefined
          }
        }

        if (headerTitle) {
          title = headerTitle
        }
        if (headerDescription) {
          description = headerDescription
        }
      }

      return {
        id: `scene-${scene.sceneNumber ?? index + 1}-${index}`,
        order: index,
        title,
        raw: scene.raw,
        description,
      }
    })
    initializeScenes(seeds)
  }, [initializeScenes, parsedScenes, script])

  const handleCharacterDrop = useCallback(
    (sceneId: string, character: CharacterModel) => {
      if (!character) return
      assignCharacterToScene(sceneId, {
        characterId: character.id,
        characterName: character.name,
        characterHandle: createHandleFromName(character.name),
        characterImageUrl: character.image_url,
        modelId: selectedModel,
        modelLabel: selectedModelInfo?.name ?? selectedModel,
      })
    },
    [assignCharacterToScene, selectedModel, selectedModelInfo]
  )

  const handleRemoveCharacter = useCallback(
    (sceneId: string, characterId: string) => {
      removeCharacterFromScene(sceneId, characterId)
    },
    [removeCharacterFromScene]
  )

  const clearActiveCharacter = useCallback(() => {
    setActiveCharacter(null)
    setActiveCharacterWidth(null)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active?.data?.current as DraggedCharacterData | undefined
    if (!data || data.type !== CHARACTER_DRAG_TYPE || !data.character) return
    setActiveCharacter(data.character)

    const activeRect = event.active.rect.current
    const measuringRect = activeRect.translated ?? activeRect.initial
    if (measuringRect) {
      setActiveCharacterWidth(measuringRect.width)
    } else {
      setActiveCharacterWidth(null)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const data = active?.data?.current as DraggedCharacterData | undefined
      if (data && data.type === CHARACTER_DRAG_TYPE && data.character && over) {
        handleCharacterDrop(String(over.id), data.character)
      }
      clearActiveCharacter()
    },
    [clearActiveCharacter, handleCharacterDrop]
  )

  const handleDragCancel = useCallback(() => {
    clearActiveCharacter()
  }, [clearActiveCharacter])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6 text-white">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900 p-6 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                    Generated script
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Drag a model card onto the matching script section to reference it during
                    generation.
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
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                <span>{scriptLineCount} lines</span>
                <span>{script.length} characters</span>
              </div>
              <div
                className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl p-5 text-sm leading-relaxed text-neutral-200"
                aria-label="Script content"
                tabIndex={0}
              >
                {script?.trim() ? (
                  scenes.length > 0 ? (
                    <div className="space-y-4">
                      {scenes.map(scene => (
                        <ScriptSceneDropZone
                          key={scene.id}
                          scene={scene}
                          onRemove={handleRemoveCharacter}
                        />
                      ))}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap">{script}</pre>
                  )
                ) : (
                  'No script yet.'
                )}
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
                  characters.map(character => (
                    <DraggableCharacterCard key={character.id} character={character} />
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
            onClick={() => {
              const sceneMetadata = scenes.map(scene => ({
                sceneId: scene.id,
                metadata: scene.metadata,
              }))
              onGenerateStoryboard?.(sceneMetadata)
            }}
            disabled={generating || !script?.trim() || characters.length === 0}
            className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
          >
            {generating ? 'Generating image...' : 'Generate image'}
          </Button>
        </div>
      </div>
      <DragOverlay>
        {activeCharacter ? (
          <CharacterCardShell
            character={activeCharacter}
            showDragHint={false}
            className="pointer-events-none border-neutral-700 shadow-xl"
            style={{ width: activeCharacterWidth ?? undefined }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

type ScriptSceneDropZoneProps = {
  scene: SceneEntry
  onRemove: (sceneId: string, characterId: string) => void
}

const ScriptSceneDropZone: React.FC<ScriptSceneDropZoneProps> = ({ scene, onRemove }) => {
  const { active } = useDndContext()
  const { isOver, setNodeRef } = useDroppable({
    id: scene.id,
  })
  const canDrop = active?.data?.current
    ? (active.data.current as DraggedCharacterData).type === CHARACTER_DRAG_TYPE
    : false
  const dropActive = Boolean(isOver && canDrop)

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-4 transition ${
        dropActive
          ? 'bg-neutral-950/60 shadow-[0_12px_30px_-20px_rgba(0,0,0,0.8)]'
          : 'hover:bg-neutral-950/20'
      }`}
    >
      <pre className="mt-4 whitespace-pre-wrap text-sm text-neutral-200">{scene.raw}</pre>

      {scene.metadata.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-neutral-800/80 pt-3">
          {scene.metadata.map(entry => (
            <div
              key={`${scene.id}-${entry.characterId}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-neutral-800/80 bg-neutral-900/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{entry.characterName}</p>
                <p className="truncate text-[11px] text-neutral-400">{entry.modelLabel}</p>
                {entry.characterHandle ? (
                  <p className="truncate text-[11px] text-neutral-500">{entry.characterHandle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onRemove(scene.id, entry.characterId)}
                className="rounded-md border border-neutral-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-300 transition hover:border-neutral-500 hover:text-white hover:bg-neutral-800"
              >
                Clear
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type DraggableCharacterCardProps = {
  character: CharacterModel
}

type CharacterCardShellProps = React.ComponentPropsWithoutRef<'div'> & {
  character: CharacterModel
  showDragHint?: boolean
}

const CharacterCardShell = React.forwardRef<HTMLDivElement, CharacterCardShellProps>(
  ({ character, className, style, showDragHint = true, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden rounded-xl border bg-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        className
      )}
      style={style}
      {...rest}
    >
      <div className="relative w-full pb-[150%]">
        {character.image_url ? (
          <Image src={character.image_url} alt={character.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
            No image
          </div>
        )}
        {showDragHint ? (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white">
            Drag onto script
          </div>
        ) : null}
      </div>
      <div className="border-t border-neutral-800/70 bg-neutral-900/80 px-3 py-2 text-center text-xs font-medium text-white">
        {character.name}
      </div>
    </div>
  )
)
CharacterCardShell.displayName = 'CharacterCardShell'

const DraggableCharacterCard: React.FC<DraggableCharacterCardProps> = ({ character }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `preview-character-${character.id}`,
    data: { type: CHARACTER_DRAG_TYPE, character },
  })
  const style = transform ? CSS.Translate.toString(transform) : undefined

  return (
    <CharacterCardShell
      ref={setNodeRef}
      character={character}
      showDragHint={!isDragging}
      className={cn(
        'border-neutral-800/80 hover:border-neutral-700 transition-colors duration-200',
        isDragging && 'border-neutral-500'
      )}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: style,
        touchAction: 'none',
        transition: isDragging ? 'transform 0s, opacity 120ms ease' : undefined,
        opacity: isDragging ? 0 : 1,
      }}
      aria-label={`Drag ${character.name} onto the script`}
      {...attributes}
      {...listeners}
    />
  )
}
