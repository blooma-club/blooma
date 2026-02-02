import { uploadImageToR2 } from '@/lib/infra/storage'

export async function uploadGeneratedImagesToR2(originalImageUrls: string[]): Promise<string[]> {
  return await Promise.all(
    originalImageUrls.map(async (url, index) => {
      try {
        const uploadResult = await uploadImageToR2(
          'studio',
          `generated-${crypto.randomUUID().slice(0, 8)}-${index}`,
          url
        )
        console.log(
          `[API] Image ${index + 1} uploaded to R2: ${uploadResult.publicUrl?.substring(0, 80)}...`
        )
        return uploadResult.publicUrl || url
      } catch (uploadError) {
        console.error(`[API] R2 upload failed for image ${index + 1}, using original URL:`, uploadError)
        return url
      }
    })
  )
}

