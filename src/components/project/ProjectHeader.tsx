"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUserStore } from '@/store/user'

export default function ProjectHeader() {
  const params = useParams()
  const id = (params as any)?.id
  const { userId, isLoaded } = useUserStore()
  const [title, setTitle] = useState<string>('Storyboard Setup')

  useEffect(() => {
    const fetchProject = async () => {
      if (!id || !userId) return
      try {
        const res = await fetch(`/api/projects?user_id=${userId}`)
        if (!res.ok) return
        const result = await res.json()
        if (result.success && result.data) {
          const existing = result.data.find((p: any) => p.id === id)
          if (existing && existing.title) setTitle(existing.title)
        }
      } catch (e) {
        // ignore
      }
    }

    if (isLoaded) fetchProject()
  }, [id, userId, isLoaded])

  useEffect(() => {
    if (title) {
      try {
        document.title = title
      } catch (e) {}
    }
  }, [title])

  return (
    <>
      <h1 className="text-sm font-medium text-gray-300">Project</h1>
      <div className="w-px h-4 bg-gray-600" />
      <span className="text-sm font-semibold text-white truncate">{title}</span>
    </>
  )
}
