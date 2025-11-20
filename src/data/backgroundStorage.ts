const STORAGE_KEY = 'promptDockBackgroundSelection'

export const getSavedBackgroundSelection = (): string | null => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(STORAGE_KEY)
}

export const saveBackgroundSelection = (selectionId: string | null) => {
  if (typeof window === 'undefined') return
  if (selectionId === null) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, selectionId)
}
