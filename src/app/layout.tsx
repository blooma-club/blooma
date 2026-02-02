import ToasterProvider from '@/components/ui/toast'
import { Inter } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

import { GlobalPopupProvider } from '@/components/providers/GlobalPopupProvider'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
        {appShell}
      </body>
    </html>
  )
}
