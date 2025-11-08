import Link from 'next/link'
import Image from 'next/image'
import PricingCard from '@/components/billing/pricingcard'
import SiteNavbarSignedIn from '@/components/layout/SiteNavbarSignedIn'
export default function BillingPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      <SiteNavbarSignedIn />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Billing</h1>
          <p className="mt-3 text-muted-foreground">
            Choose the Hobby plan to unlock 1,000 monthly credits. You can manage or cancel your
            subscription anytime.
          </p>
        </section>
      </main>
    </div>
  )
}
