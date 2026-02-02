'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { cn } from '@/lib/utils'

type ProfileMenuProps = {
  className?: string
}

export default function ProfileMenu({ className }: ProfileMenuProps) {
  const { user } = useSupabaseUser()

  const primaryEmail = user?.email ?? ''
  const metadata = (user?.user_metadata || {}) as Record<string, unknown>
  const displayName = useMemo(() => {
    if (typeof metadata.full_name === 'string' && metadata.full_name) return metadata.full_name
    if (typeof metadata.name === 'string' && metadata.name) return metadata.name
    return primaryEmail || 'Blooma user'
  }, [metadata.full_name, metadata.name, primaryEmail])

  if (!user) {
    return null
  }

  return (
    <Link
      href="/account"
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 hover:bg-secondary transition-colors',
        className
      )}
      aria-label="Open profile"
    >
      <span className="text-sm font-medium text-foreground">
        {displayName.charAt(0).toUpperCase()}
      </span>
    </Link>
  )
}
