import Link from 'next/link'
import Image from 'next/image'
import AccountDropdown from '@/components/ui/AccountDropdown'
import ThemeToggle from '@/components/ui/theme-toggle'
import HobbyPlanCard from '@/components/billing/HobbyPlanCard'

export default function BillingPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      <header
        className="w-full h-14 border-b px-6 flex items-center justify-between"
        style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
      >
        <Link
          href="/"
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Image
            src="/blooma_logo.svg"
            alt="Blooma Logo"
            width={28}
            height={28}
            className="w-7 h-7 object-contain select-none"
            draggable={false}
          />
        </Link>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <AccountDropdown />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Billing</h1>
          <p className="mt-3 text-muted-foreground">
            Choose the Hobby plan to unlock 1,000 monthly credits. You can manage or cancel your
            subscription anytime.
          </p>
        </section>

        <HobbyPlanCard className="max-w-lg border-primary/20 shadow-lg shadow-primary/10" />
      </main>
    </div>
  )
}
