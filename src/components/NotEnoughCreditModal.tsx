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
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Credits</span>
            <span className="h-px flex-1 bg-border/40" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            You&apos;re out of credits
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Your balance is empty, so new generations are paused. Upgrade to refill and keep
            creating.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Unlock monthly credits</p>
            <p className="text-xs text-muted-foreground mt-1">
              Plans recharge automatically and include priority support.
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-start">
            <Button onClick={handleUpgrade} className="h-10 rounded-xl">
              Upgrade plan
            </Button>
            <Button variant="outline" onClick={handleClose} className="h-10 rounded-xl">
              Not now
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
