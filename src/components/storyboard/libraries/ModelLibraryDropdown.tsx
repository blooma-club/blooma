'use client'

import React from 'react'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { uploadFileToR2 } from '@/lib/imageUpload'
import { Upload, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'

export type ModelLibraryAsset = {
  id: string
  name: string
  subtitle: string
  imageUrl: string
  isPublic?: boolean
}

// const MODEL_LIBRARY_ASSETS: ModelLibraryAsset[] = [] // No longer used as we fetch from API

type ModelLibraryDropdownProps = {
  selectedAsset: ModelLibraryAsset | null
  onSelect: (asset: ModelLibraryAsset) => void
  onClear: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const ModelLibraryDropdown: React.FC<ModelLibraryDropdownProps> = ({
  selectedAsset,
  onSelect,
  onClear,
  open,
  onOpenChange,
}) => {
  const [assets, setAssets] = React.useState<ModelLibraryAsset[]>([])
  const [loading, setLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const fetchAssets = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/models')
      if (!response.ok) throw new Error('Failed to fetch models')
      const result = await response.json()
      if (result.success) {
        setAssets(result.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          subtitle: item.subtitle || 'Uploaded Reference',
          imageUrl: item.image_url,
          isPublic: item.is_public === 1 || item.is_public === true || item.is_public === '1',
          userId: item.user_id // Map user_id from API
        })))
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      fetchAssets()
    }
  }, [open, fetchAssets])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      await uploadFileToR2(file, { type: 'model', assetId: `model-${Date.now()}` })
      await fetchAssets()
    } catch (error) {
      console.error('Error uploading model:', error)
      alert('Failed to upload model')
    } finally {
      setLoading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleDelete = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const response = await fetch('/api/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId }),
      })

      if (!response.ok) throw new Error('Failed to delete model')

      if (selectedAsset?.id === assetId) {
        onClear()
      }
      await fetchAssets()
    } catch (error) {
      console.error('Error deleting model:', error)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={handleUpload}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant='outline'
            className={clsx(
              'h-9 px-3 text-sm transition-all duration-300 shadow-sm',
              'border border-border/40 hover:border-foreground/20 hover:bg-muted/30',
              selectedAsset
                ? 'text-foreground bg-muted/20'
                : 'text-muted-foreground bg-background/60 backdrop-blur-sm'
            )}
          >
            {selectedAsset ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm overflow-hidden relative ring-1 ring-border/20 shadow-sm">
                  <Image src={selectedAsset.imageUrl} alt="" fill className="object-cover" sizes="16px" />
                </div>
                <span className="truncate max-w-[100px] font-medium">{selectedAsset.name}</span>
              </div>
            ) : (
              <span className="font-normal">Model</span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className='sm:max-w-md rounded-2xl p-0 overflow-hidden border border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl'>
          <DialogHeader className="px-6 py-4 border-b border-border/10 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-medium tracking-tight">Model Library</DialogTitle>
            <div className="flex items-center gap-4 pr-6">
              {(assets.length > 0 || loading) && (
                <button
                  onClick={handleUploadClick}
                  disabled={loading}
                  className="text-xs font-medium hover:underline underline-offset-4 disabled:opacity-50 transition-all"
                >
                  Upload
                </button>
              )}
            </div>
          </DialogHeader>

          {loading && assets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full mx-auto mb-4"></div>
              <p className="text-xs text-muted-foreground font-medium">Loading models...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="py-20 px-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground mb-4">
                <ImageIcon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No models yet</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-[220px] leading-relaxed mx-auto">Upload a model reference to maintain consistency across your shots.</p>
              </div>
              <Button
                onClick={handleUploadClick}
                variant="outline"
                size="sm"
                className="mt-8 w-full max-w-[160px] h-9 text-xs rounded-lg font-medium border-border/40 hover:bg-foreground hover:text-background transition-all"
              >
                <Upload className="w-3.5 h-3.5 mr-2" />
                Upload Image
              </Button>
            </div>
          ) : (
            <div className="p-6">
              <div className='grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1'>
                {assets.map(asset => (
                  <div key={asset.id} className="group relative">
                    <button
                      type='button'
                      onClick={() => {
                        onSelect(asset)
                        onOpenChange?.(false)
                      }}
                      className={clsx(
                        'w-full overflow-hidden rounded-xl border transition-all duration-300 focus:outline-none aspect-[3/4]',
                        selectedAsset?.id === asset.id
                          ? 'border-foreground ring-1 ring-foreground'
                          : 'border-transparent ring-1 ring-border/20 hover:ring-foreground/20'
                      )}
                      aria-label={`Select ${asset.name} model reference`}
                    >
                      <div className='relative w-full h-full overflow-hidden bg-muted/10'>
                        <Image
                          src={asset.imageUrl}
                          alt={asset.name}
                          fill
                          className={clsx(
                            'object-cover transition-transform duration-500 will-change-transform',
                            selectedAsset?.id === asset.id ? 'scale-105' : 'group-hover:scale-105'
                          )}
                          sizes="(max-width: 640px) 33vw, 120px"
                          quality={75}
                          loading="lazy"
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Name on Hover */}
                        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-1 group-hover:translate-y-0">
                          <p className="text-[10px] font-medium text-white truncate drop-shadow-md text-left">{asset.name}</p>
                        </div>

                        {/* Selected Indicator */}
                        {selectedAsset?.id === asset.id && (
                          <div className="absolute inset-0 bg-foreground/5" />
                        )}
                      </div>
                    </button>

                    {/* Delete Button */}
                    {!asset.isPublic && (
                      <button
                        onClick={(e) => handleDelete(e, asset.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/90 hover:text-white transition-all z-10 backdrop-blur-sm"
                        title="Delete model"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type='button'
                  onClick={handleUploadClick}
                  disabled={loading}
                  className="relative aspect-[3/4] rounded-xl border border-dashed border-border/60 hover:border-foreground/30 hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full"></div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-muted/50 group-hover:bg-foreground/5 flex items-center justify-center transition-colors text-muted-foreground group-hover:text-foreground">
                        <Plus className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">New Model</span>
                    </>
                  )}
                </button>
              </div>

              {selectedAsset && (
                <div className="pt-4 mt-2 border-t border-border/10">
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='w-full h-10 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-colors rounded-xl font-medium'
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
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ModelLibraryDropdown
