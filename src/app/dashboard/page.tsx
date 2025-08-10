'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { ProjectCreateModal } from '@/components/dashboard/ProjectCreateModal'
import { type Project, type ProjectInput } from '@/types'
import { Plus, Search, Grid, List } from 'lucide-react'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  // const [loading, setLoading] = useState(false);

  // Supabase 연동 제거 - 기본 UI만 유지
  const fetchProjects = async () => {
    // 기본 UI만 유지하므로 실제 데이터 fetch 제거
    console.log("🔍 Debug: fetchProjects called (Supabase removed)")
  }

  useEffect(() => {
    if (isLoaded) {
      fetchProjects()
    }
  }, [isLoaded, user?.id])

  const handleCreateProject = async (projectData: ProjectInput) => {
    if (!user?.id) {
      alert("Please sign in to create a project")
      return
    }
    
    // 기본 UI만 유지하므로 실제 프로젝트 생성 제거
    console.log("🔍 Debug: Creating project (Supabase removed)", projectData)
    
    // UI 업데이트만 수행 (실제 저장 없음)
    const mockProject: Project = {
      id: `mock-${Date.now()}`,
      title: projectData.title,
      description: projectData.description,
      user_id: user.id,
      is_public: projectData.is_public || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setProjects(prev => [mockProject, ...prev])
    setIsCreateModalOpen(false)
    
    // 프로젝트 생성 후 셋업 페이지로 자동 이동
    router.push(`/project/${mockProject.id}/setup`)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Do you want to delete this project?')) return
    
    // 기본 UI만 유지하므로 실제 삭제 제거
    console.log("🔍 Debug: Deleting project (Supabase removed)", projectId)
    
    // UI 업데이트만 수행 (실제 삭제 없음)
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더: Projects 타이틀 + Create 버튼만 */}
      <header className="w-full bg-white border-b-2 border-gray-900 px-6 py-4 flex items-center">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/blooma.svg"
            alt="Blooma Logo"
            aria-label="Blooma Logo"
            className="w-10 h-10 object-contain select-none"
            draggable={false}
          />
          <span className="text-2xl font-bold text-gray-900 select-none ml-1">Blooma</span>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8">
        {/* 제목/버튼/부제목 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
            <Button
              variant="default"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center mt-2"
              aria-label="New project"
              tabIndex={0}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
          <p className="text-lg text-gray-500 mb-0">Manage, search and create your projects easily</p>
        </div>
        {/* 메인 상단: 검색창(좌), 뷰모드 버튼(우) */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 flex-shrink-0">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-black pr-10 h-10"
              aria-label="Search projects"
              tabIndex={0}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
          <div className="flex flex-row-reverse gap-4 flex-shrink-0">
            <Button
              variant="reverse"
              size="icon"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              tabIndex={0}
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              variant="reverse"
              size="icon"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              tabIndex={0}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No projects found' : 'You have no projects yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try a different search term.' : 'Get started by creating your first project.'}
              </p>
              {!searchTerm && null}
            </div>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
            }`}>
            {filteredProjects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onDelete={handleDeleteProject}
                reverse={idx === 0}
              />
            ))}
          </div>
        )}
      </main>
      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  )
}
