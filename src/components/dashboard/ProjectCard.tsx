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

  // 공통 카드 스타일 함수
  const getCardClass = (padding: string) =>
    cn(
      `relative z-10 rounded-lg border ${padding} transition-colors`,
      'bg-card text-card-foreground'
    )
    // border와 bg는 테마 변수 사용

  // 카드 메뉴 버튼
  const renderMenuButton = (mode: 'grid' | 'list') => (
    <button
      onClick={e => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
      }}
        className={cn(
        'transition-all focus-visible:outline-none focus-visible:ring-2',
        mode === 'grid'
          ? 'flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md'
          : 'p-2 rounded-lg'
      )}
      style={{
        borderColor: mode === 'grid' ? 'hsl(var(--border))' : 'transparent',
        backgroundColor: mode === 'grid' ? 'hsl(var(--background) / 0.5)' : 'transparent',
        color: 'hsl(var(--foreground))'
      }}
      onMouseEnter={(e) => {
        if (mode === 'grid') {
          e.currentTarget.style.backgroundColor = 'hsl(var(--background) / 0.4)'
        } else {
          e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
        }
      }}
      onMouseLeave={(e) => {
        if (mode === 'grid') {
          e.currentTarget.style.backgroundColor = 'hsl(var(--background) / 0.5)'
        } else {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
      aria-label="Project menu"
    >
      <MoreVertical
        className="h-4 w-4"
        style={{ color: 'hsl(var(--foreground))' }}
      />
    </button>
  )

  // 카드 메뉴
  const renderMenu = (mode: 'grid' | 'list') =>
    isMenuOpen && (
      <div
        ref={menuRef}
        onClick={e => e.stopPropagation()}
        className={cn(
          'absolute z-20 w-48 rounded-lg border shadow-xl backdrop-blur-xl',
          mode === 'grid' ? 'right-0 top-full mt-2' : 'right-0 mt-2 top-full'
        )}
        style={{
          backgroundColor: 'hsl(var(--popover) / 0.95)',
          borderColor: 'hsl(var(--border))'
        }}
      >
        <div className="py-1">
          <button
            onClick={e => {
              e.stopPropagation()
              setIsMenuOpen(false)
              setIsEditModalOpen(true)
            }}
            className="flex w-full items-center px-4 py-2 text-sm transition-colors"
            style={{ color: 'hsl(var(--popover-foreground))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
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
            className="flex w-full items-center px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: 'hsl(var(--destructive))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--destructive) / 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
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
      : 'bottom-6 left-6 right-auto top-auto h-30 w-90 rounded-[26px] opacity-70 border border-white/12'
    const menuButtonClasses = isActive
      ? 'opacity-100 translate-y-0 pointer-events-auto'
      : 'pointer-events-none opacity-0 -translate-y-1'
    const moreButtonClasses = isActive
      ? 'max-h-12 opacity-100 translate-y-0 pb-5'
      : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none pb-0'

    return (
      <div
        className="relative mx-auto w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[440px] cursor-pointer"
        onClick={handleGoToProjectSetup}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {(isDeleting || isDuplicating) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg" style={{ backgroundColor: 'hsl(var(--background) / 0.7)' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'hsl(var(--foreground))' }}></div>
          </div>
        )}
        <div
          className={cn(
            'relative w-full aspect-[5/4] overflow-hidden rounded-[28px] border transition-all duration-500 ease-out transform',
            isActive && '-translate-y-1'
          )}
        style={{ 
          backgroundColor: 'hsl(var(--card))',
          borderColor: isActive ? 'hsl(var(--border))' : 'hsl(var(--border))'
        }}
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
                  'flex h-full w-full items-center justify-center transition-colors duration-500'
                )}
                style={{ color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
              >
                <ImageIcon className="h-14 w-14" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Info overlay */}
          <div
            className={cn(
              'pointer-events-none absolute z-20 backdrop-blur-md transition-all duration-500 ease-out',
              overlayClasses
            )}
            style={{
              backgroundColor: isActive 
                ? 'hsl(var(--background) / 0.55)' 
                : 'hsl(var(--background) / 0.55)',
              borderColor: isActive 
                ? 'hsl(var(--border))' 
                : 'hsl(var(--border))'
            }}
          />

          {/* Content */}
          <div className="relative z-40 flex h-full flex-col justify-end p-10">
            {/* 텍스트 영역을 absolute로 고정하여 More 버튼의 레이아웃 변화에 영향받지 않도록 */}
            <div className="absolute bottom-12 left-12 z-20 w-full max-w-[18rem] space-y-3 drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]" style={{ color: 'hsl(var(--card-foreground))' }}>
              <h3 className="text-xl font-semibold tracking-tight">{project.title}</h3>
              <div className="text-sm opacity-75">{formatDate(project.created_at)}</div>
            </div>
            {/* More 버튼 영역 - flex 레이아웃 사용 */}
            <div className="flex items-end justify-end">
              <div
                className={cn(
                  'z-20 transition-all duration-300 overflow-hidden flex justify-end',
                  moreButtonClasses
                )}
              >
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    handleGoToProjectSetup()
                  }}
                  className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-md transition-colors"
                  style={{ 
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background) / 0.1)',
                    color: 'hsl(var(--foreground))'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(var(--background) / 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(var(--background) / 0.1)'
                  }}
                >
                  More
                </button>
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
      {(isDeleting || isDuplicating) && (
        <div className="absolute inset-0 bg-neutral-900/70 flex items-center justify-center z-10 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-lg border border-transparent" />
      <div className={cn(getCardClass('p-4'))}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* 미리보기 이미지 */}
            <div className="relative w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: 'hsl(var(--muted))' }}>
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
                  <ImageIcon className="h-6 w-6" strokeWidth={1.5} style={{ color: 'hsl(var(--muted-foreground))' }} />
                </div>
              )}
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate mb-1" style={{ color: 'hsl(var(--card-foreground))' }}>{project.title}</h3>
            </div>

            {/* 날짜 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
              <span className="text-xs font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
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
