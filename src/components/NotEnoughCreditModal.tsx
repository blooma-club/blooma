'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePopupStore } from '@/store/popup'

export function NotEnoughCreditModal() {
  const router = useRouter()
  const { activePopup, closePopup } = usePopupStore()
  const isOpen = activePopup === 'notEnoughCredit'

  const handleUpgrade = useCallback(() => {
    closePopup()
    router.push('/pricing')
  }, [closePopup, router])

  const handleClose = useCallback(() => {
    closePopup()
  }, [closePopup])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Not enough credits</DialogTitle>
          <DialogDescription>
            You&apos;ve used all your available credits. Upgrade your plan to get more credits.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={handleUpgrade}>Upgrade Plan</Button>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
