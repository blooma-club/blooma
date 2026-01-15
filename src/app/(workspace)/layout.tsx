import { ReactNode } from 'react'
import { Header } from '@/components/layout/Header'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
