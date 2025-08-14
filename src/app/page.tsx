'use client'

import { Button } from '@/components/ui/button'
import { Palette, Zap, Users, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { AuthForm } from '@/components/auth/AuthForm'

export default function Home() {
  const router = useRouter()
  const { user, signOut } = useSupabase()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header (로고+네비+액션) */}
      <div className="bg-white border-b-2 border-gray-900 h-16 flex items-center">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto gap-x-24 px-4">
          {/* 좌측: 로고 */}
          <div className="flex items-center">
            <img
              src="/blooma.svg"
              alt="Blooma Logo"
              aria-label="Blooma Logo"
              className="w-14 h-14 object-contain"
              draggable={false}
            />
            <span className="text-2xl font-bold text-gray-900 select-none ml-3">Blooma</span>
          </div>
          {/* 중앙: 네비게이션 */}
          <nav className="hidden md:flex gap-8">
            <a
              href="#features"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="#about"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Contact
            </a>
          </nav>
          {/* 우측: 액션 버튼 */}
          <div className="flex items-center gap-3 -mt-1 group">
            {!user ? (
              <>
                <Button
                  variant="fadeinoutline"
                  className="py-1 px-3"
                  onClick={() => router.push('/auth')}
                >
                  Login
                </Button>
                <Button
                  variant="fadeinoutline"
                  className="py-1 px-3"
                  onClick={() => router.push('/auth')}
                >
                  Get Started Free
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Visualize <span className="text-primary">Your Story</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            The AI-powered content planning tool for creators. Turn your ideas into complete
            storyboards in minutes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button variant="default">Get Started Free</Button>
            <Button variant="default" onClick={() => router.push('/dashboard')}>
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-secondary/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Reduce Planning Time by 70%
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Create fast and accurate storyboards with AI-powered automation.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="flex justify-center">
                <Palette className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Card-Based Design</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Structured storyboard with 6 card types: Hook, Problem, Solution, Evidence, Benefit,
                and CTA.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">AI Auto-Generation</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Simply enter keywords, and AI automatically generates content and images.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Real-time Collaboration
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Work together with team members through real-time feedback and sharing.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Download className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Multiple Export Options
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Export in various formats, including PNG, PDF, and MP4.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Blooma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
