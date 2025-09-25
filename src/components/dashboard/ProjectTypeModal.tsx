'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X, FileText, Wand2 } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'

interface ProjectTypeModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ProjectTypeModal = ({ isOpen, onClose }: ProjectTypeModalProps) => {
  const router = useRouter()
  const { user } = useSupabase()
  const [creatingProject, setCreatingProject] = useState(false)

  const handleBlankStoryboard = async () => {
    if (!user?.id) {
      alert('Please sign in to create a project')
      return
    }

    setCreatingProject(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: 'New Storyboard Project',
          description: 'A blank storyboard project',
          user_id: user.id,
          is_public: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating project:', error)
        alert('Failed to create project')
        return
      }

      onClose()
      // Redirect to setup page for blank storyboard
      router.push(`/project/${data.id}/setup`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  const handleGuidedStoryboard = () => {
    onClose()
    // Redirect to wizard page
    router.push('/project/wizard')
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-neutral-900 rounded-lg shadow-lg w-full max-w-2xl mx-4 border border-neutral-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-semibold text-white">Create New Project</h2>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={creatingProject}
            className="p-2 text-neutral-300 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-neutral-300 mb-8 text-center">
            Choose how you'd like to create your storyboard project
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Blank Storyboard Option */}
            <div
              className="border border-neutral-700 rounded-lg p-6 hover:border-neutral-600 transition-colors cursor-pointer group"
              onClick={handleBlankStoryboard}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-neutral-700 transition-colors">
                  <FileText className="h-8 w-8 text-neutral-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Blank Storyboard</h3>
                <p className="text-neutral-400 mb-4">
                  Start with a clean slate and build your storyboard from scratch
                </p>
                <Button
                  variant="outline"
                  className="w-full border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                  disabled={creatingProject}
                >
                  {creatingProject ? 'Creating...' : 'Create Blank Project'}
                </Button>
              </div>
            </div>

            {/* Guided Storyboard Option */}
            <div
              className="border border-neutral-700 rounded-lg p-6 hover:border-neutral-600 transition-colors cursor-pointer group"
              onClick={handleGuidedStoryboard}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-neutral-700 transition-colors">
                  <Wand2 className="h-8 w-8 text-neutral-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Storyboard with Guide</h3>
                <p className="text-neutral-400 mb-4">
                  Answer a few questions and let our AI guide you through the creation process
                </p>
                <Button
                  variant="outline"
                  className="w-full border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                >
                  Start Guided Creation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
