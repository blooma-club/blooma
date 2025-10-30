'use client'
import React from 'react'
import clsx from 'clsx'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, SlidersHorizontal, Edit3, Check, X } from 'lucide-react'
import type { StoryboardAspectRatio } from '@/types/storyboard'
import type { Project } from '@/types'

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
  projectId?: string
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
  projectId,
}) => {
  const { userId } = useAuth()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const displayIndex = total > 0 ? index + 1 : 0
  const [navigationDropdownOpen, setNavigationDropdownOpen] = React.useState(false)
  
  // 프로젝트 제목 편집 관련 상태
  const [projectTitle, setProjectTitle] = React.useState<string>('')
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState('')
  const [isUpdating, setIsUpdating] = React.useState(false)

  // 상위에서 내려준 제목으로 초기화/동기화 (내부 fetch 제거)
  React.useEffect(() => {
    if (typeof title === 'string' && title.trim()) {
      setProjectTitle(title)
    }
  }, [title])

  React.useEffect(() => {
    if (projectTitle) {
      document.title = projectTitle
    }
  }, [projectTitle])

  const handleEditStart = () => {
    setEditValue(projectTitle)
    setIsEditing(true)
  }

  const handleEditCancel = () => {
    setEditValue(projectTitle)
    setIsEditing(false)
  }

  const handleEditSave = async () => {
    if (!editValue.trim() || editValue === projectTitle || !projectId || !userId) {
      handleEditCancel()
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: projectId,
          title: editValue.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project')
      }

      setProjectTitle(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating project title:', error)
      alert('Failed to update project title')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

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
    'pointer-events-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between gap-x-4 relative z-50 h-[48px]',
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
        
        {/* 프로젝트 제목 편집 */}
        {projectId && projectTitle && (
          isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm font-semibold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 max-w-xs transition-all"
                style={{ color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--border))' }}
                autoFocus
                disabled={isUpdating}
                placeholder="Enter project title"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEditSave}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white disabled:cursor-not-allowed"
                  title="Save changes"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 bg-neutral-700 dark:bg-neutral-600 hover:bg-neutral-600 dark:hover:bg-neutral-500 text-neutral-300 hover:text-white disabled:cursor-not-allowed"
                  title="Cancel editing"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <span className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                {projectTitle}
              </span>
              <button
                onClick={handleEditStart}
                className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                title="Edit project title"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
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
              className="relative appearance-none rounded-lg text-sm px-3 py-2 pr-8 focus:outline-none flex items-center justify-between w-full navigation-dropdown border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/70"
              onClick={() => setNavigationDropdownOpen(!navigationDropdownOpen)}
            >
              {navigationOptions.find(option => option.value === selectedView)?.label}
            </button>
            {navigationDropdownOpen && (
              <ul className="absolute z-50 mt-1 min-w-[140px] rounded-lg border shadow-lg" style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}>
                {navigationOptions.map(option => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors"
                      style={{ color: 'hsl(var(--popover-foreground))' }}
                      onClick={() => {
                        option.onSelect()
                        setNavigationDropdownOpen(false)
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[hsl(var(--muted-foreground))] text-s">
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
