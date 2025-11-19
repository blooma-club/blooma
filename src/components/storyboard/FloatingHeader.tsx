'use client'
import React from 'react'
import clsx from 'clsx'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Edit3, Check, X, ArrowLeft } from 'lucide-react'
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
  layout?: 'floating' | 'inline'
  containerClassName?: string
  className?: string
  projectId?: string
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  title,
  index,
  total,
  currentView,
  onNavigateToStoryboard,
  onNavigateToCharacters,
  aspectRatio,
  onAspectRatioChange,
  layout = 'floating',
  containerClassName,
  className,
  projectId,
}) => {
  const { userId } = useAuth()
  const router = useRouter()

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

  const containerClasses = clsx(
    'pointer-events-auto backdrop-blur-sm bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/80 dark:border-neutral-700/50 ring-1 ring-neutral-200/50 dark:ring-neutral-700/40 rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between gap-x-4 relative z-50 h-[48px]',
    className
  )

  const content = (
    <div className={containerClasses}>
      {/* 좌측: 네비게이션 + 제목 */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Dashboard 버튼 */}
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 text-sm font-medium rounded-md border border-neutral-200/80 dark:border-neutral-700/50 bg-white/95 dark:bg-neutral-900/95 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-all duration-200 flex-shrink-0 text-neutral-700 dark:text-neutral-300"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Dashboard</span>
        </button>

        {/* 구분선 */}
        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

        {/* 프로젝트 제목 편집 */}
        {projectId &&
          projectTitle &&
          (isEditing ? (
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-[200px] text-sm font-semibold bg-transparent border-0 border-b-2 border-neutral-900 dark:border-white focus:outline-none focus:ring-0 px-0 py-1 text-neutral-900 dark:text-white transition-colors duration-200"
                autoFocus
                disabled={isUpdating}
                placeholder="Enter project title"
              />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleEditSave}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-200 disabled:opacity-50 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 disabled:cursor-not-allowed text-neutral-700 dark:text-neutral-300"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleEditCancel}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-200 disabled:opacity-50 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 disabled:cursor-not-allowed text-neutral-500 dark:text-neutral-400"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 group min-w-0">
              <span className="text-sm font-semibold truncate text-neutral-900 dark:text-white">
                {projectTitle}
              </span>
              <button
                onClick={handleEditStart}
                className="inline-flex items-center justify-center p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-all duration-200 flex-shrink-0 text-neutral-500 dark:text-neutral-400"
                title="Edit title"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
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
