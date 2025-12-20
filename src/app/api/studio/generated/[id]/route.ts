import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGeneratedImage, GeneratedImage } from '@/lib/db/generatedImages'
import { reconstructR2Url } from '@/lib/imageUpload'

export const runtime = 'nodejs'

/**
 * GET /api/studio/generated/[id]
 * 단일 이미지 상세 조회 (모달용)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const image = await getGeneratedImage(id, userId)

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 })
        }

        // 상세 정보: JSON 필드 파싱 및 R2 URL 재구성
        const outfitKeys = image.source_outfit_urls ? JSON.parse(image.source_outfit_urls) : null
        const data = {
            ...image,
            source_model_url: image.source_model_url ? reconstructR2Url(image.source_model_url) : null,
            source_outfit_urls: outfitKeys ? outfitKeys.map((key: string) => reconstructR2Url(key)) : null,
            generation_params: image.generation_params ? JSON.parse(image.generation_params) : null,
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[api/studio/generated/[id]] GET error:', error)
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }
}
