'use client'

import React from 'react'
import Image from 'next/image'

export interface HistoryTabProps {
  imageHistory: string[]
  onSelectHistoryImage: (imageUrl: string) => void
}

const HistoryTab: React.FC<HistoryTabProps> = ({ imageHistory, onSelectHistoryImage }) => {
  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400">
        Select a previous image to restore it as the current frame. The existing image will move
        into history.
      </div>
      {imageHistory && imageHistory.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {imageHistory.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => onSelectHistoryImage(imageUrl)}
              className="group relative overflow-hidden rounded border border-gray-700 bg-gray-900 text-left"
              title="Restore this image"
            >
              <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                <Image
                  src={imageUrl}
                  alt={`Historic frame ${index + 1}`}
                  fill
                  sizes="200px"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center rounded bg-black/60 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                Use this image
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-gray-700 p-6 text-center text-xs text-gray-500">
          No previous images yet. Generate new versions to build history.
        </div>
      )}
    </div>
  )
}

export default HistoryTab
