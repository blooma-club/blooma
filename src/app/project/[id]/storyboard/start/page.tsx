'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Film, Sparkles, FileText } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { loadDraftFromLocal } from '@/lib/localStorage'

export default function StoryboardPage() {
  const params = useParams()
  const projectParam = params?.id
  const projectId = Array.isArray(projectParam) ? projectParam[0] : projectParam
  const router = useRouter()
  const { user, isLoaded } = useUser()

  // Clerk의 userId 추출
  const userId = user?.id || null

  const [creating] = useState(false)
  const [checkingStoryboard, setCheckingStoryboard] = useState(true)
  const [accessError, setAccessError] = useState<string | null>(null)

  useEffect(() => {
    const checkStoryboard = async () => {
      if (!isLoaded) {
        return
      }

      if (!projectId || !userId) {
        setCheckingStoryboard(false)
        return
      }

      try {
        // Check if there are any cards in this project
        // This indicates that there are storyboards for this project
        const cardsResponse = await fetch(
          `/api/cards?project_id=${encodeURIComponent(projectId)}`,
          { credentials: 'include' }
        )

        if (!cardsResponse.ok) {
          console.error('[STORYBOARD CHECK] Failed to check cards', cardsResponse.status)
          throw new Error('Failed to check existing storyboards')
        }

        const cardsPayload: { data?: unknown[] } = await cardsResponse.json().catch(() => ({}))

        const count = Array.isArray(cardsPayload.data) ? cardsPayload.data.length : 0

        if (count > 0) {
          router.replace(`/project/${projectId}/storyboard`)
          // 리디렉션 중이므로 checkingStoryboard를 false로 설정하지 않음
          return
        }

        const savedDraft = loadDraftFromLocal(projectId)
        if (savedDraft) {
          router.replace(`/project/${projectId}/setup`)
          return
        }

        // 스토리보드가 없으면 Setup 페이지 표시
        setCheckingStoryboard(false)
      } catch (error) {
        console.error('Failed to check storyboards:', error)
        // Check if it's an access error
        if (error instanceof Error && error.message.includes('access')) {
          setAccessError(error.message)
        } else {
          // Other errors - show creation options
          setAccessError(null)
        }
        setCheckingStoryboard(false)
      }
    }

    checkStoryboard()
  }, [projectId, userId, router, isLoaded])

  const navigateToSetup = () => {
    router.push(`/project/${projectId}/setup`)
  }

  const navigateToStoryboard = () => {
    if (!projectId) return
    router.push(`/project/${projectId}/storyboard`)
  }

  // 스토리보드 확인 중
  if (checkingStoryboard) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 animate-spin text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <div className="text-neutral-300 text-lg font-medium">Loading storyboard...</div>
          <div className="text-neutral-500 text-sm mt-2">
            Please wait while we check your project
          </div>
        </div>
      </div>
    )
  }

  // 액세스 에러 시 표시
  if (accessError) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-neutral-300 mb-4">{accessError}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 스토리보드가 없으면 생성 옵션 표시
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <div className="max-w-4xl mx-auto text-center">
        {/* 메인 아이콘 */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-neutral-900 rounded-2xl mb-6">
            <Film className="w-12 h-12 text-neutral-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Create Your Content</h1>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Start creating your visual content. You can generate content with AI assistance or build
            it manually from scratch.
          </p>
        </div>

        {/* 옵션 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          {/* AI 생성 옵션 */}
          <div className="group relative">
            <button
              onClick={navigateToSetup}
              className="w-full p-8 bg-neutral-900 border-2 border-neutral-800 hover:border-blue-500 rounded-2xl transition-all duration-300 hover:bg-neutral-800 hover:scale-105 text-left"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-xl mb-6 group-hover:bg-blue-500/20 transition-colors">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Start with AI</h3>
              <p className="text-neutral-400 leading-relaxed">
                Let AI help you create professional visual content with smart suggestions and
                automated generation from your script.
              </p>
              <div className="mt-6 inline-flex items-center text-blue-400 font-medium">
                <span>Get Started</span>
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          </div>

          {/* 빈 스토리보드 옵션 */}
          <div className="group relative">
            <button
              onClick={navigateToStoryboard}
              disabled={creating}
              className={`w-full p-8 border-2 rounded-2xl transition-all duration-300 text-left ${creating
                  ? 'bg-neutral-900 border-neutral-800 cursor-not-allowed opacity-50'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 hover:scale-105'
                }`}
            >
              <div
                className={`flex items-center justify-center w-16 h-16 rounded-xl mb-6 transition-colors ${creating ? 'bg-neutral-800' : 'bg-neutral-800 group-hover:bg-neutral-700'
                  }`}
              >
                {creating ? (
                  <svg
                    className="w-6 h-6 animate-spin text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <FileText className="w-8 h-8 text-neutral-400" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {creating ? 'Creating...' : 'Manual Creation'}
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                {creating
                  ? 'Setting up your content workspace...'
                  : 'Start with a blank canvas and create your content manually. Full creative control over your project.'}
              </p>
              {!creating && (
                <div className="mt-6 inline-flex items-center text-neutral-300 font-medium">
                  <span>Start Empty</span>
                  <svg
                    className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 하단 도움말 */}
        <div className="text-neutral-500 text-sm">
          <p>Your content will be created and you&apos;ll be taken to the editor automatically</p>
        </div>
      </div>
    </div>
  )
}
