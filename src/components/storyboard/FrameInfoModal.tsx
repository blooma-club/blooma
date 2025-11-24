'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { X, Clock, Layout, Type, Music, Image as ImageIcon, Hash, Video, MessageSquare, User, Download } from 'lucide-react'
import type { StoryboardFrame, StoryboardAspectRatio } from '@/types/storyboard'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import clsx from 'clsx'
import { RATIO_TO_CSS } from '@/lib/constants'

export interface FrameInfoModalProps {
  frame: StoryboardFrame
  projectId: string
  onClose: () => void
  onSaved?: (updated: StoryboardFrame) => void
  aspectRatio?: StoryboardAspectRatio
}

// Read-only Property Row Component
const PropertyRow = ({ 
  icon: Icon, 
  label, 
  value, 
  className 
}: { 
  icon: React.ElementType; 
  label: string; 
  value?: string | number | null; 
  className?: string 
}) => (
  <div className={clsx("flex items-start gap-3 py-2 group", className)}>
    <div className="flex items-center gap-2 w-32 flex-shrink-0 mt-0.5 text-muted-foreground">
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <div className="flex-1 text-sm text-foreground/90 leading-relaxed break-words font-normal">
      {value || <span className="text-muted-foreground/40 italic text-xs">Empty</span>}
    </div>
  </div>
)

const FrameInfoModal: React.FC<FrameInfoModalProps> = ({ frame, onClose, aspectRatio = '16:9' }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(frame.imageUrl || null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    setPreviewImageUrl(frame.imageUrl || null)
  }, [frame.imageUrl])

  // Download original image function using server-side proxy to bypass CORS completely
  const handleDownloadImage = async (imageUrl: string) => {
    if (!imageUrl || isDownloading) return

    setIsDownloading(true)
    try {
      // Use our own proxy API to fetch the image
      // This bypasses browser CORS restrictions because the request is made server-to-server
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`

      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error('Failed to fetch image via proxy')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      // Generate filename
      const sceneNumber = frame.scene || 'frame'
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      // Get extension from blob type
      const extension = blob.type.split('/')[1] || 'png'
      const filename = `scene-${sceneNumber}-${timestamp}.${extension}`
      
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
      
      // Final fallback: Open original URL in new tab
      // This relies on the browser's native ability to handle the URL
      try {
        window.open(imageUrl, '_blank')
      } catch (e) {
        alert('Failed to download image. Please try saving manually from the new tab.')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const historyImages = useMemo(() => {
    const rawHistory = Array.isArray(frame.imageHistory)
      ? frame.imageHistory.filter(
          (url): url is string => typeof url === 'string' && url.trim().length > 0
        )
      : []
    const uniqueHistory = Array.from(new Set(rawHistory))
    
    if (frame.imageUrl && frame.imageUrl.trim().length > 0) {
      const historyWithoutCurrent = uniqueHistory.filter(url => url !== frame.imageUrl)
      return [frame.imageUrl, ...historyWithoutCurrent]
    }
    return uniqueHistory
  }, [frame.imageHistory, frame.imageUrl])

  // Calculate layout classes based on aspect ratio for optimal image display
  const layoutConfig = useMemo(() => {
    const isPortrait = ['9:16', '2:3', '3:4'].includes(aspectRatio)
    const isSquare = aspectRatio === '1:1'
    const isLandscape = ['16:9', '4:3', '3:2'].includes(aspectRatio)
    
    return {
      // Modal width: narrower for portrait, wider for landscape
      modalWidth: isPortrait ? 'max-w-5xl' : isSquare ? 'max-w-5xl' : 'max-w-7xl',
      // Modal height: taller for portrait, moderate for landscape
      modalHeight: isPortrait ? 'h-[90vh] max-h-[900px]' : isSquare ? 'h-[85vh] max-h-[850px]' : 'h-[85vh] max-h-[800px]',
      // Left panel width: adjusted for larger image display
      leftPanelWidth: isPortrait ? 'md:w-[45%] lg:w-[40%]' : isSquare ? 'md:w-[50%]' : 'md:w-[55%] lg:w-[60%]',
      // Right panel width
      rightPanelWidth: isPortrait ? 'md:w-[55%] lg:w-[60%]' : isSquare ? 'md:w-[50%]' : 'md:w-[45%] lg:w-[40%]',
      // Image container aspect ratio
      imageContainerRatio: RATIO_TO_CSS[aspectRatio],
      // Image area padding: minimized for larger image display
      imagePadding: isPortrait ? 'p-6' : isSquare ? 'p-6' : 'p-4'
    }
  }, [aspectRatio])

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={clsx(
          "p-0 overflow-hidden gap-0 border-border/40 bg-background/95 backdrop-blur-xl shadow-lg rounded-2xl [&>button]:hidden transition-all duration-300",
          layoutConfig.modalWidth
        )}
      >
        <div className={clsx("flex flex-col md:flex-row", layoutConfig.modalHeight)}>
          
          {/* Left Panel: Image Preview & Prompt */}
          <div className={clsx(
            "relative flex w-full flex-col border-b md:border-b-0 md:border-r border-border/40 bg-zinc-50/50 dark:bg-zinc-900/20 transition-all duration-300",
            layoutConfig.leftPanelWidth
          )}>
            {/* Image Area - Optimized image display */}
            <div className={clsx("relative flex-1 flex items-center justify-center overflow-hidden min-h-0", layoutConfig.imagePadding)}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
              
              {previewImageUrl ? (
                <div 
                  className="relative w-full h-full flex items-center justify-center group"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                >
                  <div 
                    className="relative w-full h-full shadow-md rounded-xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 transition-all duration-500"
                    style={{
                      aspectRatio: layoutConfig.imageContainerRatio,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: '100%',
                      height: 'auto'
                    }}
                  >
                    <Image
                      src={previewImageUrl}
                      alt="Scene preview"
                      fill
                      className="object-contain bg-zinc-100 dark:bg-zinc-900"
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                    />
                  </div>
                  {/* Download button */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadImage(previewImageUrl)}
                      disabled={isDownloading}
                      className="h-9 px-3 bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background hover:shadow transition-all"
                      title="Download original image"
                    >
                      <Download className="w-4 h-4 mr-2" strokeWidth={2} />
                      <span className="text-xs font-medium">{isDownloading ? 'Downloading...' : 'Download'}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="relative flex flex-col items-center justify-center gap-3 text-muted-foreground/40 rounded-xl border-2 border-dashed border-border/30 bg-muted/5 w-full"
                  style={{
                    aspectRatio: layoutConfig.imageContainerRatio,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: '100%',
                    height: 'auto'
                  }}
                >
                   <div className="p-4 rounded-full bg-muted/30">
                      <ImageIcon className="w-8 h-8" strokeWidth={1} />
                   </div>
                   <p className="text-sm font-medium">No image</p>
                </div>
              )}
            </div>

            {/* Prompt Area */}
            <div className="border-t border-border/40 bg-background/40 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <div className="w-1 h-4 bg-violet-500 rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prompt</span>
              </div>
              <div className="max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-sm leading-relaxed text-foreground/80 font-normal">
                  {frame.imagePrompt || <span className="text-muted-foreground italic text-xs">No prompt provided for this frame.</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Read-only Details */}
          <div className={clsx(
            "flex w-full flex-col bg-background transition-all duration-300",
            layoutConfig.rightPanelWidth
          )}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">Frame Info</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Shot {frame.scene} details
                </DialogDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs & Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                <div className="px-6 pt-4 pb-2">
                  <TabsList className="w-full grid grid-cols-2 bg-muted/30 p-1 h-9 rounded-lg">
                    <TabsTrigger value="details" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                      Properties
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                      History <span className="ml-1.5 opacity-50 text-[10px]">{historyImages.length}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                  <TabsContent value="details" className="h-full m-0 p-6 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                    
                    {/* General Info Group */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 pl-1">General</h4>
                      <PropertyRow icon={Hash} label="Scene Number" value={frame.scene} />
                      <PropertyRow icon={Video} label="Shot Type" value={frame.shot} />
                      <PropertyRow icon={Layout} label="Camera Angle" value={frame.angle} />
                    </div>

                    <div className="h-px bg-border/30" />

                    {/* Content Group */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 pl-1">Content</h4>
                      <PropertyRow icon={Type} label="Visual Description" value={frame.shotDescription} />
                      <PropertyRow icon={MessageSquare} label="Dialogue" value={frame.dialogue} />
                    </div>

                    <div className="h-px bg-border/30" />

                    {/* Audio & Environment Group */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 pl-1">Environment</h4>
                      <PropertyRow icon={Music} label="Sound & FX" value={frame.sound} />
                      <PropertyRow icon={ImageIcon} label="Background" value={frame.background} />
                    </div>

                  </TabsContent>

                  <TabsContent value="history" className="h-full m-0 p-6">
                    <div className="grid grid-cols-3 gap-3">
                      {historyImages.length > 0 ? (
                        historyImages.map((url, idx) => {
                          const isPreviewing = previewImageUrl === url
                          return (
                            <div
                              key={`${url}-${idx}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => setPreviewImageUrl(url)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setPreviewImageUrl(url)
                                }
                              }}
                              className={clsx(
                                "group relative aspect-video overflow-hidden rounded-lg border transition-all duration-300 cursor-pointer",
                                isPreviewing 
                                  ? "border-violet-500 ring-2 ring-violet-500/20 z-10" 
                                  : "border-border/50 hover:border-violet-500/50 hover:shadow-md opacity-70 hover:opacity-100"
                              )}
                            >
                              <Image
                                src={url}
                                alt={`History ${idx + 1}`}
                                fill
                                className={clsx(
                                  "object-cover transition-transform duration-500",
                                  !isPreviewing && "group-hover:scale-105 grayscale group-hover:grayscale-0"
                                )}
                              />
                              {isPreviewing && (
                                <div className="absolute inset-0 bg-violet-500/10 backdrop-blur-[1px] flex items-center justify-center">
                                   <span className="bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">Preview</span>
                                </div>
                              )}
                              {/* History image download button */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadImage(url)
                                  }}
                                  disabled={isDownloading}
                                  className="h-6 w-6 p-0 bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background hover:shadow transition-all"
                                  title="Download original image"
                                >
                                  <Download className="w-3 h-3" strokeWidth={2} />
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-3 py-20 flex flex-col items-center justify-center text-muted-foreground/40 border border-dashed border-border/40 rounded-xl bg-muted/5">
                           <Clock className="w-8 h-8 mb-2 opacity-50" strokeWidth={1.5} />
                           <p className="text-sm font-medium">No history</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FrameInfoModal

