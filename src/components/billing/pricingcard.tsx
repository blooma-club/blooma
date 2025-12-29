'use client'

import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PLAN_CREDIT_TOPUPS } from '@/lib/billing/plans'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export type PlanId = 'Small Brands' | 'Agency' | 'Studio'

export type PlanOption = {
  id: PlanId
  label: string
  price: string
  priceNote: string
  tagline: string
  features: string[]
}

const STANDARD_CREDIT_COST = 10  // GPT Image 1.5 Edit
const PRO_CREDIT_COST = 50       // Nano Banana Pro Edit
const CTA_LABEL = 'Choose plan'

function formatImageCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

type PricingCardProps = {
  className?: string
  plan: PlanOption
  interval?: 'month' | 'year'
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

export default function PricingCard({ className, plan, interval = 'month' }: PricingCardProps) {
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

  const includedFeatures = useMemo(() => {
    const creditBudget = PLAN_CREDIT_TOPUPS[plan.id] ?? 0
    const standardImageCount = Math.floor(creditBudget / STANDARD_CREDIT_COST)
    const proImageCount = Math.floor(creditBudget / PRO_CREDIT_COST)

    const baseFeatures = [
      `${formatImageCount(creditBudget)} credits / month`,
      `~${formatImageCount(standardImageCount)} Standard images`,
      `~${formatImageCount(proImageCount)} Pro images`,
    ]

    // Plan-specific features
    const planFeatures: Record<PlanId, string[]> = {
      'Small Brands': [
        'Standard resolution (2K)',
        'Commercial license',
      ],
      'Agency': [
        '4K resolution support',
        'Commercial license',
      ],
      'Studio': [
        '4K resolution support',
        'Commercial license',
      ],
    }

    return [...baseFeatures, ...planFeatures[plan.id], ...plan.features]
  }, [plan.features, plan.id])

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
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ plan: planId, interval }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const errorMessage =
            (payload && typeof payload.error === 'string' && payload.error) ||
            `Checkout failed with status ${response.status}`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        if (data.url && typeof data.url === 'string') {
          window.location.href = data.url
        } else {
          throw new Error('Invalid checkout URL received from server')
        }
      } catch (subscribeError) {
        const message =
          subscribeError instanceof Error ? subscribeError.message : 'Unknown error occurred.'
        setActionError(message)
        setActiveCheckoutPlan(null)
      }
    },
    [activeCheckoutPlan, hasActiveSubscription, isLoaded, redirectToSignIn, user, interval]
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

  const isHighlighted = plan.id === 'Agency'

  return (
    <Card
      className={`relative flex flex-col gap-10 rounded-3xl p-8 transition-all duration-300 ${isHighlighted
        ? 'border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-1'
        : 'border-border/60 bg-card/50 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-foreground/20'
        } ${className ?? ''}`}
    >
      {isHighlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
          Most Popular
        </div>
      )}

      <CardHeader className="space-y-4 p-0">
        <div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground font-geist-sans">
            {plan.label}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed h-10">
            {plan.tagline}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 p-0 mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${plan.id}-${plan.price}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex items-baseline gap-1"
          >
            <span className="text-5xl font-semibold tracking-tight text-foreground">{plan.price}</span>
            <span className="text-sm text-muted-foreground font-medium">{plan.priceNote}</span>
          </motion.div>
        </AnimatePresence>

        <Button
          size="lg"
          variant={isHighlighted ? 'default' : 'outline'}
          className={`h-12 w-full rounded-xl font-medium transition-all ${isHighlighted
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
            : 'border-border bg-transparent hover:bg-foreground hover:text-background'
            }`}
          onClick={() => handleSubscribe(plan.id)}
          disabled={isActionDisabled}
        >
          {getButtonLabel(plan.id, CTA_LABEL)}
        </Button>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-4 p-0 mt-auto pt-6 border-t border-border/40">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Includes
        </p>
        <ul className="space-y-2.5 text-sm text-foreground/80 w-full">
          {includedFeatures.map(feature => (
            <li key={feature} className="flex items-start gap-3 group">
              <div className={`mt-1.5 h-1.5 w-1.5 rounded-full transition-colors ${isHighlighted ? 'bg-primary' : 'bg-muted-foreground group-hover:bg-foreground'}`} />
              <span className="leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
        {actionError || subscriptionErrorMessage ? (
          <p className="text-sm text-destructive font-medium mt-2">{actionError ?? subscriptionErrorMessage}</p>
        ) : null}
      </CardFooter>
    </Card>
  )
}
