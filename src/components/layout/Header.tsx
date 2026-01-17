'use client'

import { useState, memo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

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

// --- Navigation Links ---
const navLinks = [
    { label: 'Studio', href: '/studio/create' },
    { label: 'Gallery', href: '/studio/generated' },
]

// --- Header Component ---
export function Header() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { user } = useSupabaseUser()
    const isMobile = useIsMobile()
    const metadata = (user?.user_metadata || {}) as Record<string, unknown>
    const displayName =
        (typeof metadata.full_name === 'string' && metadata.full_name) ||
        (typeof metadata.name === 'string' && metadata.name) ||
        user?.email ||
        'User'

    // Always use light mode black logo
    const logoSrc = '/blooma_logo_black.webp'

    // Desktop Header
    if (!isMobile) {
        return (
            <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl">
                <div className="relative flex h-12 items-center px-4 sm:px-6 lg:px-8">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative h-7 w-7 shrink-0 transition-transform group-hover:scale-105 opacity-90">
                            <Image src={logoSrc} alt="Blooma" fill className="object-contain" draggable={false} />
                        </div>
                    </Link>

                    {/* Navigation - Minimal Tabs */}
                    <nav className="hidden md:flex items-center gap-6 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        {navLinks.map((link) => (
                            <HeaderNavLink key={link.href} link={link} />
                        ))}
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-2 border-r border-border pr-4 mr-1">
                            <CreditsIndicator placement="bottom" />
                        </div>

                        <ProfileMenu />
                    </div>
                </div>
            </header>
        )
    }

    // Mobile Header
    return (
        <>
            <header className="sticky top-0 z-50 w-full h-12 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-7 w-7">
                        <Image src={logoSrc} alt="Blooma" fill className="object-contain" />
                    </div>
                </Link>
                <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
                    <Menu className="h-5 w-5 text-foreground" />
                </button>
            </header>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
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
                        </Link>

    <nav className="flex flex-col gap-1 flex-1">
                            {navLinks.map((link) => (
                                <MobileNavLink key={link.href} link={link} onNavigate={() => setMobileOpen(false)} />
                            ))}
                        </nav>

                        <div className="pt-4 border-t border-border/40 space-y-4">
                            <CreditsIndicator minimal />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ProfileMenu />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{displayName}</span>
                                        <span className="text-xs text-muted-foreground">{user?.email ?? ''}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

// --- Sub Components ---

const HeaderNavLink = memo(function HeaderNavLink({
    link
}: {
    link: { label: string; href: string }
}) {
    const pathname = usePathname()

    const isActive = pathname === link.href ||
        (link.href !== '/studio/create' && pathname?.startsWith(link.href))

    return (
        <Link
            href={link.href}
            className={cn(
                "flex items-center justify-center px-1 py-1 text-sm font-medium transition-colors border-b-2 border-transparent",
                isActive
                    ? "text-foreground border-foreground"
                    : "text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
        >
            {link.label}
        </Link>
    )
})

const MobileNavLink = memo(function MobileNavLink({
    link,
    onNavigate
}: {
    link: { label: string; href: string }
    onNavigate: () => void
}) {
    const pathname = usePathname()
    const isActive = pathname?.startsWith(link.href)

    return (
        <Link
            href={link.href}
            onClick={onNavigate}
            className={cn(
                "flex items-center py-3 px-2 text-base font-medium transition-colors border-b border-transparent",
                isActive
                    ? "text-foreground border-foreground/30"
                    : "text-muted-foreground hover:text-foreground hover:border-foreground/10"
            )}
        >
            <span>{link.label}</span>
        </Link>
    )
})
