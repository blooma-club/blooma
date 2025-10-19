'use client'

import React from 'react'

type Props = {
  url: string
  onClose: () => void
}

const VideoPreviewModal: React.FC<Props> = ({ url, onClose }) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 px-3 py-1 rounded-md border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800" aria-label="Close video preview">
          Close
        </button>
        <div className="text-sm text-neutral-300 mb-4 pr-16">Storyboard clip preview</div>
        <div className="relative w-full bg-black rounded-xl overflow-hidden">
          <video key={url} src={url} controls autoPlay className="w-full max-h-[70vh] object-contain" />
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewModal


