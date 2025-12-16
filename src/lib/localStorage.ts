/**
 * LocalStorage utilities
 * Note: Storyboard/project-related localStorage functions removed
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
  aiModel?: string
}

// Save aspect ratio for a session
export const saveRatio = (key: string, ratio: string) => {
  try {
    localStorage.setItem(`ratio_${key}`, ratio)
  } catch { }
}

export const loadRatio = (key: string): string | null => {
  try {
    return localStorage.getItem(`ratio_${key}`)
  } catch {
    return null
  }
}

// Browser storage size check
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
      available: '~5MB' // varies by browser
    }
  } catch {
    return { used: 0, usedMB: '0', available: 'Unknown' }
  }
}
