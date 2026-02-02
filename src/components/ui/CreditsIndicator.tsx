'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useUserCredits } from '@/hooks/useUserCredits'
import { cn } from '@/lib/utils'

type CreditsIndicatorProps = {
  className?: string
  minimal?: boolean
  placement?: 'top' | 'bottom'
}

export default function CreditsIndicator({
  className,
  minimal = false,
  placement = 'top',
}: CreditsIndicatorProps) {
  const { total, remaining, percentage, isLoading, isAvailable, subscriptionTier } =
    useUserCredits()
  const [open, setOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fix hydration mismatch: only render after client mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

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

  // Return null during SSR and initial client render to ensure hydration match
  if (!isMounted || !isAvailable) {
    return null
  }

  const displayPercentage = isLoading ? 0 : percentage
  const displayRemaining = isLoading ? '--' : Math.max(remaining, 0).toLocaleString()
  const displayTotal = isLoading ? '--' : total > 0 ? total.toLocaleString() : '0'

  // Minimal Mode: Inline progress bar without icons/popover logic (or simplified)
  if (minimal) {
    return (
      <div className={cn('w-full space-y-2', className)}>
        <div className="flex items-center justify-between text-[11px] font-medium px-0.5">
          <span className="text-muted-foreground/80">Credits</span>
          <span className="text-foreground">
            {displayRemaining} <span className="text-muted-foreground/50">/ {displayTotal}</span>
          </span>
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
      <button
        type="button"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all rounded-full',
          'bg-secondary/50 hover:bg-secondary text-foreground',
          open && 'bg-secondary'
        )}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span>{displayRemaining}</span>
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 w-60 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl p-4 text-popover-foreground shadow-lg ring-1 ring-border/5 animate-in fade-in-0 zoom-in-95',
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
          onClick={e => e.stopPropagation()}
        >
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Credits</span>
              <span className="text-[11px] font-medium tracking-normal text-muted-foreground/80">
                {displayPercentage}%
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {displayRemaining}
              </span>
              <span className="text-xs text-muted-foreground">/ {displayTotal}</span>
            </div>

            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary/40">
              <div
                className="h-full bg-foreground/80 transition-all duration-500 ease-out"
                style={{ width: `${displayPercentage}%` }}
              />
            </div>

            <div className="mt-4">
              {!subscriptionTier || subscriptionTier === 'free' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                >
                  <Link href="/pricing">Upgrade</Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                >
                  <Link href="/customerportal">Manage</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
