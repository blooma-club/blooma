import { NextRequest, NextResponse } from 'next/server'
import {
    createGeneratedImage,
    listGeneratedImages,
    deleteGeneratedImage,
    toggleFavorite
} from '@/lib/db/generatedImages'
import { deleteImageFromR2 } from '@/lib/r2'
import { extractR2Key } from '@/lib/imageUpload'
import { getSupabaseUserAndSync } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/studio/generated
 * ?ъ슜?먯쓽 ?앹꽦 ?대?吏 紐⑸줉 議고쉶 (洹몃━?쒖슜 ?щ┝ ?묐떟)
 */
export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '24', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const favoritesOnly = searchParams.get('favorites') === 'true'

        const images = await listGeneratedImages(sessionUser.id, { limit, offset, favoritesOnly })

        // ?щ┝ ?묐떟: 洹몃━?쒖뿉 ?꾩슂???꾨뱶留?諛섑솚 (id, group_id, image_url, prompt, created_at)
        return NextResponse.json({
            success: true,
            data: images,
            hasMore: images.length === limit // ?ㅼ쓬 ?섏씠吏 議댁옱 ?щ?
        })
    } catch (error) {
        console.error('[api/studio/generated] GET error:', error)
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
    }
}


/**
 * POST /api/studio/generated
 * ???앹꽦 ?대?吏 ???
 */
export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
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
            user_id: sessionUser.id,
            group_id,
            image_url,
            image_key,
            prompt,
            model_id,
            // source_model_url: ?쒖뒪??紐⑤뜽 寃쎈줈 ?먮뒗 R2 URL
            source_model_url: source_model_url || null,
            // source_outfit_urls: 諛곗뿴濡????(blob URL? ?쒖쇅??
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
 * ?대?吏 ??젣
 */
export async function DELETE(request: NextRequest) {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const result = await deleteGeneratedImage(id, sessionUser.id)

        if (!result) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 })
        }

        // R2?먯꽌 ?대?吏 ??젣 (?덈뒗 寃쎌슦)
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
 * 利먭꺼李얘린 ?좉?
 */
export async function PATCH(request: NextRequest) {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, action } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        if (action === 'toggle_favorite') {
            const isFavorite = await toggleFavorite(id, sessionUser.id)

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

