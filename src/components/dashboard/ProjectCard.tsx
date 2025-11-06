'use client'

import { useState, useRef, useEffect } from 'react'
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
  onDuplicate: (projectId: string) => Promise<void>
  isDeleting?: boolean
  isDuplicating?: boolean
}

export const ProjectCard = ({
  project,
  viewMode,
  onDelete,
  onUpdate,
  onDuplicate,
  isDeleting = false,
  isDuplicating = false,
}: ProjectCardProps) => {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [isMenuOpen])

  const handleGoToProjectSetup = () => {
    // 프로젝트 인덱스를 통해 적절한 페이지로 라우팅
    router.push(`/project/${project.id}`)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // 공통 카드 스타일 함수 (미니멀)
  const getCardClass = (padding: string) =>
    cn(
      'relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all',
      'hover:shadow-md hover:border-border',
      padding
    )

  // 카드 메뉴 버튼
  const renderMenuButton = (mode: 'grid' | 'list') => (
    <button
      onClick={e => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
      }}
      className={cn(
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        mode === 'grid'
          ? 'flex h-9 w-9 items-center justify-center rounded-full border bg-background/60 hover:bg-background/70'
          : 'p-2 rounded-md hover:bg-muted'
      )}
      aria-label="Project menu"
    >
      <MoreVertical className="h-4 w-4" />
    </button>
  )

  // 카드 메뉴
  const renderMenu = (mode: 'grid' | 'list') =>
    isMenuOpen && (
      <div
        ref={menuRef}
        onClick={e => e.stopPropagation()}
        className={cn(
          'absolute z-20 w-48 rounded-md border bg-popover text-popover-foreground shadow-md',
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
            className="flex w-full items-center px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </button>
          {/* Duplicate 항목 제거 */}
          <button
            onClick={e => {
              e.stopPropagation()
              onDelete(project.id)
              setIsMenuOpen(false)
            }}
            disabled={isDeleting}
            className="flex w-full items-center px-4 py-2 text-sm transition-colors text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-spin' : ''}`} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    )

  // 그리드 뷰 렌더링 (미니멀)
  const renderGridView = () => {
    const isActive = isHovered || isMenuOpen
    return (
      <div
        className="relative mx-auto w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[440px] cursor-pointer"
        onClick={handleGoToProjectSetup}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {(isDeleting || isDuplicating) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl bg-background/70">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
          </div>
        )}
        <div
          className={cn(
            'relative w-full aspect-[5/4] overflow-hidden rounded-2xl border bg-card transition-transform duration-300',
            isActive && '-translate-y-0.5'
          )}
        >
          {/* Preview media */}
          <div className="absolute inset-0">
            {project.preview_image ? (
              <Image
                src={project.preview_image}
                alt={`${project.title} preview`}
                fill
                className={cn(
                  'object-cover transition-transform duration-500 ease-out',
                  isActive ? 'scale-[1.02]' : 'scale-100'
                )}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-14 w-14" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col justify-end p-6">
            {/* 제목/날짜 박스 */}
            <div className="inline-flex max-w-[22rem] flex-col gap-1 rounded-xl border bg-background/70 backdrop-blur-md p-3 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight line-clamp-1">{project.title}</h3>
              <div className="text-[11px] sm:text-xs text-muted-foreground inline-flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(project.created_at)}</span>
              </div>
            </div>
            <div className="absolute right-4 top-4 z-20">
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
      {(isDeleting || isDuplicating) && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10 rounded-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-xl border border-transparent" />
      <div className={cn(getCardClass('p-4'))}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* 미리보기 이미지 */}
            <div className="relative w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-muted">
              {project.preview_image ? (
                <Image
                  src={project.preview_image}
                  alt={`${project.title} preview`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate mb-1">{project.title}</h3>
            </div>

            {/* 날짜 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-normal text-muted-foreground">
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
