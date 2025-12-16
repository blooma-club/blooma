'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserCredits } from '@/hooks/useUserCredits'
import { cn } from '@/lib/utils'

type CreditsIndicatorProps = {
  className?: string
  minimal?: boolean
  placement?: 'top' | 'bottom'
}

export default function CreditsIndicator({ className, minimal = false, placement = 'top' }: CreditsIndicatorProps) {
  const { total, remaining, percentage, isLoading, isAvailable, subscriptionTier } = useUserCredits()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!isAvailable) {
    return null
  }

  const displayPercentage = isLoading ? 0 : percentage
  const displayRemaining = isLoading ? '--' : Math.max(remaining, 0).toLocaleString()
  const displayTotal = isLoading ? '--' : total > 0 ? total.toLocaleString() : '0'

  // Minimal Mode: Inline progress bar without icons/popover logic (or simplified)
  if (minimal) {
    return (
      <div className={cn("w-full space-y-2", className)}>
        <div className="flex items-center justify-between text-[11px] font-medium px-0.5">
          <span className="text-muted-foreground/80">Credits</span>
          <span className="text-foreground">{displayRemaining} <span className="text-muted-foreground/50">/ {displayTotal}</span></span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/30 dark:bg-white/10">
          <div
            className="h-full bg-foreground/80 transition-all duration-500 ease-out"
            style={{ width: `${displayPercentage}%` }}
          />
        </div>
      </div>
    )
  }

  // Default Popover Mode
  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-9 px-2 text-sm font-medium transition-colors hover:bg-muted/50 text-black hover:text-black/70",
          open && "bg-muted/50 text-foreground"
        )}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="text-sm">{displayRemaining}</span>
      </Button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-50 w-72 rounded-xl border bg-popover/95 backdrop-blur-sm p-4 text-popover-foreground shadow-xl ring-1 ring-border/5 animate-in fade-in-0 zoom-in-95",
            placement === 'top' ? "bottom-full mb-2" : "top-full mt-2"
          )}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Available Credits</span>
              <Zap className="h-4 w-4 text-primary/70" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{displayRemaining}</span>
                <span className="text-sm text-muted-foreground">/ {displayTotal}</span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50 mt-2">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Monthly refresh
              </p>
            </div>

            <div className="pt-2">
              {(!subscriptionTier || subscriptionTier === 'free') ? (
                <Button variant="default" size="sm" asChild className="w-full h-9 font-medium shadow-none bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 text-white">
                  <Link href="/pricing">
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Upgrade
                  </Link>
                </Button>
              ) : (
                <Button variant="default" size="sm" asChild className="w-full h-9 font-medium shadow-none">
                  <Link href="/customerportal">
                    Manage
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
