'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Film, Plus, Sparkles, FileText } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'



export default function StoryboardPage() {
  const params = useParams() as any
  const projectId = params.id
  const router = useRouter()
  const { user } = useSupabase()
  
  const [creating, setCreating] = useState(false)
  const [checkingStoryboard, setCheckingStoryboard] = useState(true)

  useEffect(() => {
    const checkStoryboard = async () => {
      if (!user?.id || !projectId) {
        setCheckingStoryboard(false)
        return
      }

      try {
        // 스토리보드 존재 여부 확인
        const res = await fetch(`/api/storyboards?user_id=${user.id}&project_id=${projectId}`)
        const json = await res.json()

        if (!res.ok) throw new Error(json?.error || 'Failed to check storyboards')

        const storyboardsData = json?.data || []

        // 스토리보드가 있으면 첫 번째 스토리보드로 자동 이동
        if (storyboardsData.length > 0) {
          const firstStoryboard = storyboardsData[0]
          router.replace(`/project/${projectId}/storyboard/${firstStoryboard.id}`)
          // 리디렉션 중이므로 checkingStoryboard를 false로 설정하지 않음
          return
        }

        // 스토리보드가 없으면 Setup 페이지 표시
        setCheckingStoryboard(false)

      } catch (error) {
        console.error('Failed to check storyboards:', error)
        // 에러 발생 시 생성 옵션 표시
        setCheckingStoryboard(false)
      }
    }

    checkStoryboard()
  }, [projectId, user?.id, router])

  const handleWriteScript = () => {
    router.push(`/project/${projectId}/setup`)
  }

  const handleStartWithoutScript = async () => {
    if (!projectId) return
    if (!user?.id) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/storyboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Storyboard',
          description: JSON.stringify({ frames: [], createdAt: Date.now() }),
          project_id: projectId,
          user_id: user.id,
          is_public: false,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create storyboard')

      const newStoryboardId = json?.data?.id as string | undefined
      if (newStoryboardId) {
        // 생성 성공 시 새로 생성된 스토리보드 뷰어 페이지로 이동
        router.push(`/project/${projectId}/storyboard/${newStoryboardId}`)
      } else {
        throw new Error('No storyboard ID returned')
      }
    } catch (err) {
      console.error(err)
      alert('스토리보드 생성에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setCreating(false)
    }
  }

    // 스토리보드 확인 중
  if (checkingStoryboard) {
    return (
      <div className="w-full h-full min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
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
          <div className="text-neutral-500 text-sm mt-2">Please wait while we check your project</div>
        </div>
      </div>
    )
  }

  // 스토리보드가 없으면 생성 옵션 표시
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* 메인 아이콘 */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-neutral-900 rounded-2xl mb-6">
            <Film className="w-12 h-12 text-neutral-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Create Your First Storyboard</h1>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Choose how you'd like to start creating your storyboard. You can generate content with AI or start with a blank canvas.
          </p>
        </div>

        {/* 옵션 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          {/* AI 생성 옵션 */}
          <div className="group relative">
            <button
              onClick={handleWriteScript}
              className="w-full p-8 bg-neutral-900 border-2 border-neutral-800 hover:border-blue-500 rounded-2xl transition-all duration-300 hover:bg-neutral-800 hover:scale-105 text-left"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-xl mb-6 group-hover:bg-blue-500/20 transition-colors">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Start with AI</h3>
              <p className="text-neutral-400 leading-relaxed">
                Generate a complete storyboard using AI with templates like PAS, AIDA, or custom prompts. Perfect for quick content creation.
              </p>
              <div className="mt-6 inline-flex items-center text-blue-400 font-medium">
                <span>Get Started</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* 빈 스토리보드 옵션 */}
          <div className="group relative">
            <button
              onClick={handleStartWithoutScript}
              disabled={creating}
              className={`w-full p-8 border-2 rounded-2xl transition-all duration-300 text-left ${
                creating
                  ? 'bg-neutral-900 border-neutral-800 cursor-not-allowed opacity-50'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 hover:scale-105'
              }`}
            >
              <div className={`flex items-center justify-center w-16 h-16 rounded-xl mb-6 transition-colors ${
                creating
                  ? 'bg-neutral-800'
                  : 'bg-neutral-800 group-hover:bg-neutral-700'
              }`}>
                {creating ? (
                  <svg className="w-6 h-6 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FileText className="w-8 h-8 text-neutral-400" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {creating ? 'Creating...' : 'Blank Storyboard'}
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                {creating
                  ? 'Setting up your storyboard workspace...'
                  : 'Start with an empty storyboard and create your content manually. Full creative control over your project.'}
              </p>
              {!creating && (
                <div className="mt-6 inline-flex items-center text-neutral-300 font-medium">
                  <span>Start Empty</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 하단 도움말 */}
        <div className="text-neutral-500 text-sm">
          <p>Your storyboard will be created and you'll be taken to the editor automatically</p>
        </div>
      </div>
    </div>
  )
}
