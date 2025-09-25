"use client"

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type Toast = { id: string; title: string; description?: string }

type ToastContextValue = {
  push: (t: { title: string; description?: string }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [mounted, setMounted] = React.useState(false)
  const idRef = React.useRef(1)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const push = (t: { title: string; description?: string }) => {
    // use a client-only incrementing id to avoid Date.now() differences between server and client
    const id = String(idRef.current++)
    setToasts(prev => [...prev, { id, title: t.title, description: t.description }])
    // auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id))
    }, 4500)
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {mounted && createPortal(
        <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3">
          {toasts.map(t => (
            <div key={t.id} className={cn('max-w-sm rounded-md shadow-lg p-3 bg-black/90 text-white')}>
              <div className="font-semibold text-sm">{t.title}</div>
              {t.description && <div className="text-xs text-gray-200 mt-1">{t.description}</div>}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    return {
      push: (t: { title: string; description?: string }) => {
        // fallback to alert if provider missing
         
        alert(t.title + (t.description ? '\n' + t.description : ''))
      },
    }
  }
  return ctx
}

export default ToasterProvider
