'use client'

/**
 * Client-side utilities for handling R2 URLs
 * These functions run in the browser and don't require server-only modules
 */

import type { UploadOptions } from './storage'

/**
 * Ensure a URL is uploaded to R2
 * If the URL is already an R2 URL or external URL, return as-is
 * If it's a blob or data URL, upload it to R2 first
 */
export async function ensureR2Url(url: string, options: UploadOptions = {}): Promise<string> {
  // If already an HTTP/HTTPS URL (not blob), assume it's already hosted
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }

  // If it's a blob or data URL, we need to upload it
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    // For blob URLs, we need to fetch the blob first
    let file: File

    if (url.startsWith('blob:')) {
      const response = await fetch(url)
      const blob = await response.blob()
      file = new File([blob], 'upload.png', { type: blob.type || 'image/png' })
    } else {
      // For data URLs, convert to blob
      const response = await fetch(url)
      const blob = await response.blob()
      file = new File([blob], 'upload.png', { type: blob.type || 'image/png' })
    }

    // Upload via the server API
    const formData = new FormData()
    formData.append('file', file)

    if (options.projectId) formData.append('projectId', options.projectId)
    if (options.frameId) formData.append('frameId', options.frameId)
    if (options.assetId) formData.append('assetId', options.assetId)
    if (options.type) formData.append('type', options.type)

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to upload image')
    }

    return result.publicUrl || result.signedUrl || result.data?.image_url
  }

  // For relative URLs or R2 keys, reconstruct with public base if available
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || ''
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
  }

  // Fallback: return as-is
  return url
}

/**
 * Check if a URL needs to be uploaded to R2
 */
export function needsR2Upload(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:')
}

/**
 * Extract R2 key from a public URL
 * Client-safe version that doesn't import server-only modules
 */
export function extractR2KeyFromUrl(url: string): string {
  if (!url) return url

  const r2Patterns = [
    /^https?:\/\/pub-[a-z0-9]+\.r2\.dev\//,
    /^https?:\/\/[a-z0-9-]+\.r2\.cloudflarestorage\.com\//,
  ]

  for (const pattern of r2Patterns) {
    if (pattern.test(url)) {
      return url.replace(pattern, '')
    }
  }

  if (!url.startsWith('http')) {
    return url
  }

  return url
}
