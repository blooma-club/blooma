'use client'

import { ReactNode } from 'react'
import { LeftSidebar } from '@/components/layout/LeftSidebar'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <LeftSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="relative flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
