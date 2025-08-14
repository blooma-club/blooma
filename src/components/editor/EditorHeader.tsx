'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Storyboard } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { SaveConfirmationDialog } from '@/components/ui/save-confirmation-dialog'
import { ArrowLeft, Download, Share2, Eye } from 'lucide-react'

interface EditorHeaderProps {
  storyboard: Storyboard
  isAutoSaving?: boolean
  onManualSave?: () => Promise<void>
}

export const EditorHeader = ({
  storyboard,
  isAutoSaving = false,
  onManualSave,
}: EditorHeaderProps) => {
  const router = useRouter()
  const { cards, saveCards } = useCanvasStore()
  const currentCards = cards[storyboard.id] || []
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Back handler
  const handleBack = () => {
    // Check if there are unsaved changes (including deletions)
    // We need to compare the current nodes with the last saved state
    const hasUnsavedChanges = currentCards.length > 0

    if (hasUnsavedChanges) {
      setShowSaveDialog(true)
    } else {
      router.push('/dashboard')
    }
  }

  // Save handler
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await saveCards(storyboard.id)
      if (success) {
        router.push('/dashboard')
      } else {
        console.error('Failed to save cards')
        // Could add a toast notification here
      }
    } catch (error) {
      console.error('Failed to save:', error)
      // Could add a toast notification here
    } finally {
      setIsSaving(false)
    }
  }

  // Discard handler
  const handleDiscard = () => {
    router.push('/dashboard')
  }

  // Export handler
  const handleExport = () => {
    // PNG export logic will be implemented
  }

  // Share handler
  const handleShare = () => {
    // Share functionality will be implemented
  }

  // Preview handler
  const handlePreview = () => {
    // Preview mode will be implemented
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
              <h1 className="text-lg font-semibold text-gray-900 truncate">{storyboard.title}</h1>
              <div className="text-sm text-gray-500 truncate">
                {currentCards.length} cards • Last updated:{' '}
                {storyboard.updated_at
                  ? new Date(storyboard.updated_at).toLocaleDateString('en-US')
                  : 'Never'}
                {isAutoSaving && (
                  <span className="ml-2 text-blue-600 flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    Saving...
                  </span>
                )}
              </div>
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
          {/* Save Button */}
          <Button
            variant="fadeinoutline"
            size="sm"
            onClick={onManualSave || handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
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

      <SaveConfirmationDialog
        isOpen={showSaveDialog}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onClose={() => setShowSaveDialog(false)}
        isLoading={isSaving}
      />
    </header>
  )
}
