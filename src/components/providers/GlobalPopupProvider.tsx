'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { NotEnoughCreditModal } from '@/components/modals/NotEnoughCreditModal'
import { LoginModal } from '@/components/auth/LoginModal'
import { usePopupStore } from '@/store/popup'

/**
 * Global popup provider that manages all application popups
 * Place this component at the root of your app (e.g., in layout.tsx)
 */
export function GlobalPopupProvider() {
  const pathname = usePathname()
  const activePopup = usePopupStore((state) => state.activePopup)
  const closePopup = usePopupStore((state) => state.closePopup)
  const prevPathnameRef = useRef<string | null>(null)

  // Close popup when route changes
  useEffect(() => {
    // Only close popup if pathname actually changed (not on initial render)
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname && activePopup) {
      closePopup()
    }

    // Update the previous pathname
    prevPathnameRef.current = pathname
  }, [pathname, activePopup, closePopup])

  return (
    <>
      <NotEnoughCreditModal />
      <LoginModal />
    </>
  )
}
