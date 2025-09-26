import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToR2 } from '../../../lib/r2'
import { generateImageWithModel } from '../../../lib/fal-ai'

// 헬퍼: 여러 이미지 업로드
async function uploadImagesToR2(imageUrls: string[], projectId: string, frameId: string) {
  const uploads = await Promise.all(imageUrls.map(url => uploadImageToR2(projectId, frameId, url)))
  return uploads.map(u => u.publicUrl || u.key).filter(Boolean)
}

// Multi-image edit via Gemini 2.5 Flash Image
export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      image_urls,
      projectId,
      storyboardId,
      frameId,
      numImages = 1,
      output_format = 'jpeg',
    } = await req.json()

    const resolvedProjectId = projectId || storyboardId

    // 유효성 검증
    if (
      !prompt?.trim() ||
      !Array.isArray(image_urls) ||
      image_urls.length === 0 ||
      !resolvedProjectId ||
      !frameId
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 참조 이미지 제한 (최대 6장)
    const refs = image_urls.slice(0, 6)

    // Gemini 모델 호출
    const result = await generateImageWithModel(prompt, 'fal-ai/gemini-25-flash-image/edit', {
      imageUrls: refs,
      numImages: Math.min(Math.max(numImages, 1), 4),
      outputFormat: output_format
    })

    if (!result.success || !result.imageUrls?.length) {
      return NextResponse.json({ error: result.error || 'No images generated' }, { status: 500 })
    }

    // 생성된 이미지들 R2에 업로드
    const uploadedUrls = await uploadImagesToR2(result.imageUrls, resolvedProjectId, frameId)

    if (!uploadedUrls.length) {
      return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      images: uploadedUrls,
      description: 'Images edited successfully'
    })

  } catch (err) {
    console.error('Image edit error:', err)
    return NextResponse.json({
      error: 'Image edit failed',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}
