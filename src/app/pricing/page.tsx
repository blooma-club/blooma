import HobbyPlanCard from '@/components/billing/HobbyPlanCard'
import SiteNavbar from '@/components/layout/SiteNavbar'

export default function PricingPage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-background via-background/80 to-background py-20 px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Pricing that scales with you
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            A single plan with everything you need to ship fast. Upgrade whenever you are ready to
            go beyond the basics.
          </p>
        </div>

        <HobbyPlanCard className="mt-12 w-full max-w-md border-primary/20 shadow-xl shadow-primary/10" />
      </main>
    </>
  )
}
