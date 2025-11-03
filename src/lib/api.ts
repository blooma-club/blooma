import useSWR from 'swr'
import { useMemo, useEffect } from 'react'
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
  const storageKey = useMemo(() => (userId ? `projects_cache_${userId}` : null), [userId])
  const cachedInitial = useMemo(() => {
    try {
      if (typeof window === 'undefined' || !storageKey) return undefined
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed)) {
        return { data: parsed as Project[] }
      }
      return undefined
    } catch {
      return undefined
    }
  }, [storageKey])

  const { data, isLoading, mutate: mutateProjects } = useSWR(
    userId ? '/api/projects' : null, 
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 2000,
      fallbackData: cachedInitial
    }
  )
  
  const projects: Project[] = Array.isArray(data?.data) ? data.data : []

  // 세션 캐시에 최신 프로젝트 목록 저장 (즉시 렌더용)
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !storageKey) return
      if (Array.isArray(projects)) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(projects))
      }
    } catch {}
  }, [projects, storageKey])
  
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

  const duplicateProject = async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to duplicate')
    }

    const result = await response.json()
    const duplicated = result?.data as Project | undefined
    if (!duplicated) {
      throw new Error('Duplicate response missing project data')
    }

    mutateProjects(
      (prev: { data: Project[] } | undefined) => {
        const currentData: Project[] = Array.isArray(prev?.data) ? prev.data : []
        const base = currentData.slice()
        const index = base.findIndex(project => project.id === projectId)
        if (index === -1) {
          return { data: [duplicated, ...base] }
        }

        base.splice(index + 1, 0, duplicated)
        return { data: base }
      },
      false,
    )

    return duplicated
  }
  
  return { projects, isLoading, createProject, deleteProject, updateProject, duplicateProject }
}

// 카드 관리
export const useCards = (projectId: string) => {
  const { userId } = useAuth()
  const { data, isLoading, mutate: mutateCards } = useSWR(
    userId && projectId ? `/api/cards?project_id=${projectId}` : null,
    fetcher,
    {
      // refreshInterval: 0, // 주기적 자동 새로고침 비활성화 (필요시 수동으로 mutate 호출)
      revalidateOnFocus: false,
      revalidateOnReconnect: true, // 네트워크 재연결 시에만 새로고침
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
