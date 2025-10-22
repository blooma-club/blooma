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
    <div className={`flex items-center bg-neutral-50 dark:bg-neutral-800 rounded p-0.5 ${className}`}>
      <button
        onClick={onSetGrid}
        className={`p-1.5 rounded transition-colors ${
          viewMode === 'grid'
            ? 'bg-neutral-100 dark:bg-white text-neutral-800 dark:text-neutral-900'
            : 'text-neutral-400 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }`}
        aria-label="Grid view"
      >
        <Grid className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onSetList}
        className={`p-1.5 rounded transition-colors ${
          viewMode === 'list'
            ? 'bg-neutral-100 dark:bg-white text-neutral-800 dark:text-neutral-900'
            : 'text-neutral-400 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }`}
        aria-label="List view"
      >
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default ViewModeToggle