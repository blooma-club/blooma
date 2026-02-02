'use client'

import React from 'react'
import Image from 'next/image'
import { Plus, Upload, FolderOpen, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AccordionContent, AccordionTrigger } from '@/components/ui/accordion'
import type { LocationLibraryAsset } from '@/components/libraries/LocationLibraryDropdown'
import LocationLibraryDropdown from '@/components/libraries/LocationLibraryDropdown'

interface LocationSectionProps {
  selectedLocations: LocationLibraryAsset[]
  setSelectedLocations: React.Dispatch<React.SetStateAction<LocationLibraryAsset[]>>
  isLocationLibraryOpen: boolean
  setIsLocationLibraryOpen: (value: boolean) => void
  isLocationAddMenuOpen: boolean
  setIsLocationAddMenuOpen: (value: boolean) => void
  locationFileInputRef: React.RefObject<HTMLInputElement | null>
  handleLocationSelect: (asset: LocationLibraryAsset) => void
  accordionCardClass: string
}

export function LocationSection({
  selectedLocations,
  setSelectedLocations,
  isLocationLibraryOpen,
  setIsLocationLibraryOpen,
  isLocationAddMenuOpen,
  setIsLocationAddMenuOpen,
  locationFileInputRef,
  handleLocationSelect,
  accordionCardClass,
}: LocationSectionProps) {
  const removeLocation = (locationId: string) => {
    const locToRemove = selectedLocations.find(l => l.id === locationId)
    if (locToRemove?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(locToRemove.imageUrl)
    }
    setSelectedLocations(prev => prev.filter(l => l.id !== locationId))
  }

  return (
    <div className={accordionCardClass}>
      <AccordionTrigger className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline">
        Location
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4 pt-2 pb-6">
          <div className="flex gap-3">
            {selectedLocations.map(loc => (
              <div
                key={loc.id}
                className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden group border border-border/50"
              >
                <Image
                  src={loc.imageUrl}
                  alt={loc.name}
                  fill
                  className="object-cover object-center"
                  sizes="64px"
                  quality={60}
                  loading="lazy"
                  unoptimized
                />
                <button
                  onClick={() => removeLocation(loc.id)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ))}

            {selectedLocations.length === 0 && (
              <Popover open={isLocationAddMenuOpen} onOpenChange={setIsLocationAddMenuOpen}>
                <PopoverTrigger asChild>
                  <button className="w-16 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1.5" align="start" sideOffset={8}>
                  <button
                    onClick={() => {
                      locationFileInputRef.current?.click()
                      setIsLocationAddMenuOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsLocationLibraryOpen(true)
                      setIsLocationAddMenuOpen(false)
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
              ref={locationFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const tempLoc: LocationLibraryAsset = {
                  id: `temp-loc-${Date.now()}`,
                  name: file.name.split('.')[0],
                  subtitle: 'Uploaded',
                  imageUrl: URL.createObjectURL(file),
                }
                setSelectedLocations([tempLoc])
                e.target.value = ''
              }}
            />

            <div className="hidden">
              <LocationLibraryDropdown
                selectedAsset={selectedLocations[0] || null}
                onSelect={handleLocationSelect}
                onClear={() => setSelectedLocations([])}
                open={isLocationLibraryOpen}
                onOpenChange={setIsLocationLibraryOpen}
              />
            </div>
          </div>
        </div>
      </AccordionContent>
    </div>
  )
}
