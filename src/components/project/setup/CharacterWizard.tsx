'use client'

import React, { useCallback, useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { getImageGenerationModels } from '@/lib/fal-ai'

type Character = {
  id: string
  imageUrl?: string
}

type Props = {
  onChange: (characters: Character[]) => void
  initial?: Character[]
}

export default function CharacterWizard({ onChange, initial }: Props) {
  const [characters, setCharacters] = useState<Character[]>(initial || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // characters 상태가 변경될 때마다 부모에게 알림 (onChange ref로 고정)
  const onChangeRef = React.useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => {
    onChangeRef.current(characters)
  }, [characters])
  // Character 모델은 지정된 4가지만 허용 (Imagen4 Fast 제외)
  const allowedCharacterModelIds = [
    'fal-ai/imagen4',
    'fal-ai/bytedance/seedream/v4/text-to-image',
    'fal-ai/flux-pro/kontext/text-to-image',
    'fal-ai/flux-pro/v1.1-ultra',
  ] as const

  const allowedCharacterModels = getImageGenerationModels()
    .filter(m => allowedCharacterModelIds.includes(m.id as typeof allowedCharacterModelIds[number]))

  const [model, setModel] = useState<string>(() => {
    const first = allowedCharacterModels[0]
    return first?.id || 'fal-ai/imagen4'
  })

  const [imagePrompt, setImagePrompt] = useState<string>('')

  // 단일 이미지 생성 후 리스트에 추가
  const handleGenerateImage = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const prompt = imagePrompt?.trim().length
        ? imagePrompt.trim()
        : 'portrait of an original cinematic character, detailed, professional lighting, neutral background'
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId: model, aspectRatio: '3:4', quality: 'balanced' })
      })
      const data = await res.json()
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || 'Image generation failed')
      const entry: Character = { id: `img-${Date.now()}`, imageUrl: data.imageUrl as string }
      setCharacters(prev => [...prev, entry])
    } catch (e: any) {
      setError(e.message || 'Image generation failed')
    } finally {
      setLoading(false)
    }
  }, [imagePrompt, model, onChange])

  const handleRemove = (idx: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx))
  }



  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start min-w-[1200px]">
      {/* Left: Generator panel */}
      <div className="space-y-6">
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Generate Character Image</h3>
          <div className="space-y-4">
            <div>
              {loading ? (
                <div className="aspect-[3/4] w-full rounded-md overflow-hidden bg-neutral-800 border-2 border-blue-500 border-dashed flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm text-blue-400">Generating...</div>
                  </div>
                </div>
              ) : characters.length > 0 ? (
                <div className="aspect-[3/4] w-full rounded-md overflow-hidden bg-neutral-800">
                  <Image 
                    src={characters[characters.length - 1].imageUrl!} 
                    alt="Latest character" 
                    width={400} 
                    height={533} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] w-full rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <div className="text-neutral-500 text-lg">Empty</div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Character Description</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the character (e.g., 'young woman with curly hair, wearing a blue dress')"
                className="w-full p-3 border border-neutral-700 rounded-md bg-neutral-900 text-white placeholder-neutral-400"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Model</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-200 inline-flex items-center justify-between group">
                    <span className="font-medium text-sm">{allowedCharacterModels.find(m=>m.id===model)?.name || 'Select Model'}</span>
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-300 transition-colors" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={4} className="w-64 border border-neutral-700 bg-neutral-900 shadow-xl rounded-lg">
                  <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
                    {allowedCharacterModels.map((m) => (
                      <DropdownMenuRadioItem key={m.id} value={m.id} className="px-4 py-3 hover:bg-neutral-800 cursor-pointer text-white border-b border-neutral-700 last:border-b-0 transition-colors">
                        {m.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              onClick={handleGenerateImage}
              disabled={loading}
              className="w-full h-12"
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        </div>
      </div>

      {/* Right: List panel */}
      <div className="lg:col-span-2 min-w-[800px]">
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6 min-h-[600px]">
          <h4 className="text-md font-semibold text-white mb-4">Character List ({characters.length})</h4>
          {characters.length === 0 ? (
            <div className="text-neutral-400 text-sm">No characters yet. Generate one on the left.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {characters.map((char, idx) => (
                <div key={char.id} className="relative group min-w-[150px]">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-neutral-800 min-h-[200px]">
                    {char.imageUrl ? (
                      <Image
                        src={char.imageUrl}
                        alt={`Character ${idx + 1}`}
                        width={300}
                        height={450}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
