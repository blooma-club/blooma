import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type UploadResult = {
  publicUrl: string | null
  key: string
  signedUrl?: string | null
  contentType: string | null
  size?: number | null
}

const getEndpoint = (): string => {
  const configured = process.env.R2_ENDPOINT
  if (configured && configured.trim().length > 0) return configured
  const accountId = process.env.R2_ACCOUNT_ID
  if (!accountId) throw new Error('R2_ACCOUNT_ID or R2_ENDPOINT must be set')
  return `https://${accountId}.r2.cloudflarestorage.com`
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: getEndpoint(),
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
})

function extFromContentType(ct: string | null) {
  if (!ct) return 'png'
  if (ct.includes('jpeg')) return 'jpg'
  if (ct.includes('png')) return 'png'
  if (ct.includes('gif')) return 'gif'
  return 'png'
}

export async function uploadImageToR2(storyboardId: string, frameId: string, src: string): Promise<UploadResult> {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME must be set')

  let buffer: Uint8Array | null = null
  let contentType: string | null = null

  // 재시도 로직 추가
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
      } else {
        console.log(`[R2] Attempting to download image (attempt ${attempt}/${maxRetries}): ${src.substring(0, 100)}...`)

        const res = await fetch(src, {
          // 타임아웃 설정
          signal: AbortSignal.timeout(30000), // 30초 타임아웃
          headers: {
            'User-Agent': 'Blooma/1.0'
          }
        })

        if (!res.ok) {
          const errorMsg = `Failed to download image: ${res.status} ${res.statusText}`
          console.warn(`[R2] Download failed (attempt ${attempt}): ${errorMsg}`)

          // 409 에러인 경우 잠시 대기 후 재시도
          if (res.status === 409 && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 // 지수 백오프
            console.log(`[R2] Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }

          throw new Error(errorMsg)
        }

        contentType = res.headers.get('content-type')
        const ab = await res.arrayBuffer()
        buffer = new Uint8Array(ab)
        console.log(`[R2] Successfully downloaded image (${buffer.length} bytes)`)
      }

      if (!buffer) throw new Error('No image data')

      const ext = extFromContentType(contentType)
      const key = `storyboards/${storyboardId}/${frameId}_${Date.now()}.${ext}`

      console.log(`[R2] Uploading to R2: ${key}`)

      await r2Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: contentType || undefined
      }))

      // Public URL strategy:
      // Prefer R2_PUBLIC_BASE_URL env (e.g. https://cdn.example.com or https://pub-xxxxx.r2.dev)
      const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/^@/, '')
      const publicUrl = base ? `${base.replace(/\/$/, '')}/${key}` : null

      // Also create a presigned GET URL as a fallback when the public gateway requires auth
      let signedUrl: string | null = null
      try {
        const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key })
        signedUrl = await getSignedUrl(r2Client, getCmd, { expiresIn: 60 * 60 }) // 1 hour
      } catch (err) {
        // ignore presign errors
        signedUrl = null
      }

      console.log(`[R2] Successfully uploaded to R2: ${key}`)
      return { publicUrl, key, signedUrl, contentType, size: buffer?.length || null }

    } catch (error) {
      lastError = error as Error
      console.error(`[R2] Upload attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 지수 백오프
        console.log(`[R2] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // 모든 재시도 실패
  throw lastError || new Error('Upload failed after all retries')
}

export async function deleteImageFromR2(key: string): Promise<boolean> {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME must be set')

  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }))
    return true
  } catch (error) {
    console.error('Failed to delete image from R2:', error)
    return false
  }
}

export async function deleteImagesFromR2(keys: string[]): Promise<{ success: string[], failed: string[] }> {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME must be set')

  const results = await Promise.allSettled(
    keys.map(key => 
      r2Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      }))
    )
  )

  const success: string[] = []
  const failed: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      success.push(keys[index])
    } else {
      failed.push(keys[index])
    }
  })

  return { success, failed }
}


