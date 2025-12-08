'use client'

import Image from 'next/image'
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
import { LogOut, User, Settings } from 'lucide-react'

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

  const profileInitial = (displayName?.charAt(0) || 'B').toUpperCase()

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
            'flex h-8 w-8 items-center justify-center rounded-full p-0 text-xs text-foreground transition hover:opacity-80 focus-visible:outline-none',
            className
          )}
          aria-label="Open user menu"
        >
          {user.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt="User avatar"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">
              {profileInitial}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-sm dark:border-white/10"
        align="end"
        side="top"
        sideOffset={12}
      >
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Welcome back
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt="User avatar"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/90 text-background text-lg font-semibold">
                {profileInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{primaryEmail}</p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator className="my-3 bg-border/60 dark:bg-white/10" />
        <div className="px-2 pb-2">
          <DropdownMenuItem
            className="flex gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/70 focus:bg-muted"
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
            className="flex gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/70 focus:bg-muted"
            onClick={() => router.push('/dashboard')}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
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
