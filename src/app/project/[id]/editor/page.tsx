'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import EditorPageContent from '@/components/EditorPageContent'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Storyboard, Card } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { supabase } from '@/lib/supabase'
import '@xyflow/react/dist/style.css'

export default function ProjectEditorPage() {
  const params = useParams()
  const projectId = params.id as string
  const { user } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setStoryboard = useCanvasStore(s => s.setStoryboard)
  const setCards = useCanvasStore(s => s.setCards)

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !user?.id) return

      try {
        setLoading(true)
        setError(null)

        // Fetch storyboards for this project
        const { data: storyboards, error: storyboardsError } = await supabase
          .from('storyboards')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (storyboardsError) {
          throw new Error(`Failed to fetch storyboards: ${storyboardsError.message}`)
        }

        if (!storyboards || storyboards.length === 0) {
          // Create a default storyboard if none exists
          const { data: newStoryboard, error: createError } = await supabase
            .from('storyboards')
            .insert({
              user_id: user.id,
              project_id: projectId,
              title: 'Main Storyboard',
              description: 'Default storyboard for this project',
              is_public: false,
            })
            .select()
            .single()

          if (createError) {
            throw new Error(`Failed to create storyboard: ${createError.message}`)
          }

          setStoryboard(newStoryboard)
          setCards(newStoryboard.id, [])
          return
        }

        const storyboard = storyboards[0]

        // Fetch cards for this storyboard
        const { data: cards, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('storyboard_id', storyboard.id)
          .eq('user_id', user.id)
          .order('order_index', { ascending: true })

        if (cardsError) {
          throw new Error(`Failed to fetch cards: ${cardsError.message}`)
        }

        // Set the storyboard and cards in the store
        setStoryboard(storyboard)
        setCards(storyboard.id, cards || [])
      } catch (err) {
        console.error('Error fetching project data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load project data')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [projectId, user?.id, setStoryboard, setCards])

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <EditorPageContent />
    </ReactFlowProvider>
  )
}
