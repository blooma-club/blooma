'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LogOut, User } from 'lucide-react'

type ProfileMenuProps = {
  className?: string
}

export default function ProfileMenu({ className }: ProfileMenuProps) {
  const { user } = useUser()
  const { signOut, redirectToUserProfile } = useClerk()
  const router = useRouter()

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ''
  const displayName = useMemo(() => {
    if (user?.fullName) return user.fullName
    if (user?.firstName) return user.firstName
    return primaryEmail || 'Blooma user'
  }, [primaryEmail, user?.firstName, user?.fullName])

  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'flex h-auto items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-black transition hover:text-black/70 focus-visible:outline-none',
            className
          )}
          aria-label="Open user menu"
        >
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl border border-border/60 bg-popover/95 text-popover-foreground shadow-lg backdrop-blur-md dark:border-white/10"
        align="end"
        side="top"
        sideOffset={12}
      >
        <div className="px-4 pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Account
          </p>
          <div className="mt-3 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{primaryEmail}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-3 bg-border/50 dark:bg-white/10" />
        <div className="px-2 pb-2">
          <DropdownMenuItem
            className="flex gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/60 focus:bg-muted/60"
            onClick={() => {
              redirectToUserProfile?.().catch(() => {
                router.push('/account')
              })
            }}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50/80 focus:bg-red-50/80 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
