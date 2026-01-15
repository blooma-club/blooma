import { NextRequest, NextResponse } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { imagePromptSchema } from '@/lib/validation/schemas'
import { generatePromptFromImages } from '@/lib/google-ai'
import { checkRateLimit, createRateLimitError, createRateLimitHeaders } from '@/lib/ratelimit'

const handleError = createErrorHandler('api/generate-image-prompt')

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const rateLimitResult = await checkRateLimit(userId, 'imageGeneration')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      )
    }

    const body = await request.json()
    const validated = imagePromptSchema.parse(body)

    const prompt = await generatePromptFromImages({
      modelImageUrl: validated.modelImageUrl,
      outfitImageUrls: validated.outfitImageUrls ?? [],
      locationImageUrl: validated.locationImageUrl,
      userPrompt: validated.userPrompt,
    })

    if (!prompt) {
      throw ApiError.externalApiError('Prompt generation failed', { status: 502 })
    }

    return createApiResponse({ prompt })
  } catch (error) {
    return handleError(error)
  }
}
