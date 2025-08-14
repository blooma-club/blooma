'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
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
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const setUserState = useUserStore(state => state.setUserState)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('SupabaseProvider: Error getting initial session:', error)
        console.error('SupabaseProvider: Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        })
      }

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Update Zustand store when user changes
  useEffect(() => {
    // Check cookie status
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';').map(c => c.trim())
      const supabaseCookies = cookies.filter(c => c.startsWith('sb-'))
    }

    const newState = {
      user: user,
      userId: user?.id ?? null,
      isLoaded: !loading,
    }

    setUserState(newState)
  }, [user, loading, setUserState])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      console.error('SupabaseProvider: Sign up error:', error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      console.error('SupabaseProvider: Sign in error:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      console.error('SupabaseProvider: Google sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
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
