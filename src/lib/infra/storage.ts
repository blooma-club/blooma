import 'server-only'

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { validateImageUrl } from '@/lib/infra/security'

// ============================================================================
// Types
// ============================================================================

export type UploadResult = {
  publicUrl: string | null
  key: string
  signedUrl?: string | null
  contentType: string | null
  size?: number | null
  type?: string
  error?: string
  success?: boolean
}

export type AudioUploadParams = {
  projectId: string
  frameId: string
  buffer: Uint8Array
  contentType?: string | null
  kind?: 'voice' | 'music' | 'fx'
}

export interface UploadOptions {
  /** Asset type (model, location) */
  type?: 'model' | 'location'
  /** Project ID */
  projectId?: string
  /** Frame ID */
  frameId?: string
  /** Asset ID */
  assetId?: string
  /** Is update */
  isUpdate?: boolean
}

// ============================================================================
// R2 Client & Configuration (Lazy Initialization)
// ============================================================================

let r2ClientInstance: S3Client | null = null

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const getEndpoint = (): string => {
  const configured = process.env.R2_ENDPOINT
  if (configured && configured.trim().length > 0) return configured
  const accountId = process.env.R2_ACCOUNT_ID
  if (!accountId) throw new Error('R2_ACCOUNT_ID or R2_ENDPOINT must be set')
  return `https://${accountId}.r2.cloudflarestorage.com`
}

export function getR2Client(): S3Client {
  if (!r2ClientInstance) {
    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: getEndpoint(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    })
  }
  return r2ClientInstance
}

// Deprecated: Use getR2Client() instead
export const r2Client = getR2Client()

// ============================================================================
// Helper Functions
// ============================================================================

function extFromContentType(ct: string | null) {
  if (!ct) return 'png'
  if (ct.includes('jpeg')) return 'jpg'
  if (ct.includes('png')) return 'png'
  if (ct.includes('gif')) return 'gif'
  return 'png'
}

/**
 * Check if URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:')
}

/**
 * Check if URL is a relative path
 */
export function isRelativeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Check if URL is an external URL (http/https)
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://')
}

/**
 * Extract key from R2 public URL
 */
export function extractR2Key(url: string): string {
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

/**
 * Reconstruct full R2 URL from key
 */
export function reconstructR2Url(key: string): string {
  if (!key) return key
  if (key.startsWith('http')) return key

  const baseUrl = process.env.R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  if (!baseUrl) {
    console.warn('[R2] No R2_PUBLIC_BASE_URL configured, returning key as-is')
    return key
  }

  return `${baseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

// ============================================================================
// Server-Side Upload Logic
// ============================================================================

export async function uploadImageToR2(
  projectId: string,
  frameId: string,
  src: string
): Promise<UploadResult> {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME must be set')

  let buffer: Uint8Array | null = null
  let contentType: string | null = null

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (src.startsWith('data:')) {
        const m = src.match(/^data:(.*?);base64,(.*)$/)
        if (!m) throw new Error('Invalid data URL')
        contentType = m[1]
        const b = Buffer.from(m[2], 'base64')
        buffer = new Uint8Array(b)
        if (buffer.length > MAX_IMAGE_BYTES) {
          throw new Error('Image exceeds upload size limit')
        }
      } else {
        if (src.startsWith('http://') || src.startsWith('https://')) {
          const validation = validateImageUrl(src)
          if (!validation.valid) {
            throw new Error(`Invalid image URL: ${validation.reason}`)
          }
        }

        console.log(
          `[R2] Attempting to download image (attempt ${attempt}/${maxRetries}): ${src.substring(0, 100)}...`
        )

        const res = await fetch(src, {
          signal: AbortSignal.timeout(30000),
          headers: { 'User-Agent': 'Blooma/1.0' },
        })

        if (!res.ok) {
          const errorMsg = `Failed to download image: ${res.status} ${res.statusText}`
          console.warn(`[R2] Download failed (attempt ${attempt}): ${errorMsg}`)

          if (res.status === 409 && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          throw new Error(errorMsg)
        }

        const contentLength = res.headers.get('content-length')
        if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
          throw new Error('Image exceeds download size limit')
        }

        contentType = res.headers.get('content-type')
        const ab = await res.arrayBuffer()
        if (ab.byteLength > MAX_IMAGE_BYTES) {
          throw new Error('Image exceeds download size limit')
        }
        buffer = new Uint8Array(ab)
      }

      if (!buffer) throw new Error('No image data')

      const ext = extFromContentType(contentType)
      const sanitizedProject = projectId.replace(/[^a-zA-Z0-9-_]/g, '_') || 'project'
      const sanitizedFrame = frameId.replace(/[^a-zA-Z0-9-_]/g, '_') || 'frame'
      const key = `projects/${sanitizedProject}/images/${sanitizedFrame}_${Date.now()}.${ext}`

      console.log(`[R2] Uploading to R2: ${key}`)

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(buffer),
          ContentType: contentType || undefined,
        })
      )

      const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/^@/, '')
      const publicUrl = base ? `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}` : null

      let signedUrl: string | null = null
      try {
        const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key })
        signedUrl = await getSignedUrl(getR2Client(), getCmd, { expiresIn: 60 * 60 })
      } catch {
        signedUrl = null
      }

      console.log(`[R2] Successfully uploaded to R2: ${key}`)
      return { publicUrl, key, signedUrl, contentType, size: buffer?.length || null }
    } catch (error) {
      lastError = error as Error
      console.error(`[R2] Upload attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Upload failed after all retries')
}

export async function uploadModelImageToR2(
  modelId: string,
  src: string,
  projectId?: string
): Promise<UploadResult> {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME must be set')

  let buffer: Uint8Array | null = null
  let contentType: string | null = null

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (src.startsWith('data:')) {
        const m = src.match(/^data:(.*?);base64,(.*)$/)
        if (!m) throw new Error('Invalid data URL')
        contentType = m[1]
        const b = Buffer.from(m[2], 'base64')
        buffer = new Uint8Array(b)
        if (buffer.length > MAX_IMAGE_BYTES) {
          throw new Error('Image exceeds upload size limit')
        }
      } else {
        if (src.startsWith('http://') || src.startsWith('https://')) {
          const validation = validateImageUrl(src)
          if (!validation.valid) {
            throw new Error(`Invalid image URL: ${validation.reason}`)
          }
        }

        const res = await fetch(src, {
          signal: AbortSignal.timeout(30000),
          headers: { 'User-Agent': 'Blooma/1.0' },
        })

        if (!res.ok) {
          if (res.status === 409 && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          throw new Error(`Failed to download model image: ${res.status}`)
        }

        const contentLength = res.headers.get('content-length')
        if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
          throw new Error('Image exceeds download size limit')
        }

        contentType = res.headers.get('content-type')
        const ab = await res.arrayBuffer()
        if (ab.byteLength > MAX_IMAGE_BYTES) {
          throw new Error('Image exceeds download size limit')
        }
        buffer = new Uint8Array(ab)
      }

      if (!buffer) throw new Error('No model image data')

      const ext = extFromContentType(contentType)
      const basePath = projectId ? `models/${projectId}` : 'models'
      const key = `${basePath}/${modelId}_${Date.now()}.${ext}`

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(buffer),
          ContentType: contentType || undefined,
        })
      )

      const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/^@/, '')
      const publicUrl = base ? `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}` : null

      let signedUrl: string | null = null
      try {
        const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key })
        signedUrl = await getSignedUrl(getR2Client(), getCmd, { expiresIn: 60 * 60 })
      } catch {
        signedUrl = null
      }

      return { publicUrl, key, signedUrl, contentType, size: buffer?.length || null }
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
    }
  }
  throw lastError || new Error('Model upload failed')
}

export async function deleteImageFromR2(key: string): Promise<boolean> {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME must be set')
  try {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    console.error('Failed to delete image from R2:', error)
    return false
  }
}

export async function deleteImagesFromR2(
  keys: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = []
  const failed: string[] = []

  for (const key of keys) {
    if (await deleteImageFromR2(key)) success.push(key)
    else failed.push(key)
  }
  return { success, failed }
}

// ============================================================================
// Client-Side Upload Utilities
// ============================================================================

export async function uploadFileToR2(file: File, options: UploadOptions = {}): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  if (options.type) formData.append('type', options.type)
  if (options.projectId) formData.append('projectId', options.projectId)
  if (options.frameId) formData.append('frameId', options.frameId)
  if (options.assetId) formData.append('assetId', options.assetId)
  if (options.isUpdate) formData.append('isUpdate', 'true')

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to upload image')
  }

  const publicUrl = result.publicUrl || result.signedUrl || result.data?.image_url
  if (!publicUrl) {
    throw new Error('No image URL returned from server')
  }

  return publicUrl
}

export async function uploadUrlToR2(
  srcUrl: string,
  fileName: string,
  contentType?: string
): Promise<UploadResult> {
  const response = await fetch('/api/proxy-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ srcUrl, fileName, contentType }),
  })

  if (!response.ok) {
    throw new Error(`Failed to upload URL: ${response.status}`)
  }

  return await response.json()
}
