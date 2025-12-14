'use client'

import React from 'react'

type Props = {
  onCreateFirstCard: () => Promise<void>
}

const EmptyStoryboardState: React.FC<Props> = ({ onCreateFirstCard }) => {
  const [isCreating, setIsCreating] = React.useState(false)

  const handleCreateFirstCard = async () => {
    try {
      setIsCreating(true)
      await onCreateFirstCard()
    } catch (error) {
      console.error('Failed to create first card:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-500">
      <div className="max-w-sm w-full space-y-6 flex flex-col items-center">
        {/* Decorative Circle */}
        <div className="relative group">
          <div className="absolute inset-0 bg-neutral-200/50 rounded-full blur-xl transform group-hover:scale-110 transition-transform duration-500" />
          <div className="relative w-24 h-24 rounded-full bg-white border border-neutral-100 shadow-sm flex items-center justify-center mb-2">
            <svg
              className="w-10 h-10 text-neutral-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Start your storyboard
          </h3>
          <p className="text-sm text-neutral-500 leading-relaxed max-w-[280px] mx-auto">
            Create your first scene to begin visualizing your story.
          </p>
        </div>

        <button
          onClick={handleCreateFirstCard}
          disabled={isCreating}
          className="group relative inline-flex items-center justify-center px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-800 disabled:opacity-70 text-white text-sm font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 min-w-[160px]"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span className="mr-2 text-lg leading-none mb-0.5">+</span>
              Create Scene
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default EmptyStoryboardState


