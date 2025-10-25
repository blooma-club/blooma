'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { loadDraftFromLocal, loadLastStoryboardId } from '@/lib/localStorage'

// Project index: determine default destination based on existing storyboard data.
export default function ProjectIndexRedirect() {
  const router = useRouter()
  const params = useParams() as { id?: string }
  const id = params?.id
  const { isLoaded } = useAuth()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (!id || hasRedirectedRef.current) return
    if (!isLoaded) return

    hasRedirectedRef.current = true

    // storyboard ID가 이미 생성되었는지 확인
    const lastSbId = loadLastStoryboardId(id)
    if (lastSbId) {
      // sbId가 있으면 편집기로 직접 이동
      router.replace(`/project/${id}/storyboard`)
      return
    }

    const savedDraft = loadDraftFromLocal(id)
    if (savedDraft) {
      // 스크립트 편집을 진행 중이라면 셋업 단계로 이동
      router.replace(`/project/${id}/setup`)
      return
    }

    // sbId가 없고 드래프트도 없으면 생성 옵션 페이지로 이동
    router.replace(`/project/${id}/storyboard/start`)
  }, [id, isLoaded, router])

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-neutral-400"
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
        <div className="text-neutral-300 text-sm">Preparing your project...</div>
      </div>
    </div>
  )
}
