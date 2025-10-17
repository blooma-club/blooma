'use client'

import { SignUp } from '@clerk/nextjs'
import AuthShell from '@/components/auth/AuthShell'

export default function SignUpPage() {
  return (
    <AuthShell>
      <div className="space-y-6">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/auth"
          afterSignUpUrl="/dashboard"
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: 'w-full',
            },
          }}
        />

        <p className="text-sm leading-6 text-gray-500">
          By continuing, you agree to Blooma&apos;s{' '}
          <a href="/terms" className="font-medium text-gray-700 underline hover:text-gray-900">
            Terms of Use
          </a>
          . Read our{' '}
          <a href="/privacy" className="font-medium text-gray-700 underline hover:text-gray-900">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthShell>
  )
}
