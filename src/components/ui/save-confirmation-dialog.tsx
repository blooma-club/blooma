'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Save, X } from 'lucide-react'

interface SaveConfirmationDialogProps {
  isOpen: boolean
  onSave: () => Promise<void>
  onDiscard: () => void
  onClose?: () => void
  isLoading?: boolean
}

export function SaveConfirmationDialog({
  isOpen,
  onSave,
  onDiscard,
  onClose,
  isLoading = false,
}: SaveConfirmationDialogProps) {
  const handleSave = async () => {
    await onSave()
    onDiscard()
  }

  const handleDiscard = () => {
    onDiscard()
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600" />
            Save Changes?
          </DialogTitle>
          <DialogDescription>
            You have unsaved changes to your storyboard. Would you like to save them before leaving?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save & Continue
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDiscard}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
