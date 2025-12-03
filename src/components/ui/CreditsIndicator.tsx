'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserCredits } from '@/hooks/useUserCredits'
import { cn } from '@/lib/utils'

type CreditsIndicatorProps = {
  className?: string
}

export default function CreditsIndicator({ className }: CreditsIndicatorProps) {
  const { total, remaining, percentage, isLoading, isAvailable } = useUserCredits()
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

  const displayPercentage = isLoading ? '--' : `${percentage}%`
  const displayRemaining = isLoading ? '--' : Math.max(remaining, 0).toLocaleString()
  const displayTotal = isLoading ? '--' : total > 0 ? total.toLocaleString() : '0'

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-9 px-3 text-sm font-medium transition-colors hover:bg-muted/50",
          open && "bg-muted/50"
        )}
        onClick={() => setOpen(prev => !prev)}
      >
        <Sparkles className="mr-2 h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Credits</span>
        <span className="ml-1.5 text-muted-foreground">{displayRemaining}</span>
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border bg-popover/95 backdrop-blur-sm p-4 text-popover-foreground shadow-xl ring-1 ring-border/5 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col gap-4">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Available Credits</span>
              <Zap className="h-4 w-4 text-primary/70" />
            </div>

            {/* Main Credits Display */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{displayRemaining}</span>
                <span className="text-sm text-muted-foreground">/ {displayTotal}</span>
              </div>

              {/* Custom Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50 mt-2">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Refreshes monthly based on your plan
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <Button variant="default" size="sm" asChild className="w-full h-9 font-medium shadow-none">
                <Link href="/customerportal">
                  Manage Subscription
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
