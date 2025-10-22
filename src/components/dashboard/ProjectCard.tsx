'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, type ProjectInput } from '@/types'
import { Calendar, MoreVertical, Edit3, Trash2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ProjectCardProps {
  project: Project
  viewMode: 'grid' | 'list'
  onDelete: (projectId: string) => void
  onUpdate: (projectId: string, projectData: ProjectInput) => Promise<void>
  isDeleting?: boolean
}

export const ProjectCard = ({
  project,
  viewMode,
  onDelete,
  onUpdate,
  isDeleting = false,
}: ProjectCardProps) => {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleGoToProjectSetup = () => {
    // 카드가 있든 없든 모두 스토리보드 페이지로 이동
    router.push(`/project/${project.id}/storyboard`)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // 공통 카드 스타일 함수
  const getCardClass = (padding: string) =>
    cn(
      `relative z-10 rounded-lg border border-neutral-800 bg-neutral-900 ${padding} transition-colors`,
      'text-white'
    )

  // 카드 메뉴 버튼
  const renderMenuButton = (mode: 'grid' | 'list') => (
    <button
      onClick={e => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
      }}
      className={cn(
        'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        mode === 'grid'
          ? 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md hover:bg-black/40'
          : 'p-2 rounded-lg hover:bg-neutral-700'
      )}
      aria-label="Project menu"
    >
      <MoreVertical
        className={cn('h-4 w-4', mode === 'grid' ? 'text-white' : 'text-neutral-300')}
      />
    </button>
  )

  // 카드 메뉴
  const renderMenu = (mode: 'grid' | 'list') =>
    isMenuOpen && (
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'absolute z-20 w-48 rounded-lg border border-neutral-700 bg-neutral-800/95 shadow-xl backdrop-blur-xl',
          mode === 'grid' ? 'right-0 top-full mt-2' : 'right-0 mt-2 top-full'
        )}
      >
        <div className="py-1">
          <button
            onClick={e => {
              e.stopPropagation()
              setIsMenuOpen(false)
              setIsEditModalOpen(true)
            }}
            className="flex w-full items-center px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onDelete(project.id)
              setIsMenuOpen(false)
            }}
            disabled={isDeleting}
            className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-spin' : ''}`} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    )

  // 그리드 뷰 렌더링
  const renderGridView = () => {
    const isActive = isHovered || isMenuOpen
    const overlayClasses = isActive
      ? 'inset-0 rounded-[28px] opacity-70 border border-white/5'
      : 'bottom-6 left-6 right-auto top-auto h-35 w-90 rounded-[26px] opacity-70 border border-white/12'
    const menuButtonClasses = isActive
      ? 'opacity-100 translate-y-0 pointer-events-auto'
      : 'pointer-events-none opacity-0 -translate-y-1'
    const moreButtonClasses = isActive
      ? 'max-h-12 opacity-100 translate-y-0 pb-5'
      : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none pb-0'

    return (
      <div
        className="relative mx-auto w-[300px] sm:w-[360px] lg:w-[420px] cursor-pointer"
        onClick={handleGoToProjectSetup}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isDeleting && (
          <div className="absolute inset-0 bg-neutral-900/70 flex items-center justify-center z-10 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
        <div
          className={cn(
            'relative h-[26rem] overflow-hidden rounded-[28px] border bg-neutral-950 shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-all duration-500 ease-out transform',
            isActive
              ? 'border-neutral-700 -translate-y-1 shadow-[0_30px_60px_rgba(0,0,0,0.6)]'
              : 'border-neutral-900'
          )}
        >
          {/* Preview media */}
          <div className="absolute inset-0">
            {project.preview_image ? (
              <Image
                src={project.preview_image}
                alt={`${project.title} preview`}
                fill
                className="object-cover transition-transform duration-500 ease-out"
                style={{ transform: isActive ? 'scale(1.02)' : 'scale(1)' }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div
                className={cn(
                  'flex h-full w-full items-center justify-center text-neutral-600 transition-colors duration-500',
                  isActive && 'text-white'
                )}
              >
                <ImageIcon className="h-14 w-14" />
              </div>
            )}
          </div>

          {/* Info overlay */}
          <div
            className={cn(
              'pointer-events-none absolute z-20 bg-black/55 backdrop-blur-md transition-all duration-500 ease-out',
              overlayClasses
            )}
          />

          {/* Content */}
          <div className="relative z-40 flex h-full flex-col justify-end p-10">
            <div className="flex items-end justify-between gap-4 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] transition-all duration-500">
              <div className="relative flex flex-1 flex-col items-start gap-4 text-left transition-all duration-500">
                <div className="relative z-20 w-full max-w-[18rem] space-y-2 px-5 pt-5">
                  <h3 className="text-xl font-semibold tracking-tight">{project.title}</h3>
                  <div className="text-sm text-white/75">{formatDate(project.created_at)}</div>
                </div>
                <div
                  className={cn(
                    'relative z-20 self-end w-full max-w-[18rem] px-5 transition-all duration-300 overflow-hidden flex justify-end',
                    moreButtonClasses
                  )}
                >
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleGoToProjectSetup()
                    }}
                    className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  >
                    More
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              'absolute right-6 top-6 z-40 transition-all duration-300',
              menuButtonClasses
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              {renderMenuButton('grid')}
              {renderMenu('grid')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 리스트 뷰 렌더링
  const renderListView = () => (
    <div className="relative group cursor-pointer" onClick={handleGoToProjectSetup}>
      {isDeleting && (
        <div className="absolute inset-0 bg-neutral-900/70 flex items-center justify-center z-10 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-lg border border-transparent" />
      <div className={cn(getCardClass('p-4'))}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* 미리보기 이미지 */}
            <div className="relative w-16 h-16 bg-neutral-800 rounded-lg flex-shrink-0 overflow-hidden">
              {project.preview_image ? (
                <Image
                  src={project.preview_image}
                  alt={`${project.title} preview`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-neutral-600" />
                </div>
              )}
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate mb-1">{project.title}</h3>
            </div>

            {/* 날짜 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-4 w-4 text-neutral-300" />
              <span className="text-xs font-normal text-neutral-300">
                {formatDate(project.created_at)}
              </span>
            </div>
          </div>

          {/* 메뉴 버튼 */}
          <div className="relative ml-4" onClick={e => e.stopPropagation()}>
            <div className="relative">
              {renderMenuButton('list')}
              {renderMenu('list')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return viewMode === 'grid' ? renderGridView() : renderListView()
}