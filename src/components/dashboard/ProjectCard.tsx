'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { Calendar, MoreVertical, Edit3, Trash2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectModal } from './ProjectModal'
import Image from 'next/image'

interface ProjectCardProps {
  project: Project
  viewMode: 'grid' | 'list'
  onDelete: (projectId: string) => void
  onUpdate: (projectId: string, projectData: any) => Promise<void>
  reverse?: boolean
  isDeleting?: boolean
}

export const ProjectCard = ({
  project,
  viewMode,
  onDelete,
  onUpdate,
  reverse = false,
  isDeleting = false,
}: ProjectCardProps) => {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
  const renderMenuButton = () => (
    <button
      onClick={e => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
      }}
      className="p-2 rounded-lg transition-colors group-hover:bg-neutral-800 group-hover:shadow-none hover:bg-neutral-700 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"
      aria-label="Project menu"
    >
      <MoreVertical className="h-4 w-4 text-neutral-300" />
    </button>
  )

  // 카드 메뉴
  const renderMenu = () =>
    isMenuOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-lg border border-neutral-700 z-10">
        <div className="py-1">
          <button
            onClick={e => {
              e.stopPropagation()
              setIsMenuOpen(false)
              setIsEditModalOpen(true)
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
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
            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-spin' : ''}`} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    )

  // 그리드 뷰 렌더링
  const renderGridView = () => (
    <div className="relative group cursor-pointer" onClick={handleGoToProjectSetup}>
      {isDeleting && (
        <div className="absolute inset-0 bg-neutral-900/70 flex items-center justify-center z-10 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-lg border border-transparent" />
      <div className={cn(getCardClass('p-0 overflow-hidden'))}>
        {/* 미리보기 이미지 영역 */}
        <div className="relative h-48 bg-neutral-800">
          {project.preview_image ? (
            <Image
              src={project.preview_image}
              alt={`${project.title} preview`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-neutral-600" />
            </div>
          )}
        </div>
        
        {/* 콘텐츠 영역 */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate mb-2">{project.title}</h3>
            </div>
            <div className="relative ml-4">
              {renderMenuButton()}
              {renderMenu()}
            </div>
          </div>
          {/* 날짜 */}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-neutral-300" />
            <span className="text-xs font-normal text-neutral-300">{formatDate(project.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )

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
              <h3 className="text-lg font-semibold text-white truncate mb-1">
                {project.title}
              </h3>
            </div>
            
            {/* 날짜 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-4 w-4 text-neutral-300" />
              <span className="text-xs font-normal text-neutral-300">{formatDate(project.created_at)}</span>
            </div>
          </div>
          
          {/* 메뉴 버튼 */}
          <div className="relative ml-4">
            {renderMenuButton()}
            {renderMenu()}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div onClick={() => setIsMenuOpen(false)}>
        {viewMode === 'grid' ? renderGridView() : renderListView()}
      </div>

      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={(projectData) => onUpdate(project.id, projectData)}
        project={project}
        mode="edit"
      />
    </>
  )
}
