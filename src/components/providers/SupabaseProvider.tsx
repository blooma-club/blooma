'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import type { UserResource } from '@clerk/types'
import { useUserStore } from '@/store/user'

interface SupabaseContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { isLoaded: authLoaded, isSignedIn, getToken, signOut: clerkSignOut } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const setUserState = useUserStore(state => state.setUserState)

  useEffect(() => {
    if (!clerkLoaded) {
      return
    }

    if (!clerkUser) {
      setUser(null)
      setSession(null)
      setLoading(false)
      return
    }

    setUser(mapClerkUserToSupabaseUser(clerkUser))
    setLoading(false)
  }, [clerkLoaded, clerkUser])

  useEffect(() => {
    if (!authLoaded) return

    let cancelled = false

    const syncSession = async () => {
      if (!isSignedIn || !user) {
        if (!cancelled) {
          setSession(null)
        }
        return
      }

      try {
        const token =
          (await getToken({ template: 'supabase' }).catch(() => null)) ?? (await getToken().catch(() => null))

        if (cancelled) return
        if (!token) {
          setSession(null)
          return
        }

        const syntheticSession = {
          access_token: token,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: token,
          user,
        } as Session

        setSession(syntheticSession)
      } catch (error) {
        console.error('SupabaseProvider: Failed to retrieve Clerk token', error)
        if (!cancelled) {
          setSession(null)
        }
      }
    }

    syncSession()

    const interval = setInterval(syncSession, 4 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [authLoaded, getToken, isSignedIn, user])

  useEffect(() => {
    const newState = {
      user,
      userId: user?.id ?? null,
      isLoaded: !loading,
    }

    setUserState(newState)
  }, [user, loading, setUserState])

  const signUp = async (email: string, _password: string) => {
    void _password
    console.warn('SupabaseProvider: signUp is delegated to Clerk, redirecting to /auth', { email })
    router.push('/auth')
  }

  const signIn = async (email: string, _password: string) => {
    void _password
    console.warn('SupabaseProvider: signIn is delegated to Clerk, redirecting to /auth', { email })
    router.push('/auth')
  }

  const signInWithGoogle = async () => {
    router.push('/auth')
  }

  const signOut = async () => {
    try {
      await clerkSignOut()
      setSession(null)
      setUser(null)
      router.push('/auth')
    } catch (error) {
      console.error('SupabaseProvider: Sign out error:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

function mapClerkUserToSupabaseUser(clerkUser: UserResource): User {
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses.find(address => address.emailAddress)?.emailAddress ??
    null

  const fallbackName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim()
  const fullName = clerkUser.fullName ?? (fallbackName.length > 0 ? fallbackName : null)

  const syntheticUser = {
    id: clerkUser.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: email ?? undefined,
    created_at: clerkUser.createdAt?.toISOString() ?? new Date().toISOString(),
    updated_at: clerkUser.updatedAt?.toISOString() ?? new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    confirmed_at: undefined,
    confirmation_sent_at: undefined,
    email_confirmed_at: undefined,
    phone: undefined,
    phone_confirmed_at: undefined,
    invited_at: undefined,
    action_link: undefined,
    recovery_sent_at: undefined,
    email_change_sent_at: undefined,
    new_email: undefined,
    new_phone: undefined,
    app_metadata: {
      provider: 'clerk',
      providers: ['clerk'],
    },
    user_metadata: {
      full_name: fullName ?? undefined,
      avatar_url: clerkUser.imageUrl ?? undefined,
    },
    identities: [],
    is_anonymous: false,
    is_sso_user: true,
    factors: [],
    deleted_at: undefined,
  }

  return syntheticUser as unknown as User
}
