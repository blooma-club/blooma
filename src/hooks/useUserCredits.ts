'use client'

import useSWR from 'swr'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

type CreditsResponse = {
  success?: boolean
  data?: {
    total: number
    used: number
    remaining: number
    percentage: number
    resetDate: string | null
    subscriptionTier: string | null
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error('Failed to fetch credits')
  }
  return (await res.json()) as CreditsResponse
}

const EMPTY_DATA: NonNullable<CreditsResponse['data']> = {
  total: 0,
  used: 0,
  remaining: 0,
  percentage: 0,
  resetDate: null,
  subscriptionTier: null,
}

export function useUserCredits() {
  const { user, isLoading: userLoading } = useSupabaseUser()
  const { data, error, isLoading, mutate } = useSWR(user ? '/api/user/credits' : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const credits = data?.data ?? EMPTY_DATA

  return {
    ...credits,
    isLoading: isLoading || userLoading,
    error,
    refresh: mutate,
    hasError: Boolean(error),
    isAvailable: Boolean(user),
  }
}
