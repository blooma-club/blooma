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

export default function CreditsIndicator({ className, minimal = false, placement = 'top' }: CreditsIndicatorProps) {
  const { total, remaining, percentage, isLoading, isAvailable, subscriptionTier } = useUserCredits()
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
            "absolute right-0 z-50 w-72 rounded-2xl border border-border/40 bg-popover/95 backdrop-blur-xl p-5 text-popover-foreground shadow-2xl ring-1 ring-border/5 animate-in fade-in-0 zoom-in-95",
            placement === 'top' ? "bottom-full mb-2" : "top-full mt-2"
          )}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Credits</span>
              <span className="h-px flex-1 bg-border/40" />
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <span className="text-3xl font-semibold tracking-tight">{displayRemaining}</span>
                  <p className="text-xs text-muted-foreground">available of {displayTotal}</p>
                </div>
                <span className="text-xs text-muted-foreground">{displayPercentage}%</span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                <div
                  className="h-full bg-foreground/80 transition-all duration-500 ease-out"
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>

              <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                Credits refresh monthly with your plan.
              </div>
            </div>

            <div className="pt-2">
              {(!subscriptionTier || subscriptionTier === 'free') ? (
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="w-full h-9 rounded-xl font-medium shadow-none"
                >
                  <Link href="/pricing">
                    Upgrade
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full h-9 rounded-xl font-medium shadow-none"
                >
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
