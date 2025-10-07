import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/fal-ai'

export async function POST(request: NextRequest) {
  try {
    const falKeyConfigured = !!process.env.FAL_KEY?.trim()?.length
    if (!falKeyConfigured) {
      console.warn('[API] FAL_KEY is not configured. Image requests will use placeholder output.')
    }

    const { 
      prompt, 
      modelId = DEFAULT_MODEL,
      style,
      aspectRatio,
      quality = 'balanced',
      width,
      height,
      image_url,
      imageUrls
    } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // 모델 정보 확인
    const modelInfo = getModelInfo(modelId)
    if (!modelInfo) {
      return NextResponse.json(
        { error: `Unsupported model: ${modelId}` },
        { status: 400 }
      )
    }

    console.log(`[API] Generating image with model: ${modelId}`)
    console.log(`[API] Options:`, { style, aspectRatio, quality, width, height, image_url, imageUrls })

    // Prepare image URLs for the generation
    let inputImageUrls: string[] = []
    if (image_url) {
      inputImageUrls = [image_url]
    } else if (imageUrls && Array.isArray(imageUrls)) {
      inputImageUrls = imageUrls
    }

    // 통합된 이미지 생성 함수 사용
    const result = await generateImageWithModel(prompt, modelId, {
      style,
      aspectRatio,
      width,
      height,
      quality,
      imageUrls: inputImageUrls.length > 0 ? inputImageUrls : undefined
    })

    if (!result.success) {
      const status = typeof result.status === 'number' && result.status >= 400 ? result.status : 500
      return NextResponse.json(
        {
          error: result.error || 'Image generation failed',
          ...(result.warning ? { warning: result.warning } : {}),
        },
        { status }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      prompt,
      modelUsed: modelId,
      modelInfo: {
        name: modelInfo.name,
        description: modelInfo.description,
        quality: modelInfo.quality
      },
      ...(result.warning ? { warning: result.warning } : {}),
    })
    
  } catch (error) {
    console.error('Image generation error:', error)
    
    let errorMessage = 'Failed to generate image'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error)
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
