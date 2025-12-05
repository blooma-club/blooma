import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
    createGeneratedImage,
    listGeneratedImages,
    deleteGeneratedImage,
    toggleFavorite
} from '@/lib/db/generatedImages'
import { deleteImageFromR2 } from '@/lib/r2'

export const runtime = 'nodejs'

/**
 * GET /api/fitting-room/generated
 * 사용자의 생성 이미지 목록 조회
 */
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '50', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const favoritesOnly = searchParams.get('favorites') === 'true'

        const images = await listGeneratedImages(userId, { limit, offset, favoritesOnly })

        // Parse JSON fields for response
        const data = images.map(img => ({
            ...img,
            source_outfit_urls: img.source_outfit_urls ? JSON.parse(img.source_outfit_urls) : null,
            generation_params: img.generation_params ? JSON.parse(img.generation_params) : null,
        }))

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[api/fitting-room/generated] GET error:', error)
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
    }
}

/**
 * POST /api/fitting-room/generated
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
            credit_cost
        } = body

        if (!image_url) {
            return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
        }

        const id = crypto.randomUUID()

        const image = await createGeneratedImage({
            id,
            user_id: userId,
            image_url,
            image_key,
            prompt,
            model_id,
            source_model_url,
            source_outfit_urls,
            generation_params,
            credit_cost,
        })

        return NextResponse.json({ success: true, data: image })
    } catch (error) {
        console.error('[api/fitting-room/generated] POST error:', error)
        return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
    }
}

/**
 * DELETE /api/fitting-room/generated
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
        console.error('[api/fitting-room/generated] DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }
}

/**
 * PATCH /api/fitting-room/generated
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
        console.error('[api/fitting-room/generated] PATCH error:', error)
        return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
    }
}
