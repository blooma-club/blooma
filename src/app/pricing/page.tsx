import HobbyPlanCard, { type PlanOption } from '@/components/billing/pricingcard'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'
import SiteFooter from '@/components/layout/footer'

const PRICING_PLANS: PlanOption[] = [
  {
    id: 'blooma-1000',
    label: 'Blooma — 1,000 Credits',
    price: '$8',
    priceNote: 'Billed monthly',
    tagline: 'Starter plan to explore Blooma with confidence.',
    ctaLabel: 'Purchase credits',
    features: [
      '1,000 credits deposited every month',
      'Best-in-class image and storyboard renders',
      'Commercial usage coverage included',
      'Cancel or switch plans anytime',
    ],
  },
  {
    id: 'blooma-3000',
    label: 'Blooma — 3,000 Credits',
    price: '$20',
    priceNote: 'Billed monthly',
    tagline: 'Great for growing teams and active side projects.',
    ctaLabel: 'Purchase credits',
    features: [
      '3,000 credits deposited every month',
      'High-priority rendering in peak hours',
      'Advanced collaboration tools',
      'Commercial usage coverage included',
    ],
  },
  {
    id: 'blooma-5000',
    label: 'Blooma — 5,000 Credits',
    price: '$50',
    priceNote: 'Billed monthly',
    tagline: 'High-usage plan for production workloads.',
    ctaLabel: 'Purchase credits',
    features: [
      '5,000 credits deposited every month',
      'Enterprise-grade support response times',
      'Fine-grained user management',
      'Commercial usage coverage included',
    ],
  },
]

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
        <div className="mt-12 grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map(plan => (
            <HobbyPlanCard
              key={plan.id}
              className="w-full border-border/60 shadow-xl shadow-primary/10"
              plan={plan}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
