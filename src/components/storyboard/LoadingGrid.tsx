'use client'

import React from 'react'
import { RATIO_TO_CSS, DEFAULT_RATIO } from '@/lib/constants'

type Props = {
  cardsLength: number
  aspectRatio?: keyof typeof RATIO_TO_CSS
  cardWidth?: number
  containerMaxWidth?: number
}

const LoadingGrid: React.FC<Props> = ({ 
  cardsLength, 
  aspectRatio = DEFAULT_RATIO, 
  cardWidth = 400, 
  containerMaxWidth = 1824 
}) => {
  const count = Math.max(cardsLength, 3)
  const gridTemplateColumns = `repeat(auto-fit, minmax(${cardWidth}px, ${cardWidth}px))`
  
  return (
    <div className="flex justify-center">
      <div 
        className="grid gap-6 justify-center" 
        style={{ 
          maxWidth: '100%',
          width: 'fit-content',
          gridTemplateColumns 
        }}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="group relative flex flex-col rounded-lg border border-neutral-700 bg-black shadow-lg overflow-hidden">
            <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-neutral-800 w-16 h-4 animate-pulse" />
            <div className="absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full bg-neutral-700 ring-2 ring-neutral-700 animate-pulse" />
            <div className="relative w-full bg-neutral-900" style={{ aspectRatio: RATIO_TO_CSS[aspectRatio] }}>
              <div className="absolute inset-0 bg-[linear-gradient(110deg,#000000_8%,#1a1a1a_18%,#000000_33%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
              <style jsx>{`
                @keyframes shimmer {
                  0% { background-position: 0% 0; }
                  100% { background-position: -200% 0; }
                }
              `}</style>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LoadingGrid


