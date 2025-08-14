'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ProjectInput, Project } from '@/types'
import { X, Lock, Globe } from 'lucide-react'

interface ProjectEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (projectId: string, projectData: ProjectInput) => Promise<void>
  project: Project | null
}

export const ProjectEditModal = ({ isOpen, onClose, onSubmit, project }: ProjectEditModalProps) => {
  const [formData, setFormData] = useState<ProjectInput>({
    title: '',
    description: '',
    is_public: false
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || '',
        is_public: project.is_public
      })
    }
  }, [project])

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

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Project description must be less than 500 characters.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !project) return

    setLoading(true)
    try {
      await onSubmit(project.id, formData)
      setErrors({})
    } catch (error) {
      console.error('Project update failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // 모달 닫기 핸들러
  const handleClose = () => {
    if (loading) return
    
    // Reset form to original project data
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || '',
        is_public: project.is_public
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

  if (!isOpen || !project) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-neo w-full max-w-md mx-4 border border-black">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-black">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Project
          </h2>
          {/* 모달 닫기 버튼 */}
          <Button
            variant="default"
            onClick={handleClose}
            disabled={loading}
            className="p-2"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder="Enter your project title"
              maxLength={100}
              disabled={loading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Project Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Project Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none ${
                errors.description ? 'border-red-500' : ''
              }`}
              placeholder="Enter a brief description for your project"
              rows={3}
              maxLength={500}
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.description?.length || 0}/500
            </p>
          </div>

          {/* Visibility Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Visibility
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="is_public"
                  checked={!formData.is_public}
                  onChange={() => setFormData(prev => ({ ...prev, is_public: false }))}
                  className="text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <div className="ml-3 flex items-center">
                  <Lock className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Private</p>
                    <p className="text-sm text-gray-500">Only you can see this project.</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={() => setFormData(prev => ({ ...prev, is_public: true }))}
                  className="text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <div className="ml-3 flex items-center">
                  <Globe className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Public</p>
                    <p className="text-sm text-gray-500">Anyone with the link can see this project.</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-8">
            <Button
              type="button"
              variant="default"
              onClick={handleClose}
              disabled={loading}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading || !formData.title.trim()}
              className="w-full bg-amber-300 hover:bg-amber-400 text-black"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Update Project'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
