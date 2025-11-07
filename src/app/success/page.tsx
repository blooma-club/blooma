import Link from 'next/link'
import { CheckCircle2, ArrowRight, Sparkles, Shield, GaugeCircle } from 'lucide-react'
import SiteNavbar from '@/components/layout/SiteNavbar'
import { Button } from '@/components/ui/button'
type SuccessPageProps = {
  params: Promise<Record<string, never>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
export default async function PaymentSuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = await searchParams
  const planParam = Array.isArray(resolvedSearchParams.plan)
    ? resolvedSearchParams.plan[0]
    : resolvedSearchParams.plan
  const emailParam = Array.isArray(resolvedSearchParams.email)
    ? resolvedSearchParams.email[0]
    : resolvedSearchParams.email
  const plan = planParam ? decodeURIComponent(planParam) : 'Blooma Studio'
  const email = emailParam ? decodeURIComponent(emailParam) : undefined
  const highlights = [
    {
      icon: Sparkles,
      title: 'Creative automation unlocked',
      description:
        'Generate storyboards, variations, and motion briefs in minutes with AI-assisted workflows tailored to your team.',
    },
    {
      icon: Shield,
      title: 'Production-ready security',
      description:
        'Granular access controls, project-level permissions, and secure asset handling keep client work protected.',
    },
    {
      icon: GaugeCircle,
      title: 'Velocity you can measure',
      description:
        'Track throughput, review cycles, and approvals from a single dashboard so teams stay aligned as you scale.',
    },
  ]
  const nextSteps = [
    'Invite collaborators and set project roles',
    'Connect asset libraries or upload your first reference pack',
    'Configure brand kits so AI outputs match your visual language',
  ]
  return (
    <>
      <SiteNavbar />
      <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background/90 to-background">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-24 pt-20">
          <div className="rounded-3xl border border-primary/30 bg-primary/10 p-10 shadow-2xl shadow-primary/25 backdrop-blur">
            <div className="flex flex-col items-start gap-6 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
                  <CheckCircle2 className="h-7 w-7" aria-hidden />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-primary/80">
                    Payment confirmed
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
                    Welcome to {plan}
                  </h1>
                  {email && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      A detailed receipt is on its way to{' '}
                      <span className="font-medium text-foreground">{email}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/dashboard" className="inline-flex items-center gap-2">
                    Go to dashboard
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-primary/30 text-primary sm:w-auto"
                >
                  <Link href="/dashboard/billing" className="inline-flex items-center gap-2">
                    Manage billing
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-8 backdrop-blur">
              <h2 className="text-xl font-semibold text-foreground">Here&apos;s what comes next</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We already provisioned your workspace with enterprise defaults so your team can jump
                straight into production.
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {nextSteps.map(step => (
                  <li
                    key={step}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/60 p-4"
                  >
                    <div className="mt-1">
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <p className="text-sm text-foreground">{step}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-border/60 bg-background/80 p-8 shadow-lg shadow-primary/5">
                <h2 className="text-xl font-semibold text-foreground">
                  Workspace upgrades live now
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Your team unlocks unlimited storyboard generations, brand kits, and production
                  timelines with this plan. Ship briefs that clients approve in a single pass.
                </p>
                <dl className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-foreground">
                    <dt className="font-medium">Plan</dt>
                    <dd>{plan}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-foreground">
                    <dt className="font-medium">Status</dt>
                    <dd className="flex items-center gap-2 text-primary">
                      Active
                      <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-foreground">
                    <dt className="font-medium">Next renewal</dt>
                    <dd>30 days from today</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-3xl border border-primary/20 bg-primary/15 p-8 backdrop-blur">
                <h3 className="text-base font-semibold text-primary">Need a hand?</h3>
                <p className="mt-2 text-sm text-primary/90">
                  Our production specialists can help migrate boards, import references, or set up
                  governance.
                </p>
                <Button
                  asChild
                  variant="ghost"
                  className="mt-4 w-fit text-primary hover:bg-primary/20"
                >
                  <Link
                    href="mailto:support@blooma.studio"
                    className="inline-flex items-center gap-2"
                  >
                    Contact support
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-muted/30 p-8">
            <h2 className="text-xl font-semibold text-foreground">Why teams love {plan}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {highlights.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/80 p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
