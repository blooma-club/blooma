import type { ImageGenerationValidated } from '@/lib/validation'
import { resolveInputUrl } from '@/lib/infra/url-resolver'

export type GenerationReferenceImages = {
  modelImageUrl: string | undefined
  locationImageUrl: string | undefined
  outfitImageUrls: string[]
  inputImageUrls: string[]
  usesRoleSeparatedRefs: boolean
}

export function resolveGenerationReferenceImages(
  validated: ImageGenerationValidated,
  requestUrl: string
): GenerationReferenceImages {
  const modelImageUrl = resolveInputUrl(validated.modelImageUrl, requestUrl)
  const locationImageUrl = resolveInputUrl(validated.locationImageUrl, requestUrl)
  const outfitImageUrls =
    validated.outfitImageUrls
      ?.map(url => resolveInputUrl(url, requestUrl))
      .filter((url): url is string => Boolean(url)) ?? []

  const usesRoleSeparatedRefs =
    typeof validated.modelImageUrl === 'string' ||
    Array.isArray(validated.outfitImageUrls) ||
    typeof validated.locationImageUrl === 'string'

  let inputImageUrls: string[] = []
  if (usesRoleSeparatedRefs) {
    if (modelImageUrl) inputImageUrls.push(modelImageUrl)
    inputImageUrls.push(...outfitImageUrls)
    if (locationImageUrl) inputImageUrls.push(locationImageUrl)
  } else if (validated.image_url) {
    inputImageUrls = [validated.image_url]
  } else if (validated.imageUrls?.length) {
    inputImageUrls = validated.imageUrls
  }

  return {
    modelImageUrl,
    locationImageUrl,
    outfitImageUrls,
    inputImageUrls,
    usesRoleSeparatedRefs,
  }
}

