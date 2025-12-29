import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
    createGeneratedImage,
    listGeneratedImages,
    deleteGeneratedImage,
    toggleFavorite
} from '@/lib/db/generatedImages'
import { deleteImageFromR2 } from '@/lib/r2'
import { extractR2Key } from '@/lib/imageUpload'

export const runtime = 'nodejs'

/**
 * GET /api/studio/generated
 * 사용자의 생성 이미지 목록 조회 (그리드용 슬림 응답)
 */
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '24', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const favoritesOnly = searchParams.get('favorites') === 'true'

        const images = await listGeneratedImages(userId, { limit, offset, favoritesOnly })

        // 슬림 응답: 그리드에 필요한 필드만 반환 (id, group_id, image_url, prompt, created_at)
        return NextResponse.json({
            success: true,
            data: images,
            hasMore: images.length === limit // 다음 페이지 존재 여부
        })
    } catch (error) {
        console.error('[api/studio/generated] GET error:', error)
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
    }
}


/**
 * POST /api/studio/generated
 * 새 생성 이미지 저장
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            image_url,
            image_key,
            prompt,
            model_id,
            source_model_url,
            source_outfit_urls,
            generation_params,
            credit_cost,
            group_id
        } = body

        const normalizeOutfitUrls = (urls: unknown): string[] | null => {
            if (!Array.isArray(urls)) return null
            const cleaned = urls
                .map((url) => (typeof url === 'string' ? url.trim() : ''))
                .filter((url) => url.length > 0 && !url.startsWith('blob:') && !url.startsWith('data:'))
                .map((url) => extractR2Key(url))

            return cleaned.length > 0 ? cleaned : null
        }

        if (!image_url) {
            return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
        }

        const id = crypto.randomUUID()

        const image = await createGeneratedImage({
            id,
            user_id: userId,
            group_id,
            image_url,
            image_key,
            prompt,
            model_id,
            // source_model_url: 시스템 모델 경로 또는 R2 URL
            source_model_url: source_model_url || null,
            // source_outfit_urls: 배열로 저장 (blob URL은 제외됨)
            source_outfit_urls: normalizeOutfitUrls(source_outfit_urls),
            generation_params,
            credit_cost,
        })

        return NextResponse.json({ success: true, data: image })
    } catch (error) {
        console.error('[api/studio/generated] POST error:', error)
        return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
    }
}

/**
 * DELETE /api/studio/generated
 * 이미지 삭제
 */
export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const result = await deleteGeneratedImage(id, userId)

        if (!result) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 })
        }

        // R2에서 이미지 삭제 (있는 경우)
        if (result.imageKey) {
            await deleteImageFromR2(result.imageKey).catch(console.error)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/studio/generated] DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }
}

/**
 * PATCH /api/studio/generated
 * 즐겨찾기 토글
 */
export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, action } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        if (action === 'toggle_favorite') {
            const isFavorite = await toggleFavorite(id, userId)

            if (isFavorite === null) {
                return NextResponse.json({ error: 'Image not found' }, { status: 404 })
            }

            return NextResponse.json({ success: true, is_favorite: isFavorite })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error) {
        console.error('[api/studio/generated] PATCH error:', error)
        return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
    }
}
