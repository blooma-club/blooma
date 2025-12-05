'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function FittingRoomLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    const tabs = [
        { href: '/fitting-room/create', label: 'Create' },
        { href: '/fitting-room/generated', label: 'Gallery' },
    ] as const

    const isRootPath = pathname === '/fitting-room'

    return (
        <div className="relative w-full min-h-screen flex flex-col bg-background">
            <div className="w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
                            Fitting Room
                        </h2>
                        <nav className="flex items-center gap-1">
                            {tabs.map(tab => {
                                const isActive =
                                    pathname === tab.href ||
                                    pathname.startsWith(`${tab.href}/`) ||
                                    (isRootPath && tab.href === '/fitting-room/create')
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
            <div className="flex-1">{children}</div>
        </div>
    )
}
