'use client'
import React from 'react'
import clsx from 'clsx'
import { SlidersHorizontal } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import type { StoryboardAspectRatio } from '@/types/storyboard'

interface FloatingHeaderProps {
  title: string
  index: number
  total: number
  currentView: 'models' | 'storyboard' | 'editor' | 'timeline'
  onNavigateToStoryboard: () => void
  onNavigateToEditor: () => void
  onNavigateToTimeline: () => void
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
  onNavigateToEditor,
  onNavigateToTimeline,
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
  const selectedAspect = aspectRatio ?? '16:9'
  const showAspectControls = typeof onAspectRatioChange === 'function'
  const navigationOptions = [
    ...(onNavigateToCharacters
      ? [{ value: 'models' as const, label: 'Models', onSelect: onNavigateToCharacters }]
      : []),
    { value: 'storyboard' as const, label: 'Storyboard', onSelect: onNavigateToStoryboard },
    { value: 'editor' as const, label: 'Editor', onSelect: onNavigateToEditor },
    ...(onNavigateToTimeline
      ? [{ value: 'timeline' as const, label: 'Timeline', onSelect: onNavigateToTimeline }]
      : []),
  ]
  const selectedView =
    navigationOptions.find(option => option.value === currentView)?.value ??
    navigationOptions[0]?.value ??
    'storyboard'

  const containerClasses = clsx(
    'pointer-events-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg px-6 py-3 flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3',
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
                ? 'border-neutral-500 text-neutral-100 bg-neutral-800'
                : 'border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100'
            }`}
            aria-label={isWidthPanelOpen ? 'Hide layout controls' : 'Show layout controls'}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="text-sm text-neutral-300">
          {displayIndex} / {total}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-end gap-4 sm:gap-6"
        onMouseLeave={() => {
          setDropdownOpen(false)
          setNavigationDropdownOpen(false)
        }}
      >
        {showAspectControls && (
          <label className="flex items-center gap-2 text-xs text-[#DBDBDB]">
            <div
              className="relative"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="relative">
                <button
                  type="button"
                  className="appearance-none bg-black rounded text-neutral-100 text-sm px-3 py-2 pr-8 focus:outline-none flex items-center justify-between w-full"
                  onMouseEnter={() => setDropdownOpen(true)}
                >
                  {selectedAspect}
                </button>
                {dropdownOpen && (
                  <ul className="absolute z-10 mt-1 w-full bg-black border border-neutral-700 rounded shadow-lg">
                    {ASPECT_RATIO_OPTIONS.map(option => (
                      <li key={option}>
                        <button
                          type="button"
                          className="block w-full text-left px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
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
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#DBDBDB] text-s">
                <FontAwesomeIcon icon={faChevronDown} />{' '}
              </span>
            </div>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-[#DBDBDB]">
          <div
            className="relative"
            onMouseLeave={() => setNavigationDropdownOpen(false)}
          >
            <div
              className="relative appearance-none bg-black rounded text-neutral-100 text-sm px-3 py-2 pr-8 focus:outline-none flex items-center justify-between w-full navigation-dropdown"
              onMouseEnter={() => setNavigationDropdownOpen(true)}
            >
              {navigationOptions.find(option => option.value === selectedView)?.label}
            </div>
            {navigationDropdownOpen && (
              <ul className="absolute z-50 mt-1 w-full bg-black border border-neutral-700 rounded shadow-lg">
                {navigationOptions.map(option => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
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
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#DBDBDB] text-s">
              <FontAwesomeIcon icon={faChevronDown} />{' '}
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
