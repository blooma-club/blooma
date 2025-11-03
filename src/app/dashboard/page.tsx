'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { type Project, type ProjectInput } from '@/types'
import { Plus, Search, Grid, List, RefreshCw, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { useProjects } from '@/lib/api'
import AccountDropdown from '@/components/ui/AccountDropdown'
import ThemeToggle from '@/components/ui/theme-toggle'
import CreditsIndicator from '@/components/ui/CreditsIndicator'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProjects, setDeletingProjects] = useState<Set<string>>(new Set())
  const [duplicatingProjects, setDuplicatingProjects] = useState<Set<string>>(new Set())

  // Clerk의 userId 추출
  const userId = user?.id || null

  // SWR 훅 사용
  const { projects, isLoading, createProject, deleteProject, updateProject, duplicateProject } =
    useProjects()

  const handleCreateProject = async () => {
    if (!userId) {
      alert('Please sign in to create a project')
      return
    }

    setCreatingProject(true)
    try {
      const projectData = {
        title: 'New Project',
        description: '',
        is_public: false,
      }

      const data = await createProject(projectData)

      // 프로젝트 생성 후 프로젝트 인덱스로 이동 (리디렉션 처리)
      router.push(`/project/${data.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create project: ${errorMessage}`)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleUpdateProject = async (projectId: string, projectData: ProjectInput) => {
    try {
      await updateProject(projectId, projectData)
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Do you want to delete this project?')) return

    setDeletingProjects(prev => new Set(prev).add(projectId))
    try {
      await deleteProject(projectId)
    } catch (error) {
      console.error('Error deleting project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to delete project: ${errorMessage}`)
    } finally {
      setDeletingProjects(prev => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  const handleDuplicateProject = async (projectId: string) => {
    if (!userId) {
      alert('Please sign in to duplicate a project')
      return
    }

    setDuplicatingProjects(prev => new Set(prev).add(projectId))
    try {
      await duplicateProject(projectId)
    } catch (error) {
      console.error('Error duplicating project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to duplicate project: ${errorMessage}`)
    } finally {
      setDuplicatingProjects(prev => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  const filteredProjects = projects.filter((project: Project) =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div
      className="w-full min-h-screen flex flex-col"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      {/* 헤더: Projects 타이틀 + Account Settings */}
      <SiteNavbarSignedIn />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8">
        {/* 제목/버튼/부제목 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">Projects</h1>
            <Button
              variant="default"
              onClick={handleCreateProject}
              disabled={creatingProject || !userId}
              className="flex items-center mt-2"
              aria-label="New project"
              tabIndex={0}
            >
              <Plus className="h-4 w-4 mr-2" />
              {creatingProject ? 'Creating...' : 'New Project'}
            </Button>
          </div>
        </div>
        {/* 메인 상단: 검색창(좌), 뷰모드 버튼(우) */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 flex-shrink-0">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={!userId}
              className="w-full border border-input bg-background rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-ring pr-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed placeholder-muted-foreground"
              style={{ color: 'hsl(var(--foreground))' }}
              aria-label="Search projects"
              tabIndex={0}
            />
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            />
          </div>
          <div className="flex flex-row-reverse gap-4 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('grid')}
              disabled={!userId}
              aria-label="Grid view"
              tabIndex={0}
              className=""
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('list')}
              disabled={!userId}
              aria-label="List view"
              tabIndex={0}
              className=""
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Loading states and error handling */}
        {!isLoaded ? (
          <div className="text-center py-12">
            <div
              className="rounded-lg shadow-lg p-8 border"
              style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <svg className="mx-auto h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                Loading...
              </h3>
              <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                Please wait while we check your authentication status.
              </p>
            </div>
          </div>
        ) : !userId ? (
          <div className="text-center py-12">
            <div
              className="rounded-lg shadow-lg p-8 border"
              style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                Please sign in
              </h3>
              <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                You need to be signed in to view your projects.
              </p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="rounded-lg shadow-lg p-8 border"
              style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {searchTerm ? 'No projects found' : 'You have no projects yet'}
              </h3>
              <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {searchTerm
                  ? 'Try a different search term.'
                  : 'Get started by creating your first project.'}
              </p>
              {!searchTerm && (
                <Button
                  variant="default"
                  onClick={handleCreateProject}
                  disabled={creatingProject}
                  className="flex items-center mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {creatingProject ? 'Creating...' : 'Create Your First Project'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-8 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center'
                : 'grid-cols-1'
            }`}
          >
            {filteredProjects.map((project: Project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onDelete={handleDeleteProject}
                onUpdate={handleUpdateProject}
                onDuplicate={handleDuplicateProject}
                isDeleting={deletingProjects.has(project.id)}
                isDuplicating={duplicatingProjects.has(project.id)}
              />
            ))}

            {/* 백그라운드 동기화 표시 */}
            {isLoading && projects.length > 0 && (
              <div
                className="fixed top-4 right-4 text-xs opacity-50 px-2 py-1 rounded"
                style={{ color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--muted))' }}
              >
                Background sync in progress
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
