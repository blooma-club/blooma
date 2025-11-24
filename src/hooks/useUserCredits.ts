'use client'

import useSWR from 'swr'
import { useAuth } from '@clerk/nextjs'

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
  const { userId } = useAuth()
  const { data, error, isLoading, mutate } = useSWR(userId ? '/api/user/credits' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  const credits = data?.data ?? EMPTY_DATA

  return {
    ...credits,
    isLoading,
    error,
    refresh: mutate,
    hasError: Boolean(error),
    isAvailable: Boolean(userId),
  }
}
