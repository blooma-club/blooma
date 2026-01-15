'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function AssetsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/assets/models', label: 'Models' },
    { href: '/assets/locations', label: 'Locations' },
    { href: '/assets/camera-settings', label: 'Camera settings' },
  ] as const

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-background">
      <div className="w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
              Assets
            </h2>
            <nav className="flex items-center gap-1">
              {tabs.map(tab => {
                const isActive =
                  pathname === tab.href || pathname.startsWith(`${tab.href}/`)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                      'border border-transparent',
                      isActive
                        ? 'bg-foreground text-background dark:bg-white dark:text-black shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border/40'
                    )}
                  >
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </div>
  )
}


