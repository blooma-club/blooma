'use client'

import { useSyncExternalStore } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Snapshot = {
  user: User | null
  isLoading: boolean
}

let initialized = false
let currentUser: User | null = null
let loading = true
const serverSnapshot: Snapshot = { user: null, isLoading: true }
let cachedSnapshot: Snapshot = serverSnapshot
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

function init() {
  if (initialized) return
  initialized = true

  const supabase = getSupabaseBrowserClient()

  supabase.auth.getUser().then(({ data }) => {
    currentUser = data.user ?? null
    loading = false
    notify()
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null
    loading = false
    notify()
  })
}

function subscribe(callback: () => void) {
  init()
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot(): Snapshot {
  if (cachedSnapshot.user === currentUser && cachedSnapshot.isLoading === loading) {
    return cachedSnapshot
  }
  cachedSnapshot = { user: currentUser, isLoading: loading }
  return cachedSnapshot
}

function getServerSnapshot(): Snapshot {
  return serverSnapshot
}

export function useSupabaseUser() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    user: snapshot.user,
    isLoading: snapshot.isLoading,
    isAuthenticated: Boolean(snapshot.user),
  }
}
