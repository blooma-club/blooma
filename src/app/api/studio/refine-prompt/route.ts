import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors'
import { ApiError } from '@/lib/errors'
import { imagePromptSchema } from '@/lib/validation'
import { generatePromptFromImages } from '@/lib/google-ai/client'
import { reconstructR2Url } from '@/lib/infra/storage'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/infra/ratelimit'
import { validateImageUrl } from '@/lib/infra/security'

const handleError = createErrorHandler('api/studio/refine-prompt')

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const rateLimitResult = await checkRateLimit(userId, 'imageGeneration')
    if (!rateLimitResult.success) {
      return NextResponse.json(createRateLimitError(rateLimitResult), {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      })
    }

    const body = await request.json()
    const validated = imagePromptSchema.parse(body)

    const resolveInputUrl = (url?: string): string | undefined => {
      if (!url) return undefined
      if (url.startsWith('blob:') || url.startsWith('data:')) return undefined
      let resolved: string
      if (url.startsWith('http://') || url.startsWith('https://')) {
        resolved = url
      } else if (url.startsWith('/')) {
        resolved = new URL(url, request.url).toString()
      } else {
        resolved = reconstructR2Url(url)
      }

      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        const validation = validateImageUrl(resolved)
        if (!validation.valid) {
          throw ApiError.badRequest(`Invalid image URL: ${validation.reason}`)
        }
      }

      return resolved
    }

    const modelImageUrl = resolveInputUrl(validated.modelImageUrl)
    const locationImageUrl = resolveInputUrl(validated.locationImageUrl)
    const outfitImageUrls =
      validated.outfitImageUrls
        ?.map((url) => resolveInputUrl(url))
        .filter((url): url is string => Boolean(url)) ?? []

    if (!validated.isModelAutoMode && !modelImageUrl) {
      throw ApiError.badRequest('modelImageUrl must be a public URL when not using auto mode.')
    }

    const prompt = await generatePromptFromImages({
      modelImageUrl,
      outfitImageUrls,
      locationImageUrl,
      userPrompt: validated.userPrompt,
      isModelAutoMode: validated.isModelAutoMode,
    })

    if (!prompt) {
      throw ApiError.externalApiError('Prompt generation failed', { status: 502 })
    }

    return createApiResponse({ prompt })
  } catch (error) {
    return handleError(error)
  }
}
