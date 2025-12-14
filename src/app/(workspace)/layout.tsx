'use client'

import { ReactNode } from 'react'
import { LeftSidebar } from '@/components/layout/LeftSidebar'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-100">
      <LeftSidebar />
      <div className="flex-1 flex flex-col min-w-0 p-2 md:p-2 transition-all duration-300">
        <main className="relative flex-1 flex flex-col bg-white rounded-3xl shadow-sm overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
