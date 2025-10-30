'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { loadDraftFromLocal } from '@/lib/localStorage'

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

    const savedDraft = loadDraftFromLocal(id)
    if (savedDraft) {
      // 스크립트 편집을 진행 중이라면 셋업 단계로 이동
      router.replace(`/project/${id}/setup`)
      return
    }

    // sbId가 없고 드래프트도 없으면 생성 옵션 페이지로 이동
    router.replace(`/project/${id}/storyboard/start`)
  }, [id, isLoaded, router])

  // 라우터 리다이렉트만 수행하고 별도 로딩 UI는 표시하지 않음 (이중 로딩 방지)
  return null
}
