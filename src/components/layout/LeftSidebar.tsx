'use client'

import { useState } from 'react'
import { FolderOpen, Layers, PanelLeftClose, PanelLeftOpen, Box, Shirt } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface LeftSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  modelsCount?: number
}

export function LeftSidebar({ activeTab, onTabChange, modelsCount = 0 }: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()

  const tabs = [
    {
      id: 'projects',
      name: 'Projects',
      icon: FolderOpen,
      shortcut: 'P'
    },
    {
      id: 'assets',
      name: 'Assets',
      icon: Box,
      shortcut: 'A',
      badge: modelsCount > 0 ? modelsCount : undefined
    },
    {
      id: 'fitting-room',
      name: 'Fitting Room',
      icon: Shirt,
      shortcut: 'F'
    },
  ] as const

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 flex h-screen flex-col bg-background/60 backdrop-blur-xl border-r border-border/40 transition-all duration-500 ease-out will-change-[width]",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Header Area */}
      <div className="flex h-16 items-center px-4 border-b border-border/40">
        <div className={cn(
          "flex items-center flex-1 overflow-hidden transition-all duration-500",
          isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-md bg-foreground/10 dark:bg-white/10 flex items-center justify-center ring-1 ring-foreground/20 dark:ring-white/20">
              <div className="h-2.5 w-2.5 rounded-sm bg-foreground dark:bg-white shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground/90">Workspace</span>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 hover:bg-muted/50 text-muted-foreground hover:text-foreground",
            isCollapsed && "mx-auto"
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          ) : (
            <PanelLeftClose className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none">
        <div className="mb-4 px-2">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 transition-opacity duration-300",
            isCollapsed ? "opacity-0 hidden" : "opacity-100"
          )}>
            Menu
          </span>
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative flex w-full items-center rounded-xl transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 dark:focus-visible:ring-white/20",
                isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2.5 gap-3",
                isActive
                  ? "bg-foreground/10 dark:bg-white/10 text-foreground dark:text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
              title={isCollapsed ? tab.name : undefined}
            >
              {isActive && (
                <div className={cn(
                  "absolute left-0 h-full w-1 rounded-r-full bg-foreground dark:bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)] dark:shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all duration-300",
                  isCollapsed ? "h-8 top-1/2 -translate-y-1/2 left-0.5 w-0.5" : "opacity-0"
                )} />
              )}

              <Icon className={cn(
                "shrink-0 transition-all duration-300",
                isActive ? "text-foreground dark:text-white" : "opacity-70 group-hover:opacity-100",
                isCollapsed ? "h-5 w-5" : "h-4.5 w-4.5"
              )} strokeWidth={isActive ? 2 : 1.5} />

              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                  <span className={cn(
                    "text-sm font-medium transition-all duration-300 truncate",
                    isActive ? "translate-x-0.5" : "group-hover:translate-x-0.5"
                  )}>
                    {tab.name}
                  </span>
                  {/* Keyboard shortcut or badge placeholder */}
                  {'badge' in tab && tab.badge ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground/10 dark:bg-white/10 px-1.5 text-[10px] font-bold text-foreground dark:text-white">
                      {tab.badge}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      {tab.shortcut}
                    </span>
                  )}
                </div>
              )}

              {/* Hover Glow Effect */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-foreground/0 via-foreground/5 to-foreground/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Area (User Profile or Settings placeholder) */}
      <div className="p-3 border-t border-border/40">
        <div className={cn(
          "rounded-xl bg-gradient-to-br from-muted/50 to-muted/10 border border-foreground/5 dark:border-white/5 p-3 transition-all duration-500 group relative overflow-hidden",
          isCollapsed ? "aspect-square p-0 flex items-center justify-center bg-transparent border-0" : ""
        )}>
          {!isCollapsed ? (
            <div className="relative z-10">
              <h3 className="text-xs font-semibold text-foreground/80 mb-1">Blooma Pro</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
                Upgrade for unlimited AI generations and team features.
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full py-1.5 rounded-lg bg-foreground text-background dark:bg-white dark:text-black text-[10px] font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                Upgrade Plan
              </button>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-foreground dark:bg-white shadow-lg shadow-black/20 dark:shadow-white/20 flex items-center justify-center text-background dark:text-black text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform">
              B
            </div>
          )}

          {/* Background Decoration */}
          {!isCollapsed && (
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-foreground/5 dark:bg-white/5 blur-2xl rounded-full pointer-events-none" />
          )}
        </div>
      </div>
    </aside>
  )
}
