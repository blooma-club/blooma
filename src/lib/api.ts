import useSWR, { mutate } from 'swr'
import { useAuth } from '@clerk/nextjs'
import type { Project, ProjectInput, Card } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// 프로젝트 관리
export const useProjects = () => {
  const { userId } = useAuth()
  const { data, error, isLoading, mutate: mutateProjects } = useSWR(
    userId ? '/api/projects' : null, 
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      fallbackData: { data: [] }
    }
  )
  
  const projects = data?.data || []
  
  const createProject = async (projectData: ProjectInput) => {
    const tempId = 'temp-' + Date.now()
    const tempProject = { id: tempId, ...projectData, creating: true }
    
    // 즉시 UI 업데이트
    mutateProjects({ data: [tempProject, ...projects] }, false)
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to create')
      const result = await response.json()
      
      // 임시 → 실제 교체
      mutateProjects({ 
        data: projects.map((p: any) => p.id === tempId ? result.data : p) 
      }, false)
      
      return result.data
    } catch (error) {
      // 실패시 제거
      mutateProjects({ data: projects.filter((p: any) => p.id !== tempId) }, false)
      throw error
    }
  }
  
  const deleteProject = async (projectId: string) => {
    const originalProjects = projects
    
    // 즉시 UI에서 제거
    mutateProjects({ data: projects.filter((p: any) => p.id !== projectId) }, false)
    
    try {
      await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId }),
        credentials: 'include'
      })
    } catch {
      // 실패시 복구
      mutateProjects({ data: originalProjects }, false)
      throw new Error('삭제 실패')
    }
  }

  const updateProject = async (projectId: string, projectData: ProjectInput) => {
    // 즉시 업데이트
    const optimisticProjects = projects.map((p: any) => 
      p.id === projectId ? { ...p, ...projectData } : p
    )
    mutateProjects({ data: optimisticProjects }, false)
    
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, ...projectData }),
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to update')
      const result = await response.json()
      
      // 서버 응답으로 최종 업데이트
      mutateProjects({ 
        data: projects.map((p: any) => p.id === projectId ? result.data : p) 
      }, false)
    } catch {
      mutateProjects() // 실패시 서버에서 다시 로드
      throw new Error('업데이트 실패')
    }
  }
  
  return { projects, isLoading, createProject, deleteProject, updateProject }
}

// 카드 관리
export const useCards = (projectId: string) => {
  const { userId } = useAuth()
  const { data, error, isLoading, mutate: mutateCards } = useSWR(
    userId && projectId ? `/api/cards?project_id=${projectId}` : null,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      fallbackData: { data: [] }
    }
  )
  
  const cards = data?.data || []
  
  const deleteCard = async (cardId: string) => {
    // 즉시 제거 - 함수형 mutate로 최신 캐시 기반 처리
    mutateCards((prev: any) => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return { data: base.filter((c: any) => c.id !== cardId) }
    }, false)
    
    try {
      await fetch('/api/cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId] }),
        credentials: 'include'
      })
    } catch {
      // 실패 시 서버에서 재검증
      await mutateCards()
      throw new Error('삭제 실패')
    }
  }
  
  const updateCard = async (cardId: string, updates: Partial<Card>) => {
    // 즉시 업데이트 (함수형 mutate)
    mutateCards((prev: any) => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      const next = base.map((c: any) => (c.id === cardId ? { ...c, ...updates } : c))
      return { data: next }
    }, false)
    
    try {
      await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: [{ id: cardId, ...updates }] }),
        credentials: 'include'
      })
    } catch {
      await mutateCards() // 실패시 서버에서 다시 로드
      throw new Error('업데이트 실패')
    }
  }

  const updateCards = async (cardsToUpdate: Partial<Card>[]) => {
    // 즉시 업데이트 (함수형 mutate)
    mutateCards((prev: any) => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      const next = base.map((c: any) => {
        const update = cardsToUpdate.find((u: any) => u.id === c.id)
        return update ? { ...c, ...update } : c
      })
      return { data: next }
    }, false)
    
    try {
      await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardsToUpdate }),
        credentials: 'include'
      })
    } catch {
      await mutateCards() // 실패시 서버에서 다시 로드
      throw new Error('업데이트 실패')
    }
  }
  
  return { cards, isLoading, deleteCard, updateCard, updateCards, mutate: mutateCards }
}
