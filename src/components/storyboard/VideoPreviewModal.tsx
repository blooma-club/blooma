'use client'

import React from 'react'
import { X, Maximize2, Minimize2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  url: string
  onClose: () => void
}

const VideoPreviewModal: React.FC<Props> = ({ url, onClose }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
          return
        }
        onClose()
      }

      if ((event.key === 'f' || event.key === 'F') && !event.repeat) {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prev
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [onClose, isFullscreen])

  React.useEffect(() => {
    const target = containerRef.current
    
    if (isFullscreen && target && !document.fullscreenElement) {
      void target.requestFullscreen().catch(() => {
        setIsFullscreen(false)
      })
      return
    }

    if (!isFullscreen && document.fullscreenElement && document.fullscreenElement === target) {
      void document.exitFullscreen().catch(() => {})
    }
  }, [isFullscreen])

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      if (prev && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
      return !prev
    })
  }
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!url) return
    
    const link = document.createElement('a')
    link.href = url
    link.download = `video-${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 sm:px-6 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative w-full bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in zoom-in-95",
          isFullscreen ? "max-w-none w-screen h-screen rounded-none border-none" : "max-w-5xl aspect-video"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Controls (Overlay) */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-sm font-medium text-white/90 pl-2">Video Preview</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white border border-white/10"
              title="Download video"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white border border-white/10"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white border border-white/10"
              title="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            key={url}
            src={url}
            controls
            autoPlay
            playsInline
            loop
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewModal
