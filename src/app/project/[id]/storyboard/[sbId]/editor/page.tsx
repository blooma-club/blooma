"use client"

import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

/**
 * 마이그레이션 리다이렉트 페이지
 * Editor 기능이 메인 스토리보드 페이지로 통합됨
 * 이 페이지는 기존 URL을 새로운 구조로 리다이렉트함
 */
export default function EditorRedirectPage() {
  const params = useParams() as any
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const projectId = params.id
  const sbId = params.sbId
  
  useEffect(() => {
    // 기존 URL의 frame 파라미터 보존
    const frameParam = searchParams.get('frame')
    const redirectUrl = `/project/${projectId}/storyboard/${sbId}${frameParam ? `?frame=${frameParam}` : ''}`
    
    // 새로운 스토리보드 페이지로 리다이렉트
    router.replace(redirectUrl)
  }, [projectId, sbId, searchParams, router])
  
  return (
    <div className="w-full h-screen flex items-center justify-center">
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
        <div className="text-neutral-300 text-sm">새로운 에디터로 이동 중...</div>
      </div>
    </div>
  )
}