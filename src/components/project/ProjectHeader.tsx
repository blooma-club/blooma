'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUserStore } from '@/store/user'
import { Edit3, Check, X, ArrowLeft } from 'lucide-react'
import type { Project } from '@/types'

export default function ProjectHeader() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const { userId, isLoaded } = useUserStore()
  const [title, setTitle] = useState<string>('New Project')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      if (!id || !userId) return
      try {
        const res = await fetch(`/api/projects?user_id=${userId}`)
        if (!res.ok) return
        const result = (await res.json().catch(() => ({}))) as {
          success?: boolean
          data?: Project[]
        }
        if (result.success && Array.isArray(result.data)) {
          const existing = result.data.find(project => project.id === id)
          if (existing && existing.title) {
            setTitle(existing.title)
            setEditValue(existing.title)
          }
        }
      } catch (error) {
        console.error('Failed to fetch project title:', error)
      }
    }

    if (isLoaded) fetchProject()
  }, [id, userId, isLoaded])

  useEffect(() => {
    if (title) {
      document.title = title
    }
  }, [title])

  const handleEditStart = () => {
    setEditValue(title)
    setIsEditing(true)
  }

  const handleEditCancel = () => {
    setEditValue(title)
    setIsEditing(false)
  }

  const handleEditSave = async () => {
    if (!editValue.trim() || editValue === title || !id || !userId) {
      handleEditCancel()
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          title: editValue.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project')
      }

      setTitle(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating project title:', error)
      alert('Failed to update project title')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  return (
    <>
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
        title="돌아가기"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </button>
      <div className="w-px h-4 bg-gray-600 mx-2" />
      {isEditing ? (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm font-semibold bg-neutral-900 text-white px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 max-w-xs transition-all"
            autoFocus
            disabled={isUpdating}
            placeholder="Enter project title"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleEditSave}
              disabled={isUpdating}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white disabled:cursor-not-allowed"
              title="Save changes"
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </button>
            <button
              onClick={handleEditCancel}
              disabled={isUpdating}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white disabled:cursor-not-allowed"
              title="Cancel editing"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <span className="text-sm font-semibold text-white truncate">{title}</span>
          <button
            onClick={handleEditStart}
            className="inline-flex items-center justify-center p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
            title="Edit project title"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
