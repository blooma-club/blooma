'use client'
import React from 'react'
import clsx from 'clsx'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { StoryboardAspectRatio } from '@/types/storyboard'

interface FloatingHeaderProps {
  title: string
  index: number
  total: number
  currentView: 'models' | 'storyboard'
  onNavigateToStoryboard: () => void
  onNavigateToCharacters?: () => void
  aspectRatio?: StoryboardAspectRatio
  onAspectRatioChange?: (ratio: StoryboardAspectRatio) => void
  isWidthPanelOpen?: boolean
  onToggleWidthPanel?: () => void
  layout?: 'floating' | 'inline'
  containerClassName?: string
  className?: string
}

const ASPECT_RATIO_OPTIONS: StoryboardAspectRatio[] = ['16:9', '4:3', '3:2', '2:3', '3:4', '9:16']

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  title,
  index,
  total,
  currentView,
  onNavigateToStoryboard,
  onNavigateToCharacters,
  aspectRatio,
  onAspectRatioChange,
  isWidthPanelOpen = false,
  onToggleWidthPanel,
  layout = 'floating',
  containerClassName,
  className,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const displayIndex = total > 0 ? index + 1 : 0
  const [navigationDropdownOpen, setNavigationDropdownOpen] = React.useState(false)

  // 외부 클릭 시 드롭다운 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen(false)
        setNavigationDropdownOpen(false)
      }
    }

    if (dropdownOpen || navigationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen, navigationDropdownOpen])
  const selectedAspect = aspectRatio ?? '16:9'
  const showAspectControls = typeof onAspectRatioChange === 'function'
  const navigationOptions = [
    ...(onNavigateToCharacters
      ? [{ value: 'models' as const, label: 'Models', onSelect: onNavigateToCharacters }]
      : []),
    { value: 'storyboard' as const, label: 'Storyboard', onSelect: onNavigateToStoryboard },
  ]
  const selectedView =
    navigationOptions.find(option => option.value === currentView)?.value ??
    navigationOptions[0]?.value ??
    'storyboard'

  const containerClasses = clsx(
    'pointer-events-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg px-6 py-3 flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 relative z-50',
    className
  )

  const content = (
    <div className={containerClasses}>
      <div className="flex min-w-[260px] flex-1 items-center gap-4 sm:gap-6">
        {typeof onToggleWidthPanel === 'function' && (
          <button
            type="button"
            onClick={onToggleWidthPanel}
            className={`h-9 w-9 flex items-center justify-center rounded-lg border transition-colors ${
              isWidthPanelOpen
                ? 'border-neutral-400 dark:border-neutral-500 text-neutral-700 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800'
                : 'border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-100'
            }`}
            aria-label={isWidthPanelOpen ? 'Hide layout controls' : 'Show layout controls'}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6">
        {showAspectControls && (
          <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#DBDBDB]">
            <div className="relative dropdown-container">
              <div className="relative">
                <button
                  type="button"
                  className="appearance-none bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300 text-sm px-3 py-2 pr-8 focus:outline-none flex items-center justify-between w-full border border-neutral-200 dark:border-neutral-700"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedAspect}
                </button>
                {dropdownOpen && (
                  <ul className="absolute z-10 mt-1 min-w-[80px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-lg">
                    {ASPECT_RATIO_OPTIONS.map(option => (
                      <li key={option}>
                        <button
                          type="button"
                          className="block w-full text-left px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-white transition-colors whitespace-nowrap"
                          onClick={() => {
                            onAspectRatioChange?.(option)
                            setDropdownOpen(false)
                          }}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-500 dark:text-[#DBDBDB] text-s">
                <ChevronDown className="h-3 w-3" />
              </span>
            </div>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#DBDBDB]">
          <div className="relative dropdown-container">
            <button
              type="button"
              className="relative appearance-none bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300 text-sm px-3 py-2 pr-8 focus:outline-none flex items-center justify-between w-full navigation-dropdown border border-neutral-200 dark:border-neutral-700"
              onClick={() => setNavigationDropdownOpen(!navigationDropdownOpen)}
            >
              {navigationOptions.find(option => option.value === selectedView)?.label}
            </button>
            {navigationDropdownOpen && (
              <ul className="absolute z-50 mt-1 min-w-[120px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-lg">
                {navigationOptions.map(option => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-white transition-colors whitespace-nowrap"
                      onClick={() => {
                        option.onSelect()
                        setNavigationDropdownOpen(false)
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-500 dark:text-[#DBDBDB] text-s">
              <ChevronDown className="h-3 w-3" />
            </span>
          </div>
        </label>
      </div>
    </div>
  )

  if (layout === 'inline') {
    return <div className={clsx('pointer-events-none', containerClassName)}>{content}</div>
  }

  return (
    <div
      className={clsx(
        'relative left-1/2 -translate-x-1/2 w-[min(1100px,92%)] pointer-events-none mb-6',
        containerClassName
      )}
    >
      {content}
    </div>
  )
}

export default FloatingHeader
