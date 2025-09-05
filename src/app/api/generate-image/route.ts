import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithModel, getModelInfo, DEFAULT_MODEL } from '@/lib/fal-ai'

export async function POST(request: NextRequest) {
  try {
    // FAL_KEY 확인
    if (!process.env.FAL_KEY) {
      console.error('FAL_KEY is not configured')
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })
    }

    const { 
      prompt, 
      modelId = DEFAULT_MODEL,
      style,
      aspectRatio,
      quality = 'balanced',
      width,
      height
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
    console.log(`[API] Options:`, { style, aspectRatio, quality, width, height })

    // 통합된 이미지 생성 함수 사용
    const result = await generateImageWithModel(prompt, modelId, {
      style,
      aspectRatio,
      width,
      height,
      quality
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Image generation failed' },
        { status: 500 }
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
      }
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
