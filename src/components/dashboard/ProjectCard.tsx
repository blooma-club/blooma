'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { Calendar, MoreVertical, Edit3, Trash2, Globe, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectEditModal } from './ProjectEditModal'

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
    if (project.has_cards) {
      // If cards are generated, go to the editor/canvas page
      router.push(`/project/${project.id}/editor`)
    } else {
      // If no cards, go to the setup page
      router.push(`/project/${project.id}/setup`)
    }
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
      `relative z-10 rounded-lg border border-black ${padding} transition-all`,
      reverse
        ? 'bg-white text-black font-semibold translate-x-1 translate-y-1 hover:shadow-neo hover:translate-x-0 hover:translate-y-0 active:translate-x-0.5 active:translate-y-0.5'
        : 'bg-white text-black font-semibold hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
    )

  // 카드 메뉴 버튼
  const renderMenuButton = () => (
    <button
      onClick={e => {
        e.stopPropagation()
        setIsMenuOpen(!isMenuOpen)
      }}
      className="p-2 rounded-lg transition-colors group-hover:bg-white group-hover:shadow-none hover:bg-gray-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"
      aria-label="Project menu"
    >
      <MoreVertical className="h-4 w-4 text-gray-500" />
    </button>
  )

  // 카드 메뉴
  const renderMenu = () =>
    isMenuOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
        <div className="py-1">
          <button
            onClick={e => {
              e.stopPropagation()
              setIsMenuOpen(false)
              setIsEditModalOpen(true)
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
      <div className={cn(getCardClass('pt-3 pb-6 px-6'))}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-2">{project.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {project.description || 'No description provided.'}
            </p>
          </div>
          <div className="relative ml-4">
            {renderMenuButton()}
            {renderMenu()}
          </div>
        </div>
        {/* 날짜/공개여부 상하 분리 */}
        <div className="flex flex-col space-y-2 mt-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-normal">{formatDate(project.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            {project.is_public ? (
              <>
                <Globe className="h-4 w-4" />
                <span className="text-xs font-normal">Public</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span className="text-xs font-normal">Private</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // 리스트 뷰 렌더링
  const renderListView = () => (
    <div className="relative group cursor-pointer" onClick={handleGoToProjectSetup}>
      {isDeleting && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
      <div className={cn(getCardClass('pt-2 pb-4 px-4'))}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate mb-2">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {project.description || 'No description provided.'}
                </p>
              </div>
              {/* 날짜/공개여부 상하 분리 */}
              <div className="flex flex-col space-y-2 mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-normal">{formatDate(project.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {project.is_public ? (
                    <>
                      <Globe className="h-4 w-4" />
                      <span className="text-xs font-normal">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span className="text-xs font-normal">Private</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
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

      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onUpdate}
        project={project}
      />
    </>
  )
}
