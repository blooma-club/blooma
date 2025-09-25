/**
 * LocalStorage utilities for auto-saving storyboard data
 */

export interface OptionalSettingsDraft {
  intent?: string
  genre?: string
  tone?: string
  audience?: string
  objective?: string
  keyMessage?: string
  language?: string
  constraints?: string
}

export interface StoryboardDraft {
  projectId: string
  script: string
  visualStyle: string
  ratio: string
  selectedModel: string
  lastSaved: number
  settings?: OptionalSettingsDraft
  characters?: Array<{ id: string; imageUrl?: string }>
}



export interface StoryboardPageData {
  storyboardId: string
  title: string
  frames: any[]
  status: any
  lastSaved: number
}

// Remember last opened storyboard per project for navigation continuity
export const saveLastStoryboardId = (projectId: string, storyboardId: string) => {
  try {
    localStorage.setItem(`last_sb_${projectId}`, storyboardId)
  } catch {}
}

export const loadLastStoryboardId = (projectId: string): string | null => {
  try {
    return localStorage.getItem(`last_sb_${projectId}`)
  } catch {
    return null
  }
}

// SetupForm 자동 저장
export const saveDraftToLocal = (projectId: string, draft: Omit<StoryboardDraft, 'projectId' | 'lastSaved'>) => {
  try {
    const data: StoryboardDraft = {
      ...draft,
      projectId,
      lastSaved: Date.now()
    }
    localStorage.setItem(`draft_${projectId}`, JSON.stringify(data))
    console.log('Draft saved to localStorage:', data)
  } catch (error) {
    console.warn('Failed to save draft to localStorage:', error)
  }
}

export const loadDraftFromLocal = (projectId: string): StoryboardDraft | null => {
  try {
    const saved = localStorage.getItem(`draft_${projectId}`)
    if (!saved) return null
    
    const data = JSON.parse(saved) as StoryboardDraft
    // 24시간 이상 된 데이터는 삭제
    if (Date.now() - data.lastSaved > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`draft_${projectId}`)
      return null
    }
    
    return data
  } catch (error) {
    console.warn('Failed to load draft from localStorage:', error)
    return null
  }
}

export const clearDraftFromLocal = (projectId: string) => {
  try {
    localStorage.removeItem(`draft_${projectId}`)
    console.log('Draft cleared from localStorage for project:', projectId)
  } catch (error) {
    console.warn('Failed to clear draft from localStorage:', error)
  }
}



// 스토리보드 페이지 데이터 저장
export const saveStoryboardPageData = (data: StoryboardPageData) => {
  try {
    const dataWithTimestamp = {
      ...data,
      lastSaved: Date.now()
    }
    localStorage.setItem(`storyboard_${data.storyboardId}`, JSON.stringify(dataWithTimestamp))
    console.log('Storyboard page data saved:', data.storyboardId)
  } catch (error) {
    console.warn('Failed to save storyboard page data:', error)
  }
}

export const loadStoryboardPageData = (storyboardId: string): StoryboardPageData | null => {
  try {
    const saved = localStorage.getItem(`storyboard_${storyboardId}`)
    if (!saved) return null
    
    const data = JSON.parse(saved) as StoryboardPageData
    // 1시간 이상 된 데이터는 삭제 (스토리보드는 더 자주 업데이트됨)
    if (Date.now() - data.lastSaved > 60 * 60 * 1000) {
      localStorage.removeItem(`storyboard_${storyboardId}`)
      return null
    }
    
    return data
  } catch (error) {
    console.warn('Failed to load storyboard page data:', error)
    return null
  }
}

export const clearStoryboardPageData = (storyboardId: string) => {
  try {
    localStorage.removeItem(`storyboard_${storyboardId}`)
    console.log('Storyboard page data cleared:', storyboardId)
  } catch (error) {
    console.warn('Failed to clear storyboard page data:', error)
  }
}

// 전체 프로젝트 데이터 정리
export const cleanupProjectData = (projectId: string) => {
  try {
    clearDraftFromLocal(projectId)
    console.log('All project data cleaned up:', projectId)
  } catch (error) {
    console.warn('Failed to cleanup project data:', error)
  }
}

// 브라우저 저장소 크기 확인
export const getStorageUsage = () => {
  try {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return {
      used: total,
      usedMB: (total / 1024 / 1024).toFixed(2),
      available: '~5MB' // 브라우저마다 다름
    }
  } catch (error) {
    return { used: 0, usedMB: '0', available: 'Unknown' }
  }
}
