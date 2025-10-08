'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { type Project, type ProjectInput } from '@/types'
import { Plus, Search, Grid, List, RefreshCw, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import AccountDropdown from '@/components/ui/AccountDropdown'
import CreditStatus from '@/components/ui/CreditStatus'
// import CreditDisplay from '@/components/ui/CreditDisplay'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, session } = useSupabase()
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProjects, setDeletingProjects] = useState<Set<string>>(new Set())
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const lastFetchedUserIdRef = useRef<string | null>(null)

  const fetchProjects = async () => {
    if (!user?.id) {
      return
    }

    setProjectsLoading(true)
    setProjectsError(null)

    try {
      if (!session) {
        throw new Error('No active session found')
      }

      // Use the API endpoint that includes has_cards information
      const response = await fetch(`/api/projects?user_id=${user.id}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch projects')
      }

      setProjects(result.data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setProjectsError(`Failed to load projects: ${errorMessage}`)
    } finally {
      setProjectsLoading(false)
    }
  }

  useEffect(() => {
    if (loading) return

    const userId = user?.id ?? null
    if (!userId) {
      setProjects([])
      setProjectsError(null)
      lastFetchedUserIdRef.current = null
      return
    }

    // 동일 사용자에 대해 최초 1회만 자동 로드 (개발 모드 StrictMode 이중 실행 방지)
    if (lastFetchedUserIdRef.current === userId) return
    lastFetchedUserIdRef.current = userId
    fetchProjects()
  }, [loading, user?.id])

  const handleCreateProject = async () => {
    if (!user?.id || !session?.access_token) {
      alert('Please sign in to create a project')
      return
    }

    setCreatingProject(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: 'New Project',
          user_id: user.id,
          is_public: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project')
      }

      const data = result.data
      setProjects(prev => [data, ...prev])

      // 프로젝트 생성 후 바로 스토리보드 페이지로 이동
      router.push(`/project/${data.id}/storyboard`)
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
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: projectId,
          title: projectData.title,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project')
      }

      // Update the project in the local state
      setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, ...result.data } : p)))
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Do you want to delete this project?')) return

    setDeletingProjects(prev => new Set(prev).add(projectId))
    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          id: projectId,
          user_id: user?.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project')
      }

      setProjects(prev => prev.filter(p => p.id !== projectId))
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

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-full min-h-screen bg-black flex flex-col">
      {/* 헤더: Projects 타이틀 + Account Settings */}
      <header className="w-full bg-black border-b-2 border-neutral-800 px-8 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Image
            src="/blooma_logo.svg"
            alt="Blooma Logo"
            width={40}
            height={40}
            className="w-10 h-10 object-contain select-none"
            draggable={false}
          />
          <span className="text-2xl font-bold text-white select-none ml-1">Blooma</span>
        </button>

        {/* 오른쪽: 크레딧 상태 및 계정 설정 */}
        <div className="flex items-center gap-6">
          {/* 크레딧 상태 */}
          <CreditStatus />

          {/* 계정 설정 드롭다운 */}
          <AccountDropdown />
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8">
        {/* 제목/버튼/부제목 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white">Projects</h1>
            <Button
              variant="default"
              onClick={handleCreateProject}
              disabled={creatingProject || !user?.id}
              className="flex items-center mt-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white"
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
              disabled={!user?.id}
              className="w-full border border-neutral-700 bg-neutral-900 text-white rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-white pr-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed placeholder-neutral-400"
              aria-label="Search projects"
              tabIndex={0}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5 pointer-events-none" />
          </div>
          <div className="flex flex-row-reverse gap-4 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('grid')}
              disabled={!user?.id}
              aria-label="Grid view"
              tabIndex={0}
              className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('list')}
              disabled={!user?.id}
              aria-label="List view"
              tabIndex={0}
              className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Loading states and error handling */}
        {loading ? (
          <div className="text-center py-12">
            <div className="bg-neutral-900 rounded-lg shadow-lg p-8 border border-neutral-800">
              <div className="text-neutral-400 mb-4">
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
              <h3 className="text-lg font-medium text-white mb-2">Loading...</h3>
              <p className="text-neutral-300">
                Please wait while we check your authentication status.
              </p>
            </div>
          </div>
        ) : projectsLoading ? (
          <div className="text-center py-12">
            <div className="bg-neutral-900 rounded-lg shadow-lg p-8 border border-neutral-800">
              <div className="text-neutral-400 mb-4">
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
              <h3 className="text-lg font-medium text-white mb-2">Loading projects...</h3>
              <p className="text-neutral-300">Please wait while we fetch your projects.</p>
            </div>
          </div>
        ) : projectsError ? (
          <div className="text-center py-12">
            <div className="bg-neutral-900 rounded-lg shadow-lg p-8 border border-neutral-800">
              <div className="text-red-400 mb-4">
                <AlertCircle className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error loading projects</h3>
              <p className="text-neutral-300 mb-4">{projectsError}</p>
              <div className="space-y-2">
                <Button
                  variant="default"
                  onClick={() => fetchProjects()}
                  className="flex items-center mx-auto bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : !user?.id ? (
          <div className="text-center py-12">
            <div className="bg-neutral-900 rounded-lg shadow-lg p-8 border border-neutral-800">
              <div className="text-neutral-400 mb-4">
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
              <h3 className="text-lg font-medium text-white mb-2">Please sign in</h3>
              <p className="text-neutral-300 mb-4">
                You need to be signed in to view your projects.
              </p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-neutral-900 rounded-lg shadow-lg p-8 border border-neutral-800">
              <div className="text-neutral-400 mb-4">
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
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm ? 'No projects found' : 'You have no projects yet'}
              </h3>
              <p className="text-neutral-300 mb-6">
                {searchTerm
                  ? 'Try a different search term.'
                  : 'Get started by creating your first project.'}
              </p>
              {!searchTerm && (
                <Button
                  variant="default"
                  onClick={handleCreateProject}
                  disabled={creatingProject}
                  className="flex items-center mx-auto bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white"
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
            {filteredProjects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onDelete={handleDeleteProject}
                onUpdate={handleUpdateProject}
                reverse={idx === 0}
                isDeleting={deletingProjects.has(project.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
