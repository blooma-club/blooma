'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export type AuthShellProps = {
  children: ReactNode
}

export default function AuthShell({ children }: AuthShellProps) {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4 py-10 text-black sm:px-6 lg:px-8">
      <button
        onClick={() => router.push('/')}
        className="absolute left-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full hover:opacity-80"
        aria-label="Go to homepage"
      >
        <Image
          src="/blooma_logo.svg"
          alt="Blooma Logo"
          width={24}
          height={24}
          className="h-6 w-6"
        />
      </button>

      <div className="w-full max-w-6xl">
        <div className="mx-auto rounded-[32px] bg-white px-12 py-20 shadow-2xl sm:px-16 sm:py-24">
          <div className="mx-auto max-w-sm space-y-10 text-center">
            <div className="space-y-3">
              <h1 className="font-instrument-serif text-6xl tracking-tight text-black">
                Welcome to Blooma
              </h1>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
