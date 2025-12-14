'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project, type ProjectInput } from '@/types'
import { Calendar, MoreVertical, Edit3, Trash2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

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
  const [editTitle, setEditTitle] = useState(project.title)
  const [editDescription, setEditDescription] = useState(project.description ?? '')
  const [isSaving, setIsSaving] = useState(false)
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

  useEffect(() => {
    if (!isEditModalOpen) return
    setEditTitle(project.title)
    setEditDescription(project.description ?? '')
  }, [isEditModalOpen, project.title, project.description])

  const handleGoToProjectSetup = () => {
    // 프로젝트 인덱스를 통해 적절한 페이지로 라우팅
    router.push(`/project/${project.id}`)
  }

  const handleSave = async () => {
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) return

    setIsSaving(true)
    try {
      await onUpdate(project.id, {
        title: trimmedTitle,
        description: editDescription.trim() ? editDescription.trim() : undefined,
      })
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('Failed to update project. Please try again.')
    } finally {
      setIsSaving(false)
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

  // 공통 카드 스타일 함수 (미니멀)
  const getCardClass = (padding: string) =>
    cn(
      'relative rounded-xl border border-border/40 bg-background/40 backdrop-blur-md text-card-foreground shadow-sm transition-all duration-300',
      'hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] hover:border-border/60 hover:bg-background/60',
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
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        mode === 'grid'
          ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white'
          : 'p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground'
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
          'absolute z-30 w-48 rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl text-popover-foreground shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100',
          mode === 'grid' ? 'right-0 top-full mt-2' : 'right-0 mt-2 top-full'
        )}
      >
        <div className="flex flex-col gap-0.5">
          <button
            onClick={e => {
              e.stopPropagation()
              setIsMenuOpen(false)
              setIsEditModalOpen(true)
            }}
            className="flex w-full items-center px-3 py-2 text-sm rounded-lg transition-colors hover:bg-muted hover:text-foreground"
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
            className="flex w-full items-center px-3 py-2 text-sm rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-spin' : ''}`} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    )

  // 그리드 뷰 렌더링 (미니멀 + 이미지 하단 텍스트 정보 + 4:5 세로형 비율)
  const renderGridView = () => {
    // isActive가 true일 때만 메뉴가 보이도록 유지
    const isMenuVisible = isMenuOpen || isHovered

    return (
      <div
        className={cn(
          "group relative flex flex-col transition-all duration-500",
          "w-full aspect-square", // Square aspect ratio for balanced look
          "rounded-3xl bg-white border border-neutral-200/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] p-3",
          "hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)]",
          isMenuOpen ? "ring-1 ring-neutral-900 border-neutral-900" : ""
        )}
        onClick={handleGoToProjectSetup}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Deleting/Duplicating Overlay */}
        {(isDeleting || isDuplicating) && (
          <div className="absolute inset-0 flex items-center justify-center z-50 rounded-3xl bg-white/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900"></div>
          </div>
        )}

        {/* 1. Image Container (Flex-1 to fill available space) */}
        <div className="relative flex-1 w-full rounded-2xl overflow-hidden bg-neutral-100 min-h-0">
          {project.preview_image ? (
            <Image
              src={project.preview_image}
              alt={`${project.title} preview`}
              fill
              className={cn(
                'object-cover transition-transform duration-700 ease-out',
                isHovered ? 'scale-105' : 'scale-100'
              )}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-neutral-50">
              <ImageIcon className="h-10 w-10 opacity-10" strokeWidth={1.5} />
            </div>
          )}

          {/* Menu Button - Absolute top right of image */}
          <div className={cn(
            "absolute right-3 top-3 z-20 transition-all duration-300 ease-out",
            isMenuVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          )}>
            {renderMenuButton('grid')}
            {renderMenu('grid')}
          </div>
        </div>

        {/* 2. Content Below Image (Spacious) */}
        <div className="flex flex-col pt-5 px-4 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium text-neutral-900 tracking-tight line-clamp-1 font-geist-sans mb-1">
                {project.title}
              </h3>
              <p className="text-sm text-neutral-500 line-clamp-1">
                {project.description || formatDate(project.created_at)}
              </p>
            </div>

            {/* Hover Action */}
            <div className={cn(
              "shrink-0 opacity-0 transition-opacity duration-300 translate-x-[-10px]",
              isHovered ? "opacity-100 translate-x-0" : ""
            )}>
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-colors">
                <span className="text-lg leading-none mb-0.5">→</span>
              </div>
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
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-0 rounded-xl border border-transparent transition-all duration-300 group-hover:border-border/40 group-hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]" />
      <div className={cn(getCardClass('p-3 group-hover:bg-background/60'))}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* 미리보기 이미지 */}
            <div className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden bg-muted/30 border border-border/20">
              {project.preview_image ? (
                <Image
                  src={project.preview_image}
                  alt={`${project.title} preview`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-5 w-5 opacity-30" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate mb-1 text-foreground transition-colors">{project.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 opacity-70" />
                <span>{formatDate(project.created_at)}</span>
              </div>
            </div>
          </div>

          {/* 메뉴 버튼 */}
          <div className="relative ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
            <div className="relative">
              {renderMenuButton('list')}
              {renderMenu('list')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {viewMode === 'grid' ? renderGridView() : renderListView()}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={open => {
          setIsEditModalOpen(open)
          if (!open) {
            setIsMenuOpen(false)
            setIsSaving(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>Update the title or description for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`project-title-${project.id}`}>Title</Label>
              <Input
                id={`project-title-${project.id}`}
                value={editTitle}
                onChange={event => setEditTitle(event.target.value)}
                placeholder="Enter a project title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`project-description-${project.id}`}>Description</Label>
              <Textarea
                id={`project-description-${project.id}`}
                value={editDescription}
                onChange={event => setEditDescription(event.target.value)}
                placeholder="Add more context about this project"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !editTitle.trim()}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
