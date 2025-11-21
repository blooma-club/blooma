'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { type Project, type ProjectInput } from '@/types'
import { Plus, Search, Grid, List } from 'lucide-react'
import { useProjects } from '@/lib/api'
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
    <div className="relative w-full min-h-screen flex flex-col bg-background">
      {/* 배경 장식: 은은한 그리드 + 그라디언트 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(500px_250px_at_top_right,rgba(120,119,198,0.10)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(500px_250px_at_bottom_left,rgba(56,189,248,0.10)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,hsl(var(--foreground)/0.10)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.10)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* 상단 내비게이션 */}
      <SiteNavbarSignedIn />

      {/* 메인 */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground">
                Create, manage, and explore your storyboard projects.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                onClick={handleCreateProject}
                disabled={creatingProject || !userId}
                className="flex items-center"
                aria-label="New project"
                tabIndex={0}
              >
                <Plus className="h-4 w-4 mr-2" />
                {creatingProject ? 'Creating...' : 'New Project'}
              </Button>
            </div>
          </div>
        </div>

        {/* 툴바: 검색 + 뷰 토글 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={!userId}
              aria-label="Search projects"
              tabIndex={0}
              className="w-full h-11 rounded-full bg-muted/50 border border-border px-4 pr-10 text-sm outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring transition disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
            />
            <span className="hidden sm:flex items-center justify-center absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border rounded-md px-1.5 py-0.5">
              /
            </span>
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
          <div className="inline-flex rounded-full border border-border p-1 bg-muted/40">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              disabled={!userId}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setViewMode('list')
              }}
              className={`h-9 px-3 rounded-full text-sm transition ${
                viewMode === 'list'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              disabled={!userId}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setViewMode('grid')
              }}
              className={`h-9 px-3 rounded-full text-sm transition ${
                viewMode === 'grid'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </span>
            </button>
          </div>
        </div>

        {/* Loading states and error handling */}
        {!isLoaded ? (
          <div className="text-center py-12">
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <div className="mb-4 text-muted-foreground">
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
              <h3 className="text-lg font-medium mb-2">Loading...</h3>
              <p className="text-muted-foreground">
                Please wait while we check your authentication status.
              </p>
            </div>
          </div>
        ) : !userId ? (
          <div className="text-center py-12">
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <div className="mb-4 text-muted-foreground">
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
              <h3 className="text-lg font-medium mb-2">Please sign in</h3>
              <p className="mb-4 text-muted-foreground">
                You need to be signed in to view your projects.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div
            className={`grid gap-6 md:gap-8 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center'
                : 'grid-cols-1'
            }`}
          >
            {Array.from({ length: viewMode === 'grid' ? 6 : 3 }).map((_, i) => (
              <div
                key={i}
                className="w-full max-w-[440px] h-[260px] rounded-2xl border bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <div className="mb-4 text-muted-foreground">
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
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No projects found' : 'You have no projects yet'}
              </h3>
              <p className="mb-6 text-muted-foreground">
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
            className={`grid gap-6 md:gap-8 ${
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
          </div>
        )}
      </main>
    </div>
  )
}
