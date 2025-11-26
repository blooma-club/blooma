import { ClerkProvider } from '@clerk/nextjs'
import ToasterProvider from '@/components/ui/toast'
import type { Metadata } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import Script from 'next/script'
import './globals.css'
import ClerkSyncEffect from '@/components/auth/ClerkSyncEffect'
import { GlobalPopupProvider } from '@/components/GlobalPopupProvider'
import { THEME_STORAGE_KEY } from '@/lib/theme'

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'AI Storyboard - Content Planning Tool for Creators',
  description:
    'Reduce content planning time by 70% with AI-powered storyboard generation. Features card-based visualization and real-time collaboration.',
  keywords: ['AI', 'storyboard', 'content planning', 'creators', 'video planning', 'marketing'],
  authors: [{ name: 'Blooma Team' }],
}

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
      {clerkPublishableKey ? <ClerkSyncEffect /> : null}
      <div id="root" className="relative flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </ToasterProvider>
  )

  return (
    <html lang="en" className={`${inter.variable} ${GeistSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const THEME_STORAGE_KEY = '${THEME_STORAGE_KEY}';
                
                function getStoredTheme() {
                  try {
                    const stored = localStorage.getItem(THEME_STORAGE_KEY);
                    if (stored === 'dark' || stored === 'light') return stored;
                  } catch (e) {}
                  return null;
                }
                
                function getSystemTheme() {
                  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return 'dark';
                  }
                  return 'light';
                }
                
                function getInitialTheme() {
                  return getStoredTheme() || getSystemTheme() || 'dark';
                }
                
                const theme = getInitialTheme();
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        {clerkPublishableKey ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>{appShell}</ClerkProvider>
        ) : (
          <ClerkFallbackUI />
        )}
      </body>
    </html>
  )
}
