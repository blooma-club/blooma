'use client'

import Image from 'next/image'

export default function SiteFooter() {
  const logoSrc = '/blooma_logo_black.webp'

  return (
    <footer className="relative border-t border-border/50 dark:border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Image
                src={logoSrc}
                alt="Blooma"
                width={24}
                height={24}
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-medium text-foreground">Blooma</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2025 Blooma. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
