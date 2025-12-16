'use client'

import type { ReactNode } from 'react'

export default function FittingRoomLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex-1 flex flex-col h-full">
            {children}
        </div>
    )
}
