'use client'

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { THEME_STORAGE_KEY } from '@/lib/theme'

// localStorage에서 테마 설정 읽기
const getStoredTheme = (): 'dark' | 'light' | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return null
}

// 시스템 설정 확인
const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 초기 테마 결정 (저장된 값 > 시스템 설정 > 기본값)
const getInitialTheme = (): 'dark' | 'light' => {
  return getStoredTheme() || getSystemTheme() || 'dark'
}

// 테마 적용
const applyTheme = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 테마 저장
const saveTheme = (isDark: boolean) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
}

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = React.useState(true) // 초기값 (hydration 전까지)
  const [mounted, setMounted] = React.useState(false) // hydration 완료 여부

  // 초기 로드 시 저장된 테마 또는 시스템 설정 적용
  React.useEffect(() => {
    const initialTheme = getInitialTheme()
    const initialIsDark = initialTheme === 'dark'
    setIsDark(initialIsDark)
    applyTheme(initialIsDark)
    setMounted(true)
  }, [])

  // 시스템 테마 변경 감지 (선택적)
  React.useEffect(() => {
    if (!mounted) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    // 저장된 테마가 없을 때만 시스템 설정 감지
    const storedTheme = getStoredTheme()
    if (storedTheme) return

    const handleChange = (e: MediaQueryListEvent) => {
      const systemIsDark = e.matches
      setIsDark(systemIsDark)
      applyTheme(systemIsDark)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mounted])

  const selectTheme = (nextIsDark: boolean) => {
    setIsDark(nextIsDark)
    applyTheme(nextIsDark)
    saveTheme(nextIsDark)
  }

  // hydration 전에는 기본 아이콘 표시 (깜빡임 방지)
  if (!mounted) {
    return (
      <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
        <button
          type="button"
          className="h-7 w-7 rounded-full text-muted-foreground cursor-not-allowed flex items-center justify-center"
          disabled
          aria-label="Switch to light mode"
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="h-7 w-7 rounded-full text-muted-foreground cursor-not-allowed flex items-center justify-center"
          disabled
          aria-label="Switch to dark mode"
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
      <button
        type="button"
        onClick={() => selectTheme(false)}
        aria-label="Switch to light mode"
        aria-pressed={!isDark}
        className={`h-7 w-7 rounded-full transition flex items-center justify-center ${
          !isDark ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => selectTheme(true)}
        aria-label="Switch to dark mode"
        aria-pressed={isDark}
        className={`h-7 w-7 rounded-full transition flex items-center justify-center ${
          isDark ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default ThemeToggle
