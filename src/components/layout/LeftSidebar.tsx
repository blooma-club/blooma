'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, FolderOpen, Layers } from 'lucide-react'

interface LeftSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  modelsCount?: number
}

export function LeftSidebar({ activeTab, onTabChange, modelsCount = 0 }: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const tabs = [
    {
      id: 'projects',
      name: 'Projects',
      icon: FolderOpen,
      description: 'Your projects',
    },
    {
      id: 'models',
      name: 'Models',
      icon: Layers,
      description: 'AI models library',
    },
  ] as const

  return (
    <div
      className={`sticky top-0 z-10 flex h-screen flex-col border-r border-gray-800 bg-[#1a1a1a] transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
        {!isCollapsed && (
          <div>
            <h2 className="text-white">Workspace</h2>
            <p className="text-xs text-gray-500">Navigation</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                  isActive
                    ? 'bg-[#2a2a2a] text-white'
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                }`}
              >
                <div className="relative z-10 flex w-full items-center gap-3">
                  <div
                    className={`relative ${tab.id === 'models' && isActive ? 'animate-pulse' : ''}`}
                  >
                    <Icon className="size-5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="text-sm">{tab.name}</div>
                      {isActive && <div className="text-xs text-gray-400">{tab.description}</div>}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
