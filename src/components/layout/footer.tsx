import Image from 'next/image'
{
  /* Footer - Linear Style */
}
export default function siteFooter() {
  return (
    <footer className="relative border-t border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Image
                src="/blooma_logo.svg"
                alt="Blooma"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-sm font-medium text-white">Blooma</span>
            </div>
            <p className="text-sm text-neutral-500">&copy; 2025 Blooma. All rights reserved.</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a
              href="/pricing"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <a
              href="/privacy"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
