import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import ToasterProvider from '@/components/ui/toast';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <SupabaseProvider>
          <ToasterProvider>
            <div id="root" className="relative flex min-h-screen flex-col">
              <main className="flex-1">
                {children}
              </main>
            </div>
          </ToasterProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
