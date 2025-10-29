import React from 'react'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <main className="flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }} data-project-id={resolvedParams.id}>
        <div className="w-full h-full min-h-0 p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
