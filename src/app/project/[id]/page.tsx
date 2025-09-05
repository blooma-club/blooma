'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useLayoutEffect } from 'react'

// Project index: client redirect to setup so layout renders first.
export default function ProjectIndexRedirect() {
  const router = useRouter()
  const params = useParams() as { id?: string }
  const id = params?.id

  const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect
  useIso(() => {
    if (id) router.replace(`/project/${id}/setup`)
  }, [id, router])

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
        <div className="text-neutral-300 text-sm">Redirecting to project setup...</div>
      </div>
    </div>
  )
}
