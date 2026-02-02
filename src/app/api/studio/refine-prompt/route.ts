import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors'
import { ApiError } from '@/lib/errors'
import { imagePromptSchema } from '@/lib/validation'
import { generatePromptFromImages } from '@/lib/google-ai/client'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/infra/ratelimit'
import { resolveInputUrl } from '@/lib/infra/url-resolver'

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

    const modelImageUrl = resolveInputUrl(validated.modelImageUrl, request.url)
    const locationImageUrl = resolveInputUrl(validated.locationImageUrl, request.url)
    const outfitImageUrls =
      validated.outfitImageUrls
        ?.map((url) => resolveInputUrl(url, request.url))
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
