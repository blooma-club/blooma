'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
  const displayRemaining = isLoading ? '--' : Math.max(remaining, 0).toString()
  const displayTotal = isLoading ? '--' : total > 0 ? total.toString() : '0'

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs sm:text-sm"
        onClick={() => setOpen(prev => !prev)}
      >
        Credits {displayPercentage}
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-lg border shadow-lg"
          style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="space-y-3 p-4">
            <div>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {displayRemaining}/{displayTotal} credits
              </p>
            </div>

            <Button variant="default" size="sm" asChild className="w-full">
              <Link href="/customerportal" target="_blank">
                Add more credits
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
