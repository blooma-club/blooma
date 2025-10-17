import { ClerkProvider } from '@clerk/nextjs';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import ToasterProvider from '@/components/ui/toast';
import type { Metadata } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
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
  return (
    <PublishableClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} ${instrumentSerif.variable} antialiased min-h-screen bg-black text-white font-sans`}
        >
          <SupabaseProvider>
            {clerkPublishableKey ? <ClerkSyncEffect /> : null}
            <ToasterProvider>
              <div id="root" className="relative flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
              </div>
            </ToasterProvider>
          </SupabaseProvider>
        </body>
      </html>
    </PublishableClerkProvider>
  );
}

function PublishableClerkProvider({ children }: { children: React.ReactNode }) {
  if (!clerkPublishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={{ variables: { colorPrimary: '#000000' } }}
    >
      {children}
    </ClerkProvider>
  );
}
