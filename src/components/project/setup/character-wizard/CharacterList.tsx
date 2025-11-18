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
  onRequestUpload: () => void
  onRequestGenerate: () => void
}

export function CharacterList({
  characters,
  onEdit,
  onRemove,
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
              {char.image_url ? (
                <>
                  <Image
                    src={char.image_url}
                    alt={char.name}
                    width={240}
                    height={320}
                    className="h-full w-full object-cover"
                  />
                  {/* Edit icon overlay on hover */}
                  <button
                    type="button"
                    onClick={() => onEdit(char)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Edit character"
                  >
                    <svg
                      className="h-12 w-12 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                  No image
                </div>
              )}
            </div>
            <div className="mt-2 truncate text-center text-sm font-medium text-white">
              {char.name}
            </div>
            <button
              onClick={() => onRemove(idx)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
              aria-label="Remove character"
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
