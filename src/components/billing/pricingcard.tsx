'use client'

import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
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
import { handleSubscription } from '@/lib/server/product'

export type PlanId = 'blooma-1000' | 'blooma-3000' | 'blooma-5000'

export type PlanOption = {
  id: PlanId
  label: string
  price: string
  priceNote: string
  tagline: string
  ctaLabel?: string
  features: string[]
}

type HobbyPlanCardProps = {
  className?: string
  plan: PlanOption
}

type SubscriptionStatusResponse = {
  hasActiveSubscription: boolean
}

async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const response = await fetch('/api/billing/status', {
    method: 'GET',
    credentials: 'include',
  })

  if (response.status === 401) {
    return { hasActiveSubscription: false }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      (payload && typeof payload.error === 'string' && payload.error) ||
      'Unable to determine subscription status.'
    throw new Error(message)
  }

  return response.json()
}

export default function PricingCard({ className, plan }: HobbyPlanCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoaded } = useUser()

  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState<PlanId | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const shouldFetchStatus = isLoaded && Boolean(user)
  const {
    data: subscriptionStatus,
    error: subscriptionError,
    isLoading: subscriptionLoading,
    isValidating: subscriptionValidating,
  } = useSWR<SubscriptionStatusResponse>(
    shouldFetchStatus ? '/api/billing/status' : null,
    fetchSubscriptionStatus,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60_000,
    }
  )

  const hasActiveSubscription = Boolean(subscriptionStatus?.hasActiveSubscription)
  const statusLoading = shouldFetchStatus && (subscriptionLoading || subscriptionValidating)

  const subscriptionErrorMessage = useMemo(() => {
    if (!subscriptionError) return null
    return subscriptionError instanceof Error
      ? subscriptionError.message
      : 'Unable to determine subscription status.'
  }, [subscriptionError])

  const redirectToSignIn = useCallback(() => {
    if (typeof window === 'undefined') {
      router.push('/sign-in')
      return
    }

    const searchParams = new URLSearchParams()
    searchParams.set('redirect_url', `${window.location.origin}${pathname}`)
    router.push(`/sign-in?${searchParams.toString()}`)
  }, [pathname, router])

  const handleSubscribe = useCallback(
    async (planId: PlanId) => {
      if (!isLoaded || activeCheckoutPlan) return
      if (!user) {
        redirectToSignIn()
        return
      }

      if (hasActiveSubscription) {
        return
      }

      setActiveCheckoutPlan(planId)
      setActionError(null)

      try {
        await handleSubscription(planId)
      } catch (subscribeError) {
        const message =
          subscribeError instanceof Error ? subscribeError.message : 'Unknown error occurred.'
        setActionError(message)
      } finally {
        setActiveCheckoutPlan(null)
      }
    },
    [activeCheckoutPlan, hasActiveSubscription, isLoaded, redirectToSignIn, user]
  )

  const isLoadingState = !isLoaded || statusLoading

  const getButtonLabel = useCallback(
    (planId: PlanId, fallbackLabel: string) => {
      if (isLoadingState) return 'Loading...'
      if (!user) return 'Sign in to subscribe'
      if (hasActiveSubscription) return 'Already subscribed'
      if (activeCheckoutPlan === planId) return 'Redirecting...'
      if (activeCheckoutPlan) return 'Please wait...'
      return fallbackLabel
    },
    [activeCheckoutPlan, hasActiveSubscription, isLoadingState, user]
  )

  const isActionDisabled =
    isLoadingState || hasActiveSubscription || !user || Boolean(activeCheckoutPlan)

  return (
    <Card
      className={`relative flex flex-col gap-8 rounded-[28px] border border-border/60 bg-card/95 p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] transition hover:shadow-[0_22px_48px_-20px_rgba(15,23,42,0.45)] ${className ?? ''}`}
    >
      <CardHeader className="space-y-3 p-0">
        <CardTitle className="text-2xl font-semibold text-foreground">{plan.label}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {plan.tagline}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div>
          <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
          <p className="mt-1 text-sm text-muted-foreground">{plan.priceNote}</p>
        </div>
        <Button
          size="lg"
          className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
          onClick={() => handleSubscribe(plan.id)}
          disabled={isActionDisabled}
        >
          {getButtonLabel(plan.id, plan.ctaLabel ?? 'Purchase credits')}
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 p-0 pt-4">
        <p className="text-sm font-medium text-foreground">Included</p>
        <ul className="space-y-2 text-sm text-foreground">
          {plan.features.map(feature => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-[2px] text-base leading-none text-foreground">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {actionError || subscriptionErrorMessage ? (
          <p className="text-sm text-destructive">{actionError ?? subscriptionErrorMessage}</p>
        ) : null}
        {!user ? (
          <span className="text-xs text-muted-foreground">Sign in to purchase and manage credits.</span>
        ) : hasActiveSubscription ? (
          <span className="text-xs text-muted-foreground">
            You already have an active subscription. Manage it from your billing dashboard.
          </span>
        ) : null}
      </CardFooter>
    </Card>
  )
}
