/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A very small image preload queue that prioritizes critical thumbnails first
 * and keeps the number of in-flight requests capped to avoid hitting
 * the browser fetch limit. The queue dynamically adapts to the current
 * network throughput exposed by the Network Information API.
 */

export type PreloadPriority = 'high' | 'low' | 'auto'

export interface PreloadOptions {
  priority?: PreloadPriority
  signal?: AbortSignal
}

interface QueueItem {
  url: string
  options: PreloadOptions
  resolve: () => void
  reject: (error: Error) => void
}

const DEFAULT_CONCURRENCY = 4

class PreloadQueueService {
  private queue: QueueItem[] = []
  private activeCount = 0
  private maxConcurrency: number
  private pending: Map<string, Promise<void>> = new Map()

  constructor() {
    this.maxConcurrency = this.computeConcurrency()

    if (typeof window !== 'undefined') {
      const connection = (navigator as any)?.connection as
        | { downlink?: number; addEventListener?: (type: string, listener: () => void) => void }
        | undefined
      connection?.addEventListener?.('change', () => {
        this.maxConcurrency = this.computeConcurrency()
      })
    }
  }

  enqueue(url: string, options: PreloadOptions = {}): Promise<void> {
    const normalized = (url || '').trim()
    if (!normalized) return Promise.resolve()

    const deduped = this.pending.get(normalized)
    if (deduped) {
      return deduped
    }

    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push({ url: normalized, options, resolve, reject })
      this.flush()
    })

    this.pending.set(normalized, promise)
    promise.finally(() => this.pending.delete(normalized))
    return promise
  }

  preloadBatch(urls: Array<string | null | undefined>, options?: PreloadOptions) {
    const tasks = urls
      .map(url => (url || '').trim())
      .filter(Boolean)
      .map(url => this.enqueue(url, options))

    return Promise.allSettled(tasks).then(() => undefined)
  }

  private flush() {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      if (!task) {
        break
      }
      this.activeCount++
      this.load(task)
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.activeCount--
          this.flush()
        })
    }
  }

  private async load(task: QueueItem) {
    if (typeof window === 'undefined') {
      return
    }

    if (task.options.signal?.aborted) {
      throw new DOMException('Preload aborted', 'AbortError')
    }

    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      const priority = task.options.priority ?? 'auto'
      const loadingMode = priority === 'low' ? 'lazy' : 'eager'

      // Newer browsers support fetchPriority on HTMLImageElement
      if ('fetchPriority' in img) {
        try {
          ;(img as HTMLImageElement & { fetchPriority: PreloadPriority }).fetchPriority = priority
        } catch {
          // ignore when not supported yet
        }
      }

      img.loading = loadingMode
      img.decoding = 'async'

      const cleanup = () => {
        img.onload = null
        img.onerror = null
        task.options.signal?.removeEventListener?.('abort', onAbort)
      }

      const onAbort = () => {
        cleanup()
        reject(new DOMException('Preload aborted', 'AbortError'))
      }

      if (task.options.signal) {
        task.options.signal.addEventListener('abort', onAbort, { once: true })
      }

      img.onload = () => {
        cleanup()
        resolve()
      }

      img.onerror = () => {
        cleanup()
        reject(new Error(`[preloadQueue] Failed to preload ${task.url}`))
      }

      img.src = task.url
    })
  }

  private computeConcurrency() {
    if (typeof navigator === 'undefined') {
      return DEFAULT_CONCURRENCY
    }

    const connection = (navigator as any)?.connection as { downlink?: number } | undefined
    const downlink = connection?.downlink ?? 10

    if (downlink < 1) return 2
    if (downlink < 2.5) return 3
    if (downlink < 4) return 4
    if (downlink < 6) return 5
    return 6
  }
}

export const preloadQueueService = new PreloadQueueService()
