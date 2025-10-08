'use client'

import { AuthForm } from '@/components/auth/AuthForm'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'

export default function AuthPage() {
  const { user } = useSupabase()
  const router = useRouter()

  const getURL = () => {
    let url =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/'
        : (process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
          process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
          'http://localhost:3000/')
    // Make sure to include `https://` when not localhost.
    url = url.startsWith('http') ? url : `https://${url}`
    // Make sure to include a trailing `/`.
    url = url.endsWith('/') ? url : `${url}/`
    return url
  }
  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push(getURL() + 'dashboard')
    }
  }, [user, router])

  if (user) {
    return null // Will redirect
  }

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

            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  )
}
