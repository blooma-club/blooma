'use client'

import { SignIn } from '@clerk/nextjs'
import AuthShell from '@/components/auth/AuthShell'

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: 'w-full',
          },
        }}
      />
    </AuthShell>
  )
}
