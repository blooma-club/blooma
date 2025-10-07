'use client'
import { useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn, signUp, signInWithGoogle } = useSupabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full space-y-8">
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 justify-center gap-3 border border-black/20 bg-white text-black hover:bg-black/30 "
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {googleLoading ? 'Signing in...' : 'Continue with Google'}
      </Button>

      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="uppercase tracking-[0.2em] text-xs text-gray-400">Or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="john.doe@email.com"
            required
            className="h-12 rounded-sm border-gray-300 bg-white text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-black"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="h-12 rounded-sm border-gray-300 bg-white text-base text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-black"
          />
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <Button
          type="submit"
          className="h-12 w-full rounded-sm bg-black text-base font-medium text-white hover:bg-black/80"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Continue'}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-500">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="font-medium text-black underline-offset-2 hover:underline"
        >
          {isSignUp
            ? 'Do you already have an account? Log in'
            : "Don't have an account yet? Sign up"}
        </button>
      </div>
    </div>
  )
}
