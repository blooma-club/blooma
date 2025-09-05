'use client'

import { useEffect, useState } from 'react'
import SetupForm from '@/components/project/SetupForm'

export default function ProjectSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadParams = async () => {
      try {
        const { id: projectId } = await params
        setId(projectId)
        // 짧은 지연 후 로딩 완료
        setTimeout(() => {
          setIsLoading(false)
        }, 100)
      } catch (error) {
        console.error('Error loading params:', error)
        setIsLoading(false)
      }
    }
    
    loadParams()
  }, [params])

  if (isLoading || !id) {
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
          <div className="text-neutral-300 text-sm">Loading setup...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SetupForm id={id} />
    </div>
  )
}