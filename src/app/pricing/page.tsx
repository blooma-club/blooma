'use client'

import { useState } from 'react'
import PricingCard, { type PlanOption } from '@/components/billing/pricingcard'
import ComparePlans from '@/components/billing/compare-plans'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'
import SiteFooter from '@/components/layout/footer'
import { cn } from '@/lib/utils'

const PRICING_PLANS_DATA: PlanOption[] = [
  {
    id: 'Small Brands',
    label: 'Small Brands',
    price: '$49',
    priceNote: '/ month',
    tagline: 'Perfect for emerging brands building their first lookbooks.',
    features: [],
  },
  {
    id: 'Agency',
    label: 'Agency',
    price: '$99',
    priceNote: '/ month',
    tagline: 'Scale production with weekly drops and client campaigns.',
    features: [],
  },
  {
    id: 'Studio',
    label: 'Studio',
    price: '$189',
    priceNote: '/ month',
    tagline: 'Unlimited creative power for high-volume production.',
    features: [],
  },
]

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year')

  const plans = PRICING_PLANS_DATA.map((plan) => {
    if (billingInterval === 'year') {
      const monthlyPrice = parseInt(plan.price.replace('$', ''))
      const discountedPrice = Math.round(monthlyPrice * 0.8)
      return {
        ...plan,
        price: `$${discountedPrice}`,
        priceNote: '/ month',
      }
    }
    return plan
  })

  return (
    <div className="flex flex-col min-h-screen bg-background font-geist-sans">
      <SiteNavbarSignedIn />

      <main className="flex-1 relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 right-0 h-[800px] overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px] opacity-50" />
          <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] opacity-30" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-24 pb-8 px-4 text-center max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground mb-6 leading-[1.1] sm:whitespace-nowrap">
            Weekly lookbooks, no photoshoots.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
            Generate campaign-ready fashion visuals in minutes and scale production.
          </p>
        </section>

        {/* Pricing Cards & Toggle */}
        <section className="px-4 pb-32">
          <div className="max-w-6xl mx-auto">
            {/* Billing Toggle - Aligned with Cards */}
            <div className="flex justify-start mb-8 pl-1">
              <div className="flex items-center gap-4">
                <div className="relative flex items-center bg-muted/50 p-1 rounded-full border border-border/40">
                  <button
                    onClick={() => setBillingInterval('month')}
                    className={cn(
                      "relative z-10 px-6 py-2 text-sm font-medium transition-all duration-200 rounded-full",
                      billingInterval === 'month' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingInterval('year')}
                    className={cn(
                      "relative z-10 px-6 py-2 text-sm font-medium transition-all duration-200 rounded-full",
                      billingInterval === 'year' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Yearly
                  </button>
                </div>
                {billingInterval === 'year' && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-300 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Save 20%
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
              {plans.map((plan) => (
                <div key={plan.id} className={plan.id === 'Agency' ? 'z-10' : ''}>
                  <PricingCard
                    className="w-full h-full"
                    plan={plan}
                    interval={billingInterval}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="border-t border-border/40 bg-muted/10">
          <ComparePlans />
        </section>

        {/* Trust/FAQ Section */}
        <section className="py-24 px-4 text-center">
          <h3 className="text-2xl font-medium mb-4">Still have questions?</h3>
          <p className="text-muted-foreground mb-8">
            Check out our documentation or contact our support team.
          </p>
          <a href="mailto:contact@blooma.club" className="text-sm font-medium underline underline-offset-4 hover:text-primary transition-colors">
            Contact Support
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
