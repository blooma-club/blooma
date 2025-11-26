import HobbyPlanCard, { type PlanOption, type PlanId } from '@/components/billing/pricingcard'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'
import SiteFooter from '@/components/layout/footer'
import { PLAN_CREDIT_TOPUPS } from '@/lib/billing/plans'

const PRICING_PLANS: PlanOption[] = [
  {
    id: 'Starter',
    label: 'Starter',
    price: '$19',
    priceNote: 'Billed monthly',
    tagline: 'Perfect for individuals exploring Blooma regularly.',
    ctaLabel: 'Choose Starter',
    features: [
      '2,200 credits deposited every month',
      'Best-in-class image and storyboard renders',
      'Commercial usage coverage included',
      'Cancel or switch plans anytime',
    ],
  },
  {
    id: 'Pro',
    label: 'Pro',
    price: '$49',
    priceNote: 'Billed monthly',
    tagline: 'Built for power users and small teams.',
    ctaLabel: 'Choose Pro',
    features: [
      '6,000 credits deposited every month',
      'High-priority rendering in peak hours',
      'Advanced collaboration tools',
      'Commercial usage coverage included',
    ],
  },
  {
    id: 'Studio',
    label: 'Studio',
    price: '$99',
    priceNote: 'Billed monthly',
    tagline: 'For studios and production teams with heavy usage.',
    ctaLabel: 'Choose Studio',
    features: [
      '13,000 credits deposited every month',
      'Enterprise-grade support response times',
      'Fine-grained user management',
      'Commercial usage coverage included',
    ],
  },
]

type UsageRange = {
  min: number
  max: number
}

const IMAGE_MIN_COST = 50 // Nano Banana Pro (highest cost per image)
const IMAGE_MAX_COST = 10 // Seedream (lowest cost per image)
const VIDEO_MIN_COST = 120 // Kling Pro
const VIDEO_MAX_COST = 70 // Kling Standard

const IMAGE_USAGE_BY_PLAN: Record<PlanId, UsageRange> = {
  'Starter': {
    min: Math.floor(PLAN_CREDIT_TOPUPS['Starter'] / IMAGE_MIN_COST),
    max: Math.floor(PLAN_CREDIT_TOPUPS['Starter'] / IMAGE_MAX_COST),
  },
  'Pro': {
    min: Math.floor(PLAN_CREDIT_TOPUPS['Pro'] / IMAGE_MIN_COST),
    max: Math.floor(PLAN_CREDIT_TOPUPS['Pro'] / IMAGE_MAX_COST),
  },
  'Studio': {
    min: Math.floor(PLAN_CREDIT_TOPUPS['Studio'] / IMAGE_MIN_COST),
    max: Math.floor(PLAN_CREDIT_TOPUPS['Studio'] / IMAGE_MAX_COST),
  },
}

const VIDEO_USAGE_BY_PLAN: Record<PlanId, UsageRange> = {
  'Starter': {
    min: Math.floor(PLAN_CREDIT_TOPUPS['Starter'] / VIDEO_MIN_COST),
    max: Math.floor(PLAN_CREDIT_TOPUPS['Starter'] / VIDEO_MAX_COST),
  },
  'Pro': {
    min: Math.floor(PLAN_CREDIT_TOPUPS['Pro'] / VIDEO_MIN_COST),
    max: Math.floor(PLAN_CREDIT_TOPUPS['Pro'] / VIDEO_MAX_COST),
  },
  'Studio': {
    min: Math.floor(PLAN_CREDIT_TOPUPS['Studio'] / VIDEO_MIN_COST),
    max: Math.floor(PLAN_CREDIT_TOPUPS['Studio'] / VIDEO_MAX_COST),
  },
}

function formatRange(range: UsageRange): string {
  const formatter = new Intl.NumberFormat('en-US')
  return `${formatter.format(range.min)}–${formatter.format(range.max)}`
}

export default function PricingPage() {
  return (
    <>
      <SiteNavbarSignedIn />
      <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-background via-background/80 to-background py-20 px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Pricing
          </h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            Start with Blooma for your storyboarding
          </p>
        </div>
        <div className="mt-12 w-full max-w-6xl space-y-12">
          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING_PLANS.map(plan => (
              <HobbyPlanCard
                key={plan.id}
                className="w-full border-border/60 shadow-xl shadow-primary/10"
                plan={plan}
              />
            ))}
          </div>

          <section className="w-full rounded-3xl border border-border/50 bg-card/80 px-6 py-6 sm:px-8 sm:py-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  What can you generate with each plan?
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  Ranges below assume you&apos;re using our lightest models (like Seedream) up to the most
                  premium options (like Nano Banana Pro) for images, and Kling models for video.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PRICING_PLANS.map(plan => {
                const imageRange = IMAGE_USAGE_BY_PLAN[plan.id as PlanId]
                const videoRange = VIDEO_USAGE_BY_PLAN[plan.id as PlanId]

                return (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Image generations: </span>
                        {formatRange(imageRange)} per month (approx.)
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Video clips: </span>
                        {formatRange(videoRange)} per month (approx.)
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
