import React from 'react'
import ProjectHeader from '@/components/project/ProjectHeader'
import ThemeToggle from '@/components/ui/theme-toggle'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return (
    <div className="min-h-screen flex flex-col text-white" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <header className="h-14 flex items-center px-6 border-b border-neutral-700" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="flex items-center flex-1">
          <ProjectHeader />
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }} data-project-id={resolvedParams.id}>
        <div className="w-full h-full min-h-0 p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
