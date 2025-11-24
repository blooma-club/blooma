'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Plus, Search, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

type BackgroundAsset = {
  id: string
  name: string
  image_url: string
  subtitle?: string
  created_at?: string
}

export default function BackgroundsPage() {
  const { user, isLoaded } = useUser()
  const [backgrounds, setBackgrounds] = useState<BackgroundAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { push: toast } = useToast()

  const fetchBackgrounds = async () => {
    if (!user) return
    try {
      setLoading(true)
      const response = await fetch('/api/backgrounds')
      if (!response.ok) throw new Error('Failed to fetch backgrounds')
      const result = await response.json()
      if (result.success) {
        setBackgrounds(result.data)
      }
    } catch (error) {
      console.error('Error fetching backgrounds:', error)
      toast({
        title: 'Error',
        description: 'Failed to load backgrounds. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && user) {
      fetchBackgrounds()
    }
  }, [isLoaded, user])

  const handleUploadBackground = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'background')
      formData.append('assetId', `background-${Date.now()}`)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to upload background')

      const result = await response.json()
      if (result.success) {
        toast({
          title: 'Uploaded',
          description: 'Background uploaded successfully.',
        })
        fetchBackgrounds()
      }
    } catch (error) {
      console.error('Error uploading background:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload background.',
      })
    } finally {
      setUploading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleDeleteBackground = async (id: string) => {
    if (!confirm('Are you sure you want to delete this background?')) return

    try {
      const response = await fetch('/api/backgrounds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error('Failed to delete background')

      setBackgrounds(previous => previous.filter(background => background.id !== id))
      toast({
        title: 'Deleted',
        description: 'Background has been removed.',
      })
    } catch (error) {
      console.error('Error deleting background:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete background.',
      })
    }
  }

  const filteredBackgrounds = backgrounds.filter(background =>
    background.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Backgrounds
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your scene and environment backgrounds.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input
                placeholder="Search..."
                className="pl-10 h-10 bg-muted/30 border-border/40 focus:border-foreground/20 focus:ring-0 transition-all rounded-lg text-sm"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadBackground}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-10 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-medium text-sm shadow-sm"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              New Background
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, index) => (
              <div key={index} className="aspect-[16/9] rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filteredBackgrounds.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {filteredBackgrounds.map(background => (
              <div
                key={background.id}
                className="group relative aspect-[16/9] rounded-xl overflow-hidden bg-muted/20 border border-border/10 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Image
                  src={background.image_url}
                  alt={background.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white font-medium truncate text-xs">{background.name}</h3>
                  {background.subtitle && (
                    <p className="text-[10px] text-white/80 truncate">
                      {background.subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBackground(background.id)}
                  className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete background"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/30 rounded-2xl bg-muted/5 mt-8">
            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No backgrounds found</h3>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-6 leading-relaxed">
              Upload a new background to start building your library.
            </p>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 px-4 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 font-medium text-xs shadow-sm inline-flex items-center gap-2"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Upload Background
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
