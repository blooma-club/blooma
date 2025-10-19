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
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-white">No scenes yet</h3>
        <p className="text-neutral-400 leading-relaxed">
          This project doesn&apos;t have any storyboard scenes yet. Create your first scene to get started with your storyboard.
        </p>

        <button
          onClick={handleCreateFirstCard}
          disabled={isCreating}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Scene...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create First Scene
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default EmptyStoryboardState


