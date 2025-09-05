'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Book, Film, ArrowRight, Plus } from 'lucide-react'
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
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-8 w-8 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
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
          <div className="text-neutral-300 text-sm">Loading storyboard...</div>
        </div>
      </div>
    )
  }

  // 스토리보드가 없으면 생성 옵션 표시
  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="mb-8">
        <Film className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Storyboard</h1>
        <p className="text-lg text-gray-600 mb-8">
          Start by writing a script or create an empty storyboard to begin
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleWriteScript}
          className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg font-medium"
        >
          <Book className="w-5 h-5" />
          Write Script
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={handleStartWithoutScript}
          disabled={creating}
          className={`inline-flex items-center gap-3 px-6 py-4 rounded-lg transition-colors text-lg font-medium border-2 ${
            creating
              ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
          aria-label="Start without Script"
        >
          <Plus className="w-5 h-5" />
          {creating ? 'Creating...' : 'Start Empty'}
        </button>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        Your storyboard will be created and you'll be taken to the editor
      </div>
    </div>
  )
}
