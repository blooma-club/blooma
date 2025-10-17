import React from 'react'
import ProjectHeader from '@/components/project/ProjectHeader'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="h-14 flex items-center gap-6 px-6 bg-black border-b border-neutral-700">
        <ProjectHeader />
      </header>
      <main className="flex-1 min-h-0 overflow-hidden bg-black" data-project-id={resolvedParams.id}>
        <div className="w-full h-full min-h-0 p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
