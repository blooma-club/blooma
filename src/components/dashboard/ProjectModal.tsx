'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ProjectInput, Project } from '@/types'
import { X } from 'lucide-react'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (projectData: ProjectInput) => Promise<void>
  project?: Project | null // Edit 모드일 때만 제공
  mode: 'create' | 'edit'
}

export const ProjectModal = ({ isOpen, onClose, onSubmit, project, mode }: ProjectModalProps) => {
  const [formData, setFormData] = useState<ProjectInput>({
    title: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Initialize form data when project changes (edit mode)
  useEffect(() => {
    if (project && mode === 'edit') {
      setFormData({
        title: project.title
      })
    } else if (mode === 'create') {
      setFormData({
        title: ''
      })
    }
  }, [project, mode])

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a project title.'
    } else if (formData.title.length < 2) {
      newErrors.title = 'Project title must be at least 2 characters.'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Project title must be less than 100 characters.'
    }



    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      await onSubmit(formData)
      // 성공 시 폼 초기화 (create 모드에서만)
      if (mode === 'create') {
        setFormData({
          title: ''
        })
      }
      setErrors({})
    } catch (error) {
      console.error(`Project ${mode} failed:`, error)
    } finally {
      setLoading(false)
    }
  }

  // 모달 닫기 핸들러
  const handleClose = () => {
    if (loading) return
    
    // Reset form to original project data (edit mode) or empty (create mode)
    if (project && mode === 'edit') {
      setFormData({
        title: project.title
      })
    } else if (mode === 'create') {
      setFormData({
        title: ''
      })
    }
    setErrors({})
    onClose()
  }

  // 백드롭 클릭 핸들러
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  const isEditMode = mode === 'edit'
  const title = isEditMode ? 'Edit Project' : 'Create New Project'
  const submitText = loading 
    ? (isEditMode ? 'Updating...' : 'Creating...') 
    : (isEditMode ? 'Update Project' : 'Create Project')

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-neutral-900 rounded-lg shadow-lg w-full max-w-md mx-4 border border-neutral-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-xl font-semibold text-white">
            {title}
          </h2>
          {/* 모달 닫기 버튼 */}
          <Button
            variant="default"
            onClick={handleClose}
            disabled={loading}
            className="p-2"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-neutral-300" />
          </Button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-neutral-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border border-neutral-700 bg-neutral-900 text-white rounded-lg focus:ring-2 focus:ring-white focus:border-white ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder="Enter your project title"
              maxLength={100}
              disabled={loading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>





          {/* Action Buttons */}
          <div className="flex gap-2 mt-8">
                         <Button
               type="button"
               variant="default"
               onClick={handleClose}
               disabled={loading}
               className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white"
             >
               Cancel
             </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading || !formData.title.trim()}
              className="w-full bg-white hover:bg-neutral-200 text-black"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  {submitText}
                </>
              ) : (
                submitText
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
