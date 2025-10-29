"use client"

import React from 'react'
import { Grid, List } from 'lucide-react'

interface ViewModeToggleProps {
  viewMode: 'grid' | 'list'
  onSetGrid: () => void
  onSetList: () => void
  className?: string
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onSetGrid,
  onSetList,
  className = ''
}) => {
  return (
    <div 
      className={`flex items-center h-[48px] rounded-lg border shadow-lg px-1 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      <button
        onClick={onSetGrid}
        className={`h-[36px] px-3 rounded-md transition-all flex items-center justify-center ${
          viewMode === 'grid'
            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
            : 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }`}
        aria-label="Grid view"
      >
        <Grid className="w-4 h-4 text-current" />
      </button>
      <button
        onClick={onSetList}
        className={`h-[36px] px-3 rounded-md transition-all flex items-center justify-center ${
          viewMode === 'list'
            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
            : 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }`}
        aria-label="List view"
      >
        <List className="w-4 h-4 text-current" />
      </button>
    </div>
  )
}

export default ViewModeToggle