'use client'

import React from 'react'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Upload, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'

export type ModelLibraryAsset = {
  id: string
  name: string
  subtitle: string
  imageUrl: string
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
          imageUrl: item.image_url
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'model')
      // Using current timestamp as ID for new uploads if not provided by server (though server should handle ID generation)
      // We'll let the server return the saved asset
      formData.append('assetId', `model-${Date.now()}`) 

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to upload model')
      
      const result = await response.json()
      if (result.success) {
        await fetchAssets() // Refresh list
      }
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
              <span className="font-normal">Model</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className='w-80 rounded-2xl p-0 z-[80] border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl supports-[backdrop-filter]:bg-background/60'
          sideOffset={8}
        >
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
             <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Model Reference</h4>
             {(assets.length > 0 || loading) && (
               <button 
                onClick={handleUploadClick}
                disabled={loading}
                className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors font-medium disabled:opacity-50"
               >
                 + Upload
               </button>
             )}
          </div>
          
          {loading && assets.length === 0 ? (
             <div className="py-12 text-center">
               <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-2"></div>
               <p className="text-xs text-muted-foreground">Loading models...</p>
             </div>
          ) : assets.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 mb-3 transition-colors hover:bg-violet-500/20">
                <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">No models yet</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px] leading-relaxed">Upload a character reference to maintain consistency across your shots.</p>
              </div>
              <Button 
                onClick={handleUploadClick} 
                variant="outline"
                size="sm" 
                className="mt-4 w-full h-8 text-xs border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 transition-all rounded-lg font-normal"
              >
                <Upload className="w-3 h-3 mr-2" />
                Upload Image
              </Button>
            </div>
          ) : (
            <div className="p-2">
              <div className='grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar p-1'>
                {assets.map(asset => (
                  <div key={asset.id} className="group relative">
                    <button
                      type='button'
                      onClick={() => {
                        onSelect(asset)
                        onOpenChange?.(false)
                      }}
                      className={clsx(
                        'w-full overflow-hidden rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20',
                        selectedAsset?.id === asset.id 
                          ? 'border-violet-500/50 ring-1 ring-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]' 
                          : 'border-transparent hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5'
                      )}
                      aria-label={`Select ${asset.name} model reference`}
                    >
                      <div className='relative aspect-square overflow-hidden bg-muted/20'>
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.name} 
                          className={clsx(
                            'h-full w-full object-cover transition-transform duration-700 ease-out',
                            selectedAsset?.id === asset.id ? 'scale-105' : 'group-hover:scale-110'
                          )} 
                        />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-1 group-hover:translate-y-0 text-left">
                           <p className="text-[10px] font-medium text-white truncate drop-shadow-sm">{asset.name}</p>
                        </div>

                        {/* Selected Indicator */}
                        {selectedAsset?.id === asset.id && (
                          <div className="absolute inset-0 bg-violet-500/10 border-2 border-violet-500/50 rounded-xl" />
                        )}
                      </div>
                    </button>
                    
                    {/* Delete Button - Only visible on hover */}
                    <button
                      onClick={(e) => handleDelete(e, asset.id)}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                      title="Delete model"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={handleUploadClick}
                  disabled={loading}
                  className="relative aspect-square rounded-xl border border-dashed border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-2 text-violet-600/60 hover:text-violet-600 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center transition-colors text-violet-600">
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                      </div>
                      <span className="text-[10px] font-medium">New Model</span>
                    </>
                  )}
                </button>
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

export default ModelLibraryDropdown
