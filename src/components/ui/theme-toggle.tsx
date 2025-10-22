"use client"

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = React.useState(true) // 다크 모드가 기본

  React.useEffect(() => {
    // 초기 로드 시 다크 모드 설정
    document.documentElement.classList.add('dark')
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-lg border-neutral-700/60 bg-neutral-900/70 text-neutral-100 transition-colors hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0"
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

export default ThemeToggle
