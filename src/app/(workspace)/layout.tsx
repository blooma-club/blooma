'use client'

import { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const isAssetsRoute =
    pathname?.startsWith('/assets') ||
    pathname?.startsWith('/models')
  
  const isStudioRoute = pathname?.startsWith('/studio')

  const activeTab = isStudioRoute ? 'studio' : isAssetsRoute ? 'assets' : 'projects'

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return

    if (tab === 'assets') {
      router.push('/assets/models')
    } else if (tab === 'studio') {
      router.push('/studio')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <LeftSidebar activeTab={activeTab} onTabChange={handleTabChange} modelsCount={0} />
      <div className="flex-1 flex flex-col">
        <SiteNavbarSignedIn />
        <div className="relative flex-1">{children}</div>
      </div>
    </div>
  )
}
