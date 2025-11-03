'use client'

import React from 'react'

type Props = {
  url: string
  onClose: () => void
}

const VideoPreviewModal: React.FC<Props> = ({ url, onClose }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

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
        setIsFullscreen(prev => !prev)
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
    const target =
      containerRef.current && 'requestFullscreen' in containerRef.current
        ? containerRef.current
        : null

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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        ref={containerRef}
        className={`relative w-full ${isFullscreen ? 'max-w-[90vw] max-h-[90vh]' : 'max-w-4xl'} bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 transition-all`}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-1 rounded-md border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800"
            aria-label={isFullscreen ? 'Exit full screen' : 'View full screen'}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800"
            aria-label="Close video preview"
          >
          Close
        </button>
        </div>
        <div className="text-sm text-neutral-300 mb-4 pr-16">Storyboard clip preview</div>
        <div className={`relative w-full bg-black rounded-xl overflow-hidden ${isFullscreen ? 'h-[80vh]' : ''}`}>
          <video
            key={url}
            src={url}
            controls
            autoPlay
            className={`w-full ${isFullscreen ? 'h-full' : 'max-h-[70vh]'} object-contain`}
          />
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewModal
