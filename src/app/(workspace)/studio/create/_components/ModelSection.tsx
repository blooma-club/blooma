'use client'

import React from 'react'
import Image from 'next/image'
import { Plus, Upload, FolderOpen, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import type { ModelLibraryAsset } from '@/components/libraries/ModelLibraryDropdown'
import ModelLibraryDropdown from '@/components/libraries/ModelLibraryDropdown'

interface ModelSectionProps {
  selectedModels: ModelLibraryAsset[]
  setSelectedModels: React.Dispatch<React.SetStateAction<ModelLibraryAsset[]>>
  isModelAutoMode: boolean
  setIsModelAutoMode: (value: boolean) => void
  isLibraryOpen: boolean
  setIsLibraryOpen: (value: boolean) => void
  isAddMenuOpen: boolean
  setIsAddMenuOpen: (value: boolean) => void
  modelFileInputRef: React.RefObject<HTMLInputElement | null>
  handleModelSelect: (asset: ModelLibraryAsset) => void
  accordionCardClass: string
}

export function ModelSection({
  selectedModels,
  setSelectedModels,
  isModelAutoMode,
  setIsModelAutoMode,
  isLibraryOpen,
  setIsLibraryOpen,
  isAddMenuOpen,
  setIsAddMenuOpen,
  modelFileInputRef,
  handleModelSelect,
  accordionCardClass,
}: ModelSectionProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = React.useState(0)

  React.useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return

    const updateHeight = () => {
      setContentHeight(node.scrollHeight)
    }

    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const contentStyle = {
    height: isModelAutoMode ? 0 : contentHeight,
    '--radix-accordion-content-height': `${contentHeight}px`,
  } as React.CSSProperties

  const removeModel = (modelId: string) => {
    const modelToRemove = selectedModels.find(m => m.id === modelId)
    if (modelToRemove?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(modelToRemove.imageUrl)
    }
    setSelectedModels(prev => prev.filter(m => m.id !== modelId))
  }

  return (
    <div className={accordionCardClass}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Model
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {isModelAutoMode ? 'Auto Mode' : 'Reference Mode'}
          </span>
        </div>
        <Switch
          checked={isModelAutoMode}
          onCheckedChange={checked => {
            setIsModelAutoMode(checked)
            if (checked) setSelectedModels([])
          }}
        />
      </div>
      <div
        data-state={isModelAutoMode ? 'closed' : 'open'}
        className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        style={contentStyle}
      >
        <div ref={contentRef} className="px-4 pt-2 pb-6">
          <div className="flex gap-3">
            {selectedModels.map(model => (
              <div
                key={model.id}
                className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden group border border-border/50"
              >
                <Image
                  src={model.imageUrl}
                  alt={model.name}
                  fill
                  className="object-cover object-center"
                  sizes="64px"
                  quality={60}
                  loading="lazy"
                  unoptimized
                />
                <button
                  onClick={() => removeModel(model.id)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ))}

            {selectedModels.length === 0 && (
              <Popover open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
                <PopoverTrigger asChild>
                  <button className="w-16 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1.5" align="start" sideOffset={8}>
                  <button
                    onClick={() => {
                      modelFileInputRef.current?.click()
                      setIsAddMenuOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsLibraryOpen(true)
                      setIsAddMenuOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span>Library</span>
                  </button>
                </PopoverContent>
              </Popover>
            )}

            <input
              ref={modelFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const tempModel: ModelLibraryAsset = {
                  id: `temp-${Date.now()}`,
                  name: file.name.split('.')[0],
                  subtitle: 'Uploaded',
                  imageUrl: URL.createObjectURL(file),
                }
                setSelectedModels([tempModel])
                e.target.value = ''
              }}
            />

            <div className="hidden">
              <ModelLibraryDropdown
                selectedAsset={selectedModels[0] || null}
                onSelect={handleModelSelect}
                onClear={() => setSelectedModels([])}
                open={isLibraryOpen}
                onOpenChange={setIsLibraryOpen}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
