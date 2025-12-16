'use client'

import { useState, createContext, useContext, memo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderOpen, Box, Shirt, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

import CreditsIndicator from '@/components/ui/CreditsIndicator'
import ProfileMenu from '@/components/layout/ProfileMenu'

// --- Detect Mobile ---
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

// --- Sidebar Context ---
interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within LeftSidebar")
  return context
}

// --- Navigation Links ---
const navLinks = [
  { label: 'Studio', href: '/studio', icon: Shirt },
  { label: 'Assets', href: '/assets/models', icon: Box },
]

// --- Main Component ---
export function LeftSidebar() {
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useUser()
  const isMobile = useIsMobile()

  // Always use light mode black logo
  const logoSrc = '/blooma_logo_black.webp'

  // Desktop Sidebar (rendered only on md+)
  if (!isMobile) {
    return (
      <SidebarContext.Provider value={{ open: desktopOpen, setOpen: setDesktopOpen }}>
        <motion.aside
          className="flex flex-col h-screen sticky top-0 z-20 overflow-hidden"
          animate={{ width: desktopOpen ? 280 : 72 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onMouseEnter={() => setDesktopOpen(true)}
          onMouseLeave={() => setDesktopOpen(false)}
        >
          <div className="flex flex-col h-full p-4 min-w-[260px]">
            {/* Logo */}
            <div className="pb-6 pt-1">
              <SidebarLogo />
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 flex-1 overflow-y-auto scrollbar-none">
              {navLinks.map((link) => (
                <SidebarNavLink key={link.href} link={link} />
              ))}
            </nav>

            {/* Footer - Always mounted to prevent API refetch */}
            <div className="pt-4 min-h-[120px] relative">
              {/* Expanded Card */}
              <motion.div
                className="bg-foreground/[0.03] rounded-xl p-3 flex flex-col gap-4 absolute inset-x-0 bottom-0"
                animate={{ opacity: desktopOpen ? 1 : 0, scale: desktopOpen ? 1 : 0.95 }}
                style={{ pointerEvents: desktopOpen ? 'auto' : 'none' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProfileMenu />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate text-foreground">
                        {user?.fullName || user?.username || "User"}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {user?.primaryEmailAddress?.emailAddress || ""}
                      </span>
                    </div>
                  </div>
                </div>
                <CreditsIndicator minimal />
              </motion.div>

              {/* Collapsed Avatar */}
              <motion.div
                className="flex justify-center absolute inset-x-0 bottom-0"
                animate={{ opacity: !desktopOpen ? 1 : 0 }}
                style={{ pointerEvents: !desktopOpen ? 'auto' : 'none' }}
                transition={{ duration: 0.2 }}
              >
                <ProfileMenu />
              </motion.div>
            </div>
          </div>
        </motion.aside>
      </SidebarContext.Provider>
    )
  }

  // Mobile Sidebar
  return (
    <SidebarContext.Provider value={{ open: mobileOpen, setOpen: setMobileOpen }}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 bg-transparent sticky top-0 z-20 w-full h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-7 w-7">
            <Image src={logoSrc} alt="Blooma" fill className="object-contain" />
          </div>
          <span className="font-bold text-foreground">Blooma</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6 text-foreground" />
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 bg-background z-[100] p-6 flex flex-col"
          >
            <div className="flex justify-end mb-6">
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6 text-foreground" />
              </button>
            </div>

            <Link href="/" className="flex items-center gap-3 mb-8" onClick={() => setMobileOpen(false)}>
              <div className="relative h-8 w-8">
                <Image src={logoSrc} alt="Blooma" fill className="object-contain" />
              </div>
              <span className="font-bold text-xl text-foreground">Blooma</span>
            </Link>

            <nav className="flex flex-col gap-2 flex-1">
              {navLinks.map((link) => (
                <MobileNavLink key={link.href} link={link} onNavigate={() => setMobileOpen(false)} />
              ))}
            </nav>

            <div className="pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ProfileMenu />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.fullName || "User"}</span>
                    <span className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                  </div>
                </div>
              </div>
              <CreditsIndicator minimal />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarContext.Provider>
  )
}

// --- Sub Components ---

const SidebarLogo = memo(function SidebarLogo() {
  const { open } = useSidebar()
  return (
    <Link href="/" className="flex items-center gap-3 px-1 group">
      <div className="relative h-8 w-8 shrink-0 transition-transform group-hover:scale-105">
        <Image src="/blooma_logo_black.webp" alt="Blooma" fill className="object-contain" draggable={false} />
      </div>
      <motion.span
        animate={{ opacity: open ? 1 : 0, width: open ? 'auto' : 0 }}
        className="font-bold text-lg text-foreground tracking-tight whitespace-nowrap overflow-hidden"
      >
        Blooma
      </motion.span>
    </Link>
  )
})

const SidebarNavLink = memo(function SidebarNavLink({
  link
}: {
  link: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
}) {
  const { open } = useSidebar()
  const pathname = usePathname()
  const Icon = link.icon

  const isActive = pathname?.startsWith(link.href)

  return (
    <Link
      href={link.href}
      className={cn(
        // 기본: 높이 10 (40px) 고정, 부드러운 전환 효과
        "flex items-center h-10 rounded-lg transition-all duration-300 ease-in-out relative overflow-hidden",
        // 열림: 전체 너비 + 패딩 + 간격
        // 닫힘: 40px 너비 (정사각형) + 중앙 정렬 + 패딩 0
        open ? "w-full px-3 gap-3 justify-start" : "w-10 justify-center px-0",
        isActive
          ? "bg-foreground/10 text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="h-5 w-5 shrink-0 z-10" />

      {/* 텍스트: AnimatePresence 없이 CSS/Motion으로 부드럽게 처리 */}
      <motion.span
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          width: open ? 'auto' : 0,
          display: open ? 'block' : 'none'
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="text-sm whitespace-nowrap overflow-hidden z-10"
      >
        {link.label}
      </motion.span>
    </Link>
  )
})

const MobileNavLink = memo(function MobileNavLink({
  link,
  onNavigate
}: {
  link: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const Icon = link.icon

  const isActive = pathname?.startsWith(link.href)

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 py-3 px-4 rounded-lg transition-colors",
        isActive
          ? "bg-foreground/10 text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-base">{link.label}</span>
    </Link>
  )
})
