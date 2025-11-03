"use client"

import React from 'react'
import { Moon, Sun } from 'lucide-react'

const THEME_STORAGE_KEY = 'blooma_theme_preference'

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

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    applyTheme(newIsDark)
    saveTheme(newIsDark)
  }

  // hydration 전에는 기본 아이콘 표시 (깜빡임 방지)
  if (!mounted) {
    return (
      <button
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm text-foreground hover:bg-accent/50 hover:border-border transition-all"
        aria-label="테마 전환"
        disabled
      >
        <Moon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm text-foreground hover:bg-accent/50 hover:border-border transition-all"
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}

export default ThemeToggle
