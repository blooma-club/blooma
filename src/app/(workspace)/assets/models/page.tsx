'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Plus, Upload, Search, MoreHorizontal, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { useToast } from '@/components/ui/toast'

type ModelAsset = {
  id: string
  name: string
  image_url: string
  created_at?: string
  is_public?: number
}

export default function ModelsPage() {
  const { user, isLoaded } = useUser()
  const [models, setModels] = useState<ModelAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { push: toast } = useToast()

  // Fetch Models
  const fetchModels = async () => {
    if (!user) return
    try {
      setLoading(true)
      const response = await fetch('/api/models')
      if (!response.ok) throw new Error('Failed to fetch models')
      const result = await response.json()
      if (result.success) {
        setModels(result.data.map((item: any) => ({
          ...item,
          is_public: (item.is_public === 1 || item.is_public === true || item.is_public === '1') ? 1 : 0
        })))
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast({
        title: 'Error',
        description: 'Failed to load models. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && user) {
      fetchModels()
    }
  }, [isLoaded, user])

  // Handle Upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'model')
      formData.append('assetId', `model-${Date.now()}`)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to upload model')

      const result = await response.json()
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Model uploaded successfully.',
        })
        fetchModels() // Refresh list
      }
    } catch (error) {
      console.error('Error uploading model:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload model.',
      })
    } finally {
      setUploading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const response = await fetch('/api/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error('Failed to delete model')

      setModels(prev => prev.filter(m => m.id !== id))
      toast({
        title: 'Deleted',
        description: 'Model has been removed.',
      })
    } catch (error) {
      console.error('Error deleting model:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete model.',
      })
    }
  }

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Models</h1>
            <p className="text-muted-foreground text-sm">
              Manage your AI character references
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input
                placeholder="Search..."
                className="pl-10 h-10 bg-muted/30 border-border/40 focus:border-foreground/20 focus:ring-0 transition-all rounded-lg text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-10 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-medium text-sm shadow-sm"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              New Model
            </Button>
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filteredModels.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {/* Upload Card (First Item) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group relative aspect-[3/4] flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/40 hover:border-foreground/20 bg-muted/5 hover:bg-muted/10 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Add New
              </span>
            </button>

            {filteredModels.map((model) => (
              <div
                key={model.id}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted/20 border border-border/10 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Image */}
                <Image
                  src={model.image_url}
                  alt={model.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                {/* Content (Visible on Hover) */}
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent pt-8">
                  <h3 className="text-white font-medium truncate text-xs">{model.name}</h3>
                </div>

                {/* Menu Button */}
                {!model.is_public && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-0"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 rounded-lg bg-background border-border/20 shadow-xl">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer text-xs"
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/30 rounded-2xl bg-muted/5 mt-8">
            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No models found</h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mb-6 leading-relaxed">
              Upload character references to start building your library.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-9 px-4 rounded-lg border-border/40 hover:bg-muted/20 text-xs"
            >
              Upload Model
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
