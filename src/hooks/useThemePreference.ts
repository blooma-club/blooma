'use client'

import { useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme'

const getStoredTheme = (): ThemePreference | null => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage?.getItem(THEME_STORAGE_KEY)
  return stored === 'dark' || stored === 'light' ? stored : null
}

const getDocumentTheme = (): ThemePreference => {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export const useThemePreference = () => {
  const [theme, setTheme] = useState<ThemePreference>(() => getDocumentTheme())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const updateTheme = () => {
      const stored = getStoredTheme()
      setTheme(stored ?? getDocumentTheme())
    }

    updateTheme()

    const observer = new MutationObserver(() => updateTheme())
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        updateTheme()
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return theme
}
