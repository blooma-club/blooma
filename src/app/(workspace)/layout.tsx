import { ReactNode } from 'react'
import { Header } from '@/components/layout/Header'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col">
        <main className="flex-1 flex flex-col py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
