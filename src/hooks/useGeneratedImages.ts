import useSWRInfinite from 'swr/infinite'
import { useMemo } from 'react'

export interface GeneratedImageSlim {
    id: string
    group_id?: string
    image_url: string
    prompt?: string
    created_at: string
}

type UseGeneratedImagesOptions = {
    favoritesOnly?: boolean
    limit?: number
    enabled?: boolean
}

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

export function useGeneratedImages({
    favoritesOnly = false,
    limit = 24,
    enabled = true
}: UseGeneratedImagesOptions = {}) {

    // SWR Infinite key loader
    const getKey = (pageIndex: number, previousPageData: { data: GeneratedImageSlim[], hasMore: boolean } | null) => {
        if (!enabled) return null
        // If reached end, return null
        if (previousPageData && !previousPageData.hasMore) return null

        const offset = pageIndex * limit
        const params = new URLSearchParams()
        params.set('limit', limit.toString())
        params.set('offset', offset.toString())
        if (favoritesOnly) {
            params.set('favorites', 'true')
        }

        return `/api/generated-images?${params.toString()}`
    }

    const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<{
        success: boolean
        data: GeneratedImageSlim[]
        hasMore: boolean
    }>(getKey, fetcher, {
        revalidateOnFocus: false,
        revalidateFirstPage: false,
    })

    const images = useMemo(() => {
        return data ? data.flatMap(page => page.data || []) : []
    }, [data])

    const hasMore = data ? data[data.length - 1]?.hasMore : false
    const isLoading = !data && !error
    const isLoadingMore = isValidating && data && size > 0

    return {
        data,
        images,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        size,
        setSize,
        mutate,
        isValidating
    }
}
