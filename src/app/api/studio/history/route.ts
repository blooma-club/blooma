import { NextRequest, NextResponse } from 'next/server'
import {
    createGeneratedImage,
    listGeneratedImages,
    deleteGeneratedImage,
    toggleFavorite
} from '@/lib/db/generatedImages'
import { deleteImageFromR2 } from '@/lib/infra/storage'
import { extractR2Key } from '@/lib/infra/storage'
import { getSupabaseUserAndSync } from '@/lib/db/supabase-server'

export const runtime = 'nodejs'

/**
 * GET /api/studio/history
 * ????癒?벥 ??밴쉐 ???筌왖 筌뤴뫖以?鈺곌퀬??(域밸챶???뽰뒠 ?????臾먮뼗)
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

        // ?????臾먮뼗: 域밸챶???뽯퓠 ?袁⑹뒄???袁⑤굡筌?獄쏆꼹??(id, group_id, image_url, prompt, created_at)
        return NextResponse.json({
            success: true,
            data: images,
            hasMore: images.length === limit // ??쇱벉 ??륁뵠筌왖 鈺곕똻?????
        }, {
            headers: {
                'Cache-Control': 'private, max-age=30, stale-while-revalidate=300'
            }
        })
    } catch (error) {
        console.error('[api/studio/history] GET error:', error)
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
    }
}


/**
 * POST /api/studio/history
 * ????밴쉐 ???筌왖 ????
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
            // source_model_url: ??뽯뮞??筌뤴뫀??野껋럥以??癒?뮉 R2 URL
            source_model_url: source_model_url || null,
            // source_outfit_urls: 獄쏄퀣肉닸에?????(blob URL?? ??뽰뇚??
            source_outfit_urls: normalizeOutfitUrls(source_outfit_urls),
            generation_params,
            credit_cost,
        })

        return NextResponse.json({ success: true, data: image })
    } catch (error) {
        console.error('[api/studio/history] POST error:', error)
        return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
    }
}

/**
 * DELETE /api/studio/history
 * ???筌왖 ????
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

        // R2?癒?퐣 ???筌왖 ????(??덈뮉 野껋럩??
        if (result.imageKey) {
            await deleteImageFromR2(result.imageKey).catch(console.error)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/studio/history] DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }
}

/**
 * PATCH /api/studio/history
 * 筌앸Þ爰쇽㎕?섎┛ ?醫?
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
        console.error('[api/studio/history] PATCH error:', error)
        return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
    }
}



