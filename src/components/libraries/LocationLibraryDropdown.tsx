'use client'

import React from 'react'
import clsx from 'clsx'
import { Check, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type LocationLibraryAsset = {
  id: string
  name: string
  subtitle: string
  imageUrl: string
}

// const LOCATION_LIBRARY_ASSETS: LocationLibraryAsset[] = [] // No longer used

type LocationLibraryDropdownProps = {
  selectedAsset: LocationLibraryAsset | null
  onSelect: (asset: LocationLibraryAsset) => void
  onClear: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const LocationLibraryDropdown: React.FC<LocationLibraryDropdownProps> = ({
  selectedAsset,
  onSelect,
  onClear,
  open,
  onOpenChange,
}) => {
  const [assets, setAssets] = React.useState<LocationLibraryAsset[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchAssets = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/locations')
      if (!response.ok) throw new Error('Failed to fetch locations')
      const result = await response.json()
      if (result.success) {
        setAssets(result.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          subtitle: item.subtitle || 'Uploaded Reference',
          imageUrl: item.image_url
        })))
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      fetchAssets()
    }
  }, [open, fetchAssets])

  const handleDelete = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      const response = await fetch('/api/locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId }),
      })

      if (!response.ok) throw new Error('Failed to delete location')

      if (selectedAsset?.id === assetId) {
        onClear()
      }
      await fetchAssets()
    } catch (error) {
      console.error('Error deleting location:', error)
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            className={clsx(
              'h-9 px-3 text-sm transition-all duration-300 shadow-sm',
              'border border-border/40 hover:border-violet-400/40 hover:bg-violet-500/5',
              selectedAsset
                ? 'text-violet-600 dark:text-violet-300 bg-violet-500/10 border-violet-500/20'
                : 'text-muted-foreground bg-background/60 backdrop-blur-sm'
            )}
          >
            {selectedAsset ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm overflow-hidden relative ring-1 ring-black/5 dark:ring-white/10 shadow-sm">
                  <img src={selectedAsset.imageUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <span className="truncate max-w-[100px] font-medium">{selectedAsset.name}</span>
              </div>
            ) : (
              <span className="font-normal">Location</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-80 rounded-2xl p-0 z-[80] border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl supports-[backdrop-filter]:bg-background/60'
          sideOffset={8}
        >
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Location Reference</h4>
          </div>

          {loading && assets.length === 0 ? (
            <div className="py-12 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">Loading locations...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 mb-3 transition-colors hover:bg-violet-500/20">
                <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">No locations yet</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px] leading-relaxed">Add a location image to set the scene and lighting.</p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <div className='flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-scrollbar p-1'>
                {assets.map(asset => (
                  <div key={asset.id} className="relative group/item">
                    <button
                      type='button'
                      onClick={() => {
                        onSelect(asset)
                        onOpenChange?.(false)
                      }}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-xl border p-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 group',
                        selectedAsset?.id === asset.id
                          ? 'border-violet-500/50 bg-violet-500/5 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                          : 'border-transparent hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5'
                      )}
                      aria-label={`Select ${asset.name} location reference`}
                    >
                      <div className='h-10 w-14 overflow-hidden rounded-lg flex-shrink-0 bg-muted/20 border border-border/20'>
                        <img src={asset.imageUrl} alt={asset.name} className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105' />
                      </div>
                      <div className='flex flex-col text-left overflow-hidden'>
                        <span className={clsx(
                          'text-xs font-medium truncate transition-colors',
                          selectedAsset?.id === asset.id ? 'text-violet-700 dark:text-violet-300' : 'text-foreground/80'
                        )}>{asset.name}</span>
                        <span className='text-[10px] text-muted-foreground truncate'>{asset.subtitle}</span>
                      </div>
                      {selectedAsset?.id === asset.id && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center">
                          <Check className='h-3 w-3 text-violet-500' strokeWidth={2} />
                        </div>
                      )}
                    </button>

                    {/* Delete Button - Only visible on hover */}
                    <button
                      onClick={(e) => handleDelete(e, asset.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                      title="Delete location"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

              </div>

              {selectedAsset && (
                <div className="px-1 pt-1 mt-1">
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='w-full h-8 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors'
                    onClick={() => {
                      onClear()
                      onOpenChange?.(false)
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export default LocationLibraryDropdown
