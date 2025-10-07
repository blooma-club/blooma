'use client'
import React from 'react'

interface FloatingHeaderProps {
  title: string
  index: number
  total: number
  currentView: 'models' | 'storyboard' | 'editor' | 'timeline'
  onNavigateToStoryboard: () => void
  onNavigateToEditor: () => void
  onNavigateToTimeline: () => void
  onNavigateToCharacters?: () => void
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  title,
  index,
  total,
  currentView,
  onNavigateToStoryboard,
  onNavigateToEditor,
  onNavigateToTimeline,
  onNavigateToCharacters,
}) => {
  const displayIndex = total > 0 ? index + 1 : 0

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[min(1100px,92%)] pointer-events-none mb-6">
      <div className="pointer-events-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <div className="text-sm text-neutral-300">
            {displayIndex} / {total}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Storyboard/Editor/Timeline 네비게이션 */}
          <div className="flex items-center gap-2">
            {onNavigateToCharacters && (
              <button
                type="button"
                onClick={onNavigateToCharacters}
                className="px-3 py-1 rounded text-sm border border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
              >
                Models
              </button>
            )}
            <button
              onClick={onNavigateToStoryboard}
              className={`px-3 py-1 rounded text-sm border transition-colors ${
                currentView === 'storyboard'
                  ? 'bg-white text-black border-white'
                  : 'border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white'
              }`}
            >
              Storyboard
            </button>
            <button
              onClick={onNavigateToEditor}
              className={`px-3 py-1 rounded text-sm border transition-colors ${
                currentView === 'editor'
                  ? 'bg-white text-black border-white'
                  : 'border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white'
              }`}
            >
              Editor
            </button>

            {false && (
              <button
                onClick={onNavigateToTimeline}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  currentView === 'timeline'
                    ? 'bg-white text-black border-white'
                    : 'border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white'
                }`}
              >
                Timeline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FloatingHeader
