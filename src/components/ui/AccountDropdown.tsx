'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useUser, useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import { useUserCredits } from '@/hooks/useUserCredits'

export default function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'menu' | 'details'>('menu')
  const { user } = useUser()
  const { signOut } = useClerk()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { subscriptionTier, resetDate, isLoading } = useUserCredits()

  const formattedPlan = useMemo(() => {
    if (!subscriptionTier) return 'Basic'
    const normalized = subscriptionTier.toLowerCase()
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }, [subscriptionTier])

  const formattedCycle = useMemo(() => {
    if (!resetDate) return 'Not available'
    const date = new Date(resetDate)
    if (Number.isNaN(date.getTime())) return 'Not available'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }, [resetDate])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setView('menu')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
      setView('menu')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        aria-expanded={isOpen}
      >
        {/* 사용자 아바타 또는 기본 아이콘 */}
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt="User Avatar"
            width={24}
            height={24}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 bg-neutral-400 dark:bg-neutral-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white dark:text-neutral-300" />
          </div>
        )}

        {/* 사용자 이메일 
        <span className="text-sm text-neutral-700 dark:text-neutral-300 hidden sm:block max-w-32 truncate">
          {user.emailAddresses[0]?.emailAddress}
        </span>*/}

        {/* 드롭다운 화살표 */}
        <ChevronDown
          className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50">
          {view === 'menu' ? (
            <>
              {/* 사용자 정보 헤더 */}
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  {user.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt="User Avatar"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-neutral-400 dark:bg-neutral-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white dark:text-neutral-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {user.fullName && (
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {user.fullName}
                      </p>
                    )}
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                      {user.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* 메뉴 아이템들 */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setView('menu')
                    // TODO: 프로필 설정 페이지로 이동
                    console.log('Profile settings clicked')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>

                <button
                  onClick={() => {
                    setView('details')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </button>

                {/* 구분선 */}
                <div className="my-2 border-t border-neutral-200 dark:border-neutral-700" />

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  Account overview
                </p>
                <button
                  type="button"
                  onClick={() => setView('menu')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
              <div className="px-4 py-3 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Your plan</p>
                  <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                    {isLoading ? 'Loading…' : formattedPlan}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Current cycle</p>
                  <p className="mt-1 text-neutral-800 dark:text-neutral-200">
                    {isLoading ? 'Loading…' : `Renews on ${formattedCycle}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Billing &amp; payment
                  </p>
                  <a
                    href={process.env.NEXT_PUBLIC_POLAR_API_BASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center text-neutral-800 dark:text-neutral-200 underline hover:text-neutral-600 dark:hover:text-neutral-100"
                    onClick={() => setIsOpen(false)}
                  >
                    Manage billing
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
