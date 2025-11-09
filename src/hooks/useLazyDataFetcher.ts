'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const CACHE_TTL = 1000 * 60 * 5 // 5 minutes
const lazyCache = new Map<string, { data: unknown; ts: number }>()

type TriggerMode = 'visible' | 'manual'

export interface UseLazyDataFetcherOptions<T> {
  fetcher: () => Promise<T>
  initialData?: T
  cacheKey?: string
  enabled?: boolean
  threshold?: number
  rootMargin?: string
  trigger?: TriggerMode
  once?: boolean
}

export interface UseLazyDataFetcherResult<T> {
  data: T | undefined
  isFetching: boolean
  error: Error | null
  hasFetched: boolean
  ref: (node: Element | null) => void
  fetchNow: () => Promise<T | undefined>
  setData: React.Dispatch<React.SetStateAction<T | undefined>>
}

function readCache<T>(key?: string) {
  if (!key) return undefined
  const cached = lazyCache.get(key)
  if (!cached) return undefined
  if (Date.now() - cached.ts > CACHE_TTL) {
    lazyCache.delete(key)
    return undefined
  }
  return cached.data as T
}

export function useLazyDataFetcher<T>(options: UseLazyDataFetcherOptions<T>): UseLazyDataFetcherResult<T> {
  const {
    fetcher,
    initialData,
    cacheKey,
    enabled = true,
    threshold = 0.1,
    rootMargin = '200px',
    trigger = 'visible',
    once = true,
  } = options

  const cachedValue = useMemo(() => readCache<T>(cacheKey), [cacheKey])
  const [data, setData] = useState<T | undefined>(() => cachedValue ?? initialData)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasFetched, setHasFetched] = useState(() => Boolean(cachedValue))
  const observerRef = useRef<IntersectionObserver | null>(null)
  const targetRef = useRef<Element | null>(null)

  const executeFetch = useCallback(async () => {
    if (!enabled) return data
    if (isFetching) return data
    if (once && hasFetched) return data
    setIsFetching(true)
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
      if (cacheKey) {
        lazyCache.set(cacheKey, { data: result, ts: Date.now() })
      }
      setHasFetched(true)
      return result
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Lazy fetch failed')
      setError(nextError)
      throw nextError
    } finally {
      setIsFetching(false)
    }
  }, [cacheKey, data, enabled, fetcher, hasFetched, isFetching, once])

  const cleanupObserver = useCallback(() => {
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  const ref = useCallback(
    (node: Element | null) => {
      if (observerRef.current && targetRef.current) {
        observerRef.current.unobserve(targetRef.current)
      }
      targetRef.current = node

      if (!node || typeof window === 'undefined' || trigger === 'manual') {
        return
      }

      if (!enabled || (once && hasFetched)) {
        return
      }

      const observer = new IntersectionObserver(entries => {
        const isVisible = entries.some(entry => entry.isIntersecting)
        if (isVisible) {
          executeFetch()
          if (once) {
            cleanupObserver()
          }
        }
      }, { threshold, rootMargin })

      observer.observe(node)
      observerRef.current = observer
    },
    [cleanupObserver, enabled, executeFetch, hasFetched, once, rootMargin, threshold, trigger]
  )

  useEffect(() => () => cleanupObserver(), [cleanupObserver])

  return {
    data,
    isFetching,
    error,
    hasFetched,
    ref,
    fetchNow: executeFetch,
    setData,
  }
}
