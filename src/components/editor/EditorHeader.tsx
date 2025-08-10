'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Storyboard } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Eye
} from 'lucide-react'

interface EditorHeaderProps {
  storyboard: Storyboard
}

export const EditorHeader = ({ storyboard }: EditorHeaderProps) => {
  const router = useRouter()
  const { cards, addCard } = useCanvasStore()
  const currentCards = cards[storyboard.id] || []
  
  // Back handler
  const handleBack = () => {
    router.push('/dashboard')
  }

  // Export handler
  const handleExport = () => {
    // PNG export logic will be implemented
    console.log('Export functionality pending')
  }

  // Share handler
  const handleShare = () => {
    // Share functionality will be implemented
    console.log('Share functionality pending')
  }

  // Preview handler
  const handlePreview = () => {
    // Preview mode will be implemented
    console.log('Preview mode pending')
  }

  // Add card handler
  // const handleAddCard = () => {
  //   addCard({
  //     title: 'Untitled Card',
  //     content: '',
  //     type: 'hook',
  //     background_color: '#ffffff',
  //     text_color: '#000000',
  //     font_size: 16,
  //     font_weight: 'normal',
  //     position_x: 100,
  //     position_y: 100,
  //     width: 320,
  //     height: 180
  //   })
  // }

  return (
    <header className="bg-white border-b-2 border-gray-900 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left - Navigation & Title + Add Card, History */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            variant="reverse"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="border-l border-gray-300 h-6 mx-2" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="truncate">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {storyboard.title}
              </h1>
              <p className="text-sm text-gray-500 truncate">
                {currentCards.length} cards • Last updated: {new Date(storyboard.updated_at).toLocaleDateString('en-US')}
              </p>
            </div>
            {/* Add Card Button removed as requested */}
          </div>
        </div>
        {/* Center - Preview Button */}
        <div className="flex-1 flex justify-center">
          <Button
            variant="fadeinoutline"
            size="sm"
            onClick={handlePreview}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
        {/* Right - Other Action buttons */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Share Button */}
          <Button
            variant="fadeinoutline"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          {/* Export Button */}
          <Button
            variant="fadeinoutline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </header>
  )
} 