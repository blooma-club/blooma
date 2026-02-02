import { ApiError } from '@/lib/errors'
import { reconstructR2Url } from '@/lib/infra/storage'
import { validateImageUrl } from '@/lib/infra/security'

export function resolveInputUrl(inputUrl: string | undefined, requestUrl: string): string | undefined {
  if (!inputUrl) return undefined
  const trimmed = inputUrl.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return undefined

  let resolved: string
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    resolved = trimmed
  } else if (trimmed.startsWith('/')) {
    resolved = new URL(trimmed, requestUrl).toString()
  } else {
    resolved = reconstructR2Url(trimmed)
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    const validation = validateImageUrl(resolved)
    if (!validation.valid) {
      throw ApiError.badRequest(`Invalid image URL: ${validation.reason}`)
    }
  }

  return resolved
}

