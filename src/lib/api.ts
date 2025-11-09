import useSWR from 'swr'
import { useMemo, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import type {
  Project,
  ProjectInput,
  Card,
  DashboardProjectPreview,
  StoryboardBasicCard,
} from '@/types'
import { useStoryboardCardsStore, selectOrderedCards } from '@/store/storyboardCards'

type ProjectsResponse = { data?: Project[] }
type DashboardProjectsResponse = { data?: DashboardProjectPreview[] }

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// 프로젝트 관리
export const useProjects = () => {
  const { userId } = useAuth()
  const storageKey = useMemo(() => (userId ? `projects_cache_${userId}` : null), [userId])
  const cachedInitial = useMemo<ProjectsResponse | undefined>(() => {
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

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    mutate: mutateDashboard,
  } = useSWR<DashboardProjectsResponse>(userId ? '/api/projects/dashboard' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  })

  const {
    data,
    isLoading: isFullLoading,
    mutate: mutateProjects,
  } = useSWR<ProjectsResponse>(userId ? '/api/projects' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
    dedupingInterval: 2000,
    fallbackData: cachedInitial,
  })

  const dashboardProjects: DashboardProjectPreview[] = useMemo(
    () => (Array.isArray(dashboardData?.data) ? dashboardData.data : []),
    [dashboardData]
  )
  const fullProjects: Project[] = useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data]
  )

  const projects: Project[] = useMemo(() => {
    if (!userId) return []
    const previewMap = new Map(dashboardProjects.map(entry => [entry.project_id, entry]))
    const dashboardOrder = dashboardProjects.map(entry => entry.project_id)
    const fullMap = new Map(fullProjects.map(project => [project.id, project]))

    const ordered = dashboardOrder
      .map(projectId => {
        const preview = previewMap.get(projectId)
        const full = fullMap.get(projectId)
        if (full) {
          return {
            ...full,
            preview_image: preview?.image_url ?? full.preview_image ?? null,
            created_at: full.created_at ?? preview?.created_at ?? full.created_at,
          }
        }
        if (!preview) {
          return null
        }
        return {
          id: preview.project_id,
          user_id: userId,
          title: preview.project_title ?? preview.title,
          description: undefined,
          created_at: preview.created_at ?? undefined,
          preview_image: preview.image_url ?? null,
        } as Project
      })
      .filter((project): project is Project => project !== null)

    const remaining = fullProjects.filter(project => !previewMap.has(project.id))
    return [...ordered, ...remaining]
  }, [dashboardProjects, fullProjects, userId])

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !storageKey) return
      if (Array.isArray(projects)) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(projects))
      }
    } catch {
      // ignore storage errors
    }
  }, [projects, storageKey])

  const isLoading =
    Boolean(userId) &&
    projects.length === 0 &&
    !dashboardData &&
    (isDashboardLoading || isFullLoading)

  const createProject = async (projectData: ProjectInput) => {
    if (!userId) {
      throw new Error('Authentication required')
    }

    const tempId = `temp-${Date.now()}`
    const tempProject: Project = {
      id: tempId,
      user_id: userId,
      title: projectData.title,
      description: projectData.description,
      preview_image: null,
      created_at: new Date().toISOString(),
    }

    const optimisticPreview: DashboardProjectPreview = {
      project_id: tempId,
      project_title: projectData.title,
      card_title: null,
      title: projectData.title,
      image_url: null,
      created_at: new Date().toISOString(),
    }

    const originalDashboard = Array.isArray(dashboardData?.data) ? [...dashboardData.data] : []

    mutateProjects(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return { data: [tempProject, ...base] }
    }, false)

    mutateDashboard(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return { data: [optimisticPreview, ...base] }
    }, false)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to create')
      const result = await response.json()

      mutateProjects(prev => {
        const base = Array.isArray(prev?.data) ? prev.data : []
        return {
          data: base.map(project => (project.id === tempId ? result.data : project)),
        }
      }, false)

      mutateDashboard(prev => {
        const base = Array.isArray(prev?.data) ? prev.data : []
        return {
          data: base.map(entry =>
            entry.project_id === tempId
              ? {
                  ...entry,
                  project_id: result.data.id,
                  project_title: result.data.title,
                  title: result.data.title,
                }
              : entry
          ),
        }
      }, false)

      return result.data
    } catch (error) {
      mutateProjects(prev => {
        const base = Array.isArray(prev?.data) ? prev.data : []
        return { data: base.filter(project => project.id !== tempId) }
      }, false)
      mutateDashboard({ data: originalDashboard }, false)
      throw error
    }
  }

  const deleteProject = async (projectId: string) => {
    const originalProjects = fullProjects
    const originalDashboard = Array.isArray(dashboardData?.data) ? [...dashboardData.data] : []

    mutateProjects(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return { data: base.filter(project => project.id !== projectId) }
    }, false)

    mutateDashboard(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return { data: base.filter(entry => entry.project_id !== projectId) }
    }, false)

    try {
      await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId }),
        credentials: 'include',
      })
    } catch {
      mutateProjects({ data: originalProjects }, false)
      mutateDashboard({ data: originalDashboard }, false)
      throw new Error('삭제 실패')
    }
  }

  const updateProject = async (projectId: string, projectData: ProjectInput) => {
    const originalDashboard = Array.isArray(dashboardData?.data) ? [...dashboardData.data] : []

    mutateProjects(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return {
        data: base.map(project =>
          project.id === projectId ? { ...project, ...projectData } : project
        ),
      }
    }, false)

    mutateDashboard(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return {
        data: base.map(entry =>
          entry.project_id === projectId
            ? {
                ...entry,
                project_title: projectData.title ?? entry.project_title,
                title: projectData.title ?? entry.title,
              }
            : entry
        ),
      }
    }, false)

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, ...projectData }),
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to update')
      const result = await response.json()

      mutateProjects(prev => {
        const base = Array.isArray(prev?.data) ? prev.data : []
        return {
          data: base.map(project => (project.id === projectId ? result.data : project)),
        }
      }, false)

      mutateDashboard(prev => {
        const base = Array.isArray(prev?.data) ? prev.data : []
        return {
          data: base.map(entry =>
            entry.project_id === projectId
              ? {
                  ...entry,
                  project_title: result.data.title,
                  title: result.data.title,
                }
              : entry
          ),
        }
      }, false)
    } catch {
      mutateDashboard({ data: originalDashboard }, false)
      mutateProjects({ data: fullProjects }, false)
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

    mutateProjects(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      const index = base.findIndex(project => project.id === projectId)
      if (index === -1) {
        return { data: [duplicated, ...base] }
      }
      const next = base.slice()
      next.splice(index + 1, 0, duplicated)
      return { data: next }
    }, false)

    mutateDashboard(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      const source = base.find(entry => entry.project_id === projectId)
      const duplicatePreview: DashboardProjectPreview = {
        project_id: duplicated.id,
        project_title: duplicated.title,
        card_title: source?.card_title ?? null,
        title: duplicated.title,
        image_url: source?.image_url ?? null,
        created_at: duplicated.created_at ?? new Date().toISOString(),
      }
      const next = base.slice()
      const sourceIndex = next.findIndex(entry => entry.project_id === projectId)
      if (sourceIndex === -1) {
        next.unshift(duplicatePreview)
      } else {
        next.splice(sourceIndex + 1, 0, duplicatePreview)
      }
      return { data: next }
    }, false)

    return duplicated
  }

  return { projects, isLoading, createProject, deleteProject, updateProject, duplicateProject }
}

// 카드 관리
export const useCards = (projectId: string) => {
  const { userId } = useAuth()
  const setProject = useStoryboardCardsStore(state => state.setProject)
  const setLoadingState = useStoryboardCardsStore(state => state.setLoadingState)
  const setBasicCards = useStoryboardCardsStore(state => state.setBasicCards)
  const setFullCards = useStoryboardCardsStore(state => state.setFullCards)
  const mergeFullCards = useStoryboardCardsStore(state => state.mergeFullCards)
  const removeCards = useStoryboardCardsStore(state => state.removeCards)
  const orderedCards = useStoryboardCardsStore(selectOrderedCards)

  useEffect(() => {
    setProject(projectId ?? null)
  }, [projectId, setProject])

  const basicKey = userId && projectId ? `/api/projects/${projectId}/storyboard?scope=basic` : null
  const fullKey = userId && projectId ? `/api/projects/${projectId}/storyboard?scope=full` : null

  const { data: basicData, isLoading: isBasicLoading } = useSWR<{ data?: StoryboardBasicCard[] }>(
    basicKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    }
  )

  useEffect(() => {
    if (!projectId) return
    setLoadingState('basic', Boolean(basicKey) && isBasicLoading)
  }, [projectId, basicKey, isBasicLoading, setLoadingState])

  useEffect(() => {
    if (!projectId) return
    if (Array.isArray(basicData?.data)) {
      setBasicCards(projectId, basicData.data)
    }
  }, [projectId, basicData, setBasicCards])

  const {
    data: fullData,
    isLoading: isFullLoading,
    mutate: mutateCards,
  } = useSWR<{ data?: Card[] }>(fullKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  })

  useEffect(() => {
    if (!projectId) return
    setLoadingState('full', Boolean(fullKey) && isFullLoading)
  }, [projectId, fullKey, isFullLoading, setLoadingState])

  useEffect(() => {
    if (!projectId) return
    if (Array.isArray(fullData?.data)) {
      setFullCards(projectId, fullData.data)
    }
  }, [projectId, fullData, setFullCards])

  const cards = orderedCards
  const hasBasicData = Array.isArray(basicData?.data)
  const isInitialLoading = !hasBasicData && isBasicLoading
  const isLoading = isInitialLoading

  const deleteCard = async (cardId: string) => {
    if (!projectId) return

    removeCards(projectId, [cardId])
    mutateCards(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return { data: base.filter(card => card.id !== cardId) }
    }, false)

    try {
      await fetch('/api/cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId] }),
        credentials: 'include',
      })
    } catch {
      await mutateCards()
      throw new Error('삭제 실패')
    }
  }

  const updateCard = async (cardId: string, updates: Partial<Card>) => {
    if (!projectId) return

    mergeFullCards(projectId, [{ id: cardId, ...updates }])
    mutateCards(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return {
        data: base.map(card => (card.id === cardId ? { ...card, ...updates } : card)),
      }
    }, false)

    try {
      await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: [{ id: cardId, ...updates }] }),
        credentials: 'include',
      })
    } catch {
      await mutateCards()
      throw new Error('업데이트 실패')
    }
  }

  const updateCards = async (cardsToUpdate: Partial<Card>[]) => {
    if (!projectId || !cardsToUpdate.length) return

    mergeFullCards(projectId, cardsToUpdate)
    mutateCards(prev => {
      const base = Array.isArray(prev?.data) ? prev.data : []
      return {
        data: base.map(card => {
          const patch = cardsToUpdate.find(update => update.id === card.id)
          return patch ? { ...card, ...patch } : card
        }),
      }
    }, false)

    try {
      await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardsToUpdate }),
        credentials: 'include',
      })
    } catch {
      await mutateCards()
      throw new Error('업데이트 실패')
    }
  }

  return {
    cards,
    isLoading,
    isInitialLoading,
    deleteCard,
    updateCard,
    updateCards,
    mutate: mutateCards,
  }
}
