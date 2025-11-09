import { preloadQueueService, type PreloadOptions } from './preloadQueueService'

const SESSION_STORAGE_KEY = 'blooma::image-preloads'
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours
const CACHE_LIMIT = 256

type StoredPreload = {
  url: string
  ts: number
}

class ImagePreloadManager {
  private cache = new Set<string>()
  private loadingFromStorage = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.hydrate()
    }
  }

  preload(url?: string | null, options: PreloadOptions = {}) {
    const normalized = this.normalize(url)
    if (!normalized) return Promise.resolve()

    if (this.cache.has(normalized)) {
      return Promise.resolve()
    }

    const priority: PreloadOptions['priority'] = options.priority ?? 'high'

    return preloadQueueService
      .enqueue(normalized, { ...options, priority })
      .then(() => {
        this.cache.add(normalized)
        this.pruneAndPersist()
      })
      .catch(error => {
        // Swallow network errors so the UI can still render with fallbacks
        console.warn('[imagePreloadManager] failed to preload', normalized, error)
      })
  }

  preloadMany(urls: Array<string | null | undefined>, options?: PreloadOptions) {
    return preloadQueueService
      .preloadBatch(urls, { priority: options?.priority ?? 'high' })
      .then(() => {
        urls.forEach(url => {
          const normalized = this.normalize(url)
          if (normalized) {
            this.cache.add(normalized)
          }
        })
        this.pruneAndPersist()
      })
  }

  has(url?: string | null) {
    const normalized = this.normalize(url)
    if (!normalized) return false
    return this.cache.has(normalized)
  }

  private hydrate() {
    if (this.loadingFromStorage) return
    this.loadingFromStorage = true
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredPreload[]
      const now = Date.now()
      parsed.forEach(item => {
        if (item && typeof item.url === 'string' && now - item.ts < CACHE_TTL) {
          this.cache.add(item.url)
        }
      })
    } catch (error) {
      console.warn('[imagePreloadManager] failed to hydrate cache', error)
    } finally {
      this.loadingFromStorage = false
    }
  }

  private pruneAndPersist() {
    if (typeof window === 'undefined') return
    const now = Date.now()
    const entries: StoredPreload[] = Array.from(this.cache)
      .slice(-CACHE_LIMIT)
      .map(url => ({ url, ts: now }))

    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.warn('[imagePreloadManager] failed to persist cache', error)
    }
  }

  private normalize(url?: string | null) {
    if (!url) return null
    return url.trim()
  }
}

export const imagePreloadManager = new ImagePreloadManager()
