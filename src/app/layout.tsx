import { ClerkProvider } from '@clerk/nextjs'
import ToasterProvider from '@/components/ui/toast' 
import { Inter } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

import { GlobalPopupProvider } from '@/components/GlobalPopupProvider'

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

function ClerkFallbackUI() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-black">Configuration Error</h1>
          <p className="text-base text-neutral-600">
            Clerk authentication is not configured for this environment.
          </p>
        </div>
        <div className="space-y-2 rounded-md bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">Required Environment Variable:</p>
          <code className="block rounded bg-neutral-100 px-2 py-1 text-sm text-neutral-800">
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          </code>
        </div>
        <div className="space-y-1 text-sm text-neutral-600">
          <p>Please set the environment variable and restart the application.</p>
          <p className="text-xs text-neutral-500">
            This is a required configuration for the application to function properly.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const appShell = (
    <ToasterProvider>
      <GlobalPopupProvider />

      <div id="root" className="relative flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </ToasterProvider>
  )

  return (
    <html lang="en" className={`${inter.variable} ${GeistSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        {clerkPublishableKey ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>{appShell}</ClerkProvider>
        ) : (
          <ClerkFallbackUI />
        )}
      </body>
    </html>
  )
}
