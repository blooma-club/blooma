import { ClerkProvider } from '@clerk/nextjs';
import ToasterProvider from '@/components/ui/toast';
import type { Metadata } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ClerkSyncEffect from '@/components/auth/ClerkSyncEffect';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const inter = Inter({
  variable: "--font-hanken-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "AI Storyboard - Content Planning Tool for Creators",
  description: "Reduce content planning time by 70% with AI-powered storyboard generation. Features card-based visualization and real-time collaboration.",
  keywords: ["AI", "storyboard", "content planning", "creators", "video planning", "marketing"],
  authors: [{ name: "Blooma Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appShell = (
    <ToasterProvider>
      {clerkPublishableKey ? <ClerkSyncEffect /> : null}
      <div id="root" className="relative flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </ToasterProvider>
  );

  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const THEME_STORAGE_KEY = 'blooma_theme_preference';
                
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
          <ClerkProvider
            publishableKey={clerkPublishableKey}
          >
            {appShell}
          </ClerkProvider>
        ) : (
          appShell
        )}
      </body>
    </html>
  );
}
