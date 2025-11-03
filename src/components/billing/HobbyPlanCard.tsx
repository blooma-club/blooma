'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { hobbyplanscription } from '@/lib/server/product'

type HobbyPlanCardProps = {
  className?: string
}

type SubscriptionStatusResponse = {
  hasActiveSubscription: boolean
}

export default function HobbyPlanCard({ className }: HobbyPlanCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoaded } = useUser()

  const [statusLoading, setStatusLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchStatus = async () => {
      if (!isLoaded) return
      if (!user) {
        setHasActiveSubscription(false)
        setStatusLoading(false)
        return
      }

      setStatusLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/billing/status', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.status === 401) {
          setHasActiveSubscription(false)
          return
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const message =
            (payload && typeof payload.error === 'string' && payload.error) ||
            'Unable to determine subscription status.'
          throw new Error(message)
        }

        const payload = (await response.json()) as SubscriptionStatusResponse

        if (!cancelled) {
          setHasActiveSubscription(Boolean(payload?.hasActiveSubscription))
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message =
            fetchError instanceof Error ? fetchError.message : 'Unknown error occurred.'
          setError(message)
          setHasActiveSubscription(false)
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false)
        }
      }
    }

    fetchStatus()

    return () => {
      cancelled = true
    }
  }, [isLoaded, user])

  const redirectToSignIn = useCallback(() => {
    if (typeof window === 'undefined') {
      router.push('/sign-in')
      return
    }

    const searchParams = new URLSearchParams()
    searchParams.set('redirect_url', `${window.location.origin}${pathname}`)
    router.push(`/sign-in?${searchParams.toString()}`)
  }, [pathname, router])

  const handleSubscribe = useCallback(async () => {
    if (!isLoaded || checkoutLoading) return
    if (!user) {
      redirectToSignIn()
      return
    }

    if (hasActiveSubscription) {
      return
    }

    setCheckoutLoading(true)
    setError(null)

    try {
      hobbyplanscription()
    } catch (subscribeError) {
      const message =
        subscribeError instanceof Error ? subscribeError.message : 'Unknown error occurred.'
      setError(message)
    } finally {
      setCheckoutLoading(false)
    }
  }, [checkoutLoading, hasActiveSubscription, isLoaded, redirectToSignIn, user])

  const buttonDisabled =
    statusLoading || checkoutLoading || hasActiveSubscription || !user || !isLoaded

  const buttonLabel = useMemo(() => {
    if (!isLoaded || statusLoading) return 'Loading...'
    if (!user) return 'Sign in to subscribe'
    if (hasActiveSubscription) return 'Already subscribed'
    if (checkoutLoading) return 'Redirecting...'
    return 'Subscribe'
  }, [checkoutLoading, hasActiveSubscription, isLoaded, statusLoading, user])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-2xl">Hobby Plan</CardTitle>
        <CardDescription>Perfect for getting started with Blooma.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold">$20</span>
            <span className="text-sm uppercase tracking-wide text-muted-foreground">/ month</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Includes <span className="font-medium text-foreground">1,000 credits</span> every month
            so you can focus on building without worrying about usage.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
            Direct access to core Blooma features
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
            Manage usage with granular credit tracking
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
            Cancel anytime with no long-term commitment
          </li>
        </ul>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
      <CardFooter className="pt-0">
        <Button size="lg" className="w-full" onClick={handleSubscribe} disabled={buttonDisabled}>
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
