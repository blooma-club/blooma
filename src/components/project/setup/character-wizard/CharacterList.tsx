'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Character } from './types'

type Props = {
  characters: Character[]
  onEdit: (character: Character) => void
  onRemove: (index: number) => void
  onUseAsReference: (character: Character) => void
  onRequestUpload: () => void
  onRequestGenerate: () => void
}

export function CharacterList({
  characters,
  onEdit,
  onRemove,
  onUseAsReference,
  onRequestUpload,
  onRequestGenerate,
}: Props) {
  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Models</h4>
            <p className="mt-1 text-xs text-neutral-500">0 models</p>
          </div>
        </div>

        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-700 bg-neutral-800/30 text-sm text-neutral-500">
          <p>No models yet</p>
          <div className="flex gap-3">
            <Button
              onClick={onRequestUpload}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700"
            >
              Upload Model
            </Button>
            <Button
              onClick={onRequestGenerate}
              className="rounded-lg bg-white px-4 py-2 text-sm text-black hover:bg-neutral-200"
            >
              Generate Model
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">Models</h4>
          <p className="mt-1 text-xs text-neutral-500">
            {characters.length} model{characters.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {characters.map((char, idx) => (
          <div
            key={char.id}
            className="group relative rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow transition hover:border-neutral-700"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-neutral-800">
              {char.imageUrl ? (
                <Image
                  src={char.imageUrl}
                  alt={char.name}
                  width={240}
                  height={320}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                  No image
                </div>
              )}
            </div>
            <div className="mt-2 truncate text-center text-sm font-medium text-white">
              {char.name}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(char)}
                className="rounded-md border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
              >
                Edit
              </button>
              {char.imageUrl ? (
                <button
                  type="button"
                  onClick={() => onUseAsReference(char)}
                  className="rounded-md border border-transparent px-3 py-1 text-xs font-medium text-blue-300 transition hover:text-blue-100"
                >
                  Use as Ref
                </button>
              ) : null}
            </div>
            <button
              onClick={() => onRemove(idx)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex aspect-[3/4] w-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-neutral-800/30 text-neutral-400 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-2xl text-white shadow transition group-hover:border-neutral-600">
                +
              </span>
              <span className="mt-4 text-sm font-medium">Add Model</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 rounded-lg border border-neutral-800 bg-neutral-900 text-white">
            <DropdownMenuItem
              className="cursor-pointer px-4 py-2.5 text-sm hover:bg-neutral-800"
              onSelect={onRequestUpload}
            >
              Upload your own
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer px-4 py-2.5 text-sm hover:bg-neutral-800"
              onSelect={onRequestGenerate}
            >
              Generate a new one
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

